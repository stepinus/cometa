"use client";
import Scene from '../sphere/src/App'
import { usePorcupine } from "@picovoice/porcupine-react";
import { PICOVOICE_CONFIG } from './picovoiceConfig';

import { useState, useEffect, useRef } from "react";
import { useMicVAD, type ReactRealTimeVADOptions } from "@ricky0123/vad-react";
import { useStore } from './store';
import { Leva } from 'leva';
import { StatusMessage } from './StatusMessage';
import { useProphecyGenerator } from './useProphecy';
import  useSaluteSTT  from './useSaluteSTT';

interface VADState {
  loading: boolean;
  listening: boolean;
  errored: boolean;
  userSpeaking: boolean;
  start: () => void;
  pause: () => void;
}


const MAX_SPEECH = 12000;

export default function ChatPage() {
  const setStatus = useStore((state) => state.setStatus);
  const setIntensity = useStore((state) => state.setIntensity);
  const status = useStore((state) => state.status);
  const [text,setText]  = useState<string>("");
  const [isPending, setIsPending] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const sleepTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const {processUserInput, stage} = useProphecyGenerator();
  const {recognizeSpeech, synthesizeSpeech} = useSaluteSTT();
  const {listening, userSpeaking, pause, start} = useMicVAD({
    startOnLoad: true,
    onFrameProcessed(probabilities, audioData) {
      if (!isAwake || isPlaying) return;
            // Расчет интенсивности через среднеквадратичное значение (RMS)
            const intensity = Math.sqrt(
              audioData.reduce((sum, value) => sum + value * value, 0) / audioData.length
            );
            // Обновление интенсивности в глобальном store
            setIntensity(intensity*3);
    },
    onSpeechStart: () => {
      if (!isAwake || isPending || isPlaying) return;   
      // Очищаем таймер засыпания при начале речи
      if (sleepTimeoutRef.current) {
        clearTimeout(sleepTimeoutRef.current);
      }
    },
    onSpeechEnd: async (frame) => {
      if (!isAwake || isPending || isPlaying) return;
    if (recordingTimerRef.current) {
      clearTimeout(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsPending(true);
    setStatus(false);
    recognizeSpeech(frame)
    .then((result) => handleSubmit(result.result.join('.')))
    .catch((e) => {
      setIsPending(false);
      setStatus(true);
      startSleepTimer();
    }).finally(() => {
     start();
    });
    },
    onVADMisfire: () => {
      if (!isAwake || isPlaying) return;
      
    },
    positiveSpeechThreshold: 0.7,
    minSpeechFrames: 7,
    redemptionFrames: 7,

  }) as VADState;

  const [isAwake, setIsAwake] = useState<boolean>(false);

  const handleWakeWord = () => {
    console.log('Wake word detected!');
    setIsAwake(true);
    // Очищаем предыдущие таймеры
    if (sleepTimeoutRef.current) clearTimeout(sleepTimeoutRef.current);
    startSleepTimer(); // Запускаем таймер сна сразу после активации
  };

  const handleSleep = () => {
    setIsAwake(false);
    if (sleepTimeoutRef.current) clearTimeout(sleepTimeoutRef.current);
  };

  const {
    keywordDetection,
    isLoaded,
    isListening,
    error,
    init,
    start: startPorcupine,
    stop: stopPorcupine,
    release
  } = usePorcupine();

  const porcupineKeyword = { 
    base64: PICOVOICE_CONFIG.keywordBase64,
    label: "privet"
  };
  const porcupineModel = { 
    base64: PICOVOICE_CONFIG.contextBase64 
  };

  useEffect(() => {
    init(
      PICOVOICE_CONFIG.accessKey,
      porcupineKeyword,
      porcupineModel
    ).then(() => {
      startPorcupine(); // Сразу начинаем слушать wake word
    });
    
    return () => {
      stopPorcupine();
      release();
    };
  }, []);

  useEffect(() => {
    if (keywordDetection !== null) {
      console.log('Wake word detected!', keywordDetection);
      handleWakeWord();
    }
  }, [keywordDetection]);

  const startSleepTimer = () => {
    if (sleepTimeoutRef.current) {
      clearTimeout(sleepTimeoutRef.current);
    }
    sleepTimeoutRef.current = setTimeout(() => {
      if (!isPending && !isPlaying) {
        handleSleep();
      }
    }, 10000); // 10 секунд на засыпание
  };

  async function handleSubmit(inputText:any) {
    try {
      const response = await processUserInput(inputText);
      if (response && response.text) {
        setIsPending(false);
        setIsPlaying(true);
        setStatus(true);
        await synthesizeSpeech(response.text);
        setIsPlaying(false);
        
        if (response.isLastProphecy) {
          handleSleep();
        } else {
          startSleepTimer(); // Запускаем таймер засыпания после воспроизведения
        }
      }
          } catch (error) {
      console.error('Error processing input:', error);
      setIsPending(false);
      setIsPlaying(false);
      setStatus(false);
      startSleepTimer();
    }
  }


  return (
    <div className="w-screen h-screen">
      <Leva hidden/>
      <Scene />
      <StatusMessage 
        isPending={isPending} 
        isPlaying={isPlaying} 
        isAwake={isAwake} 
      />
      <div className="mt-4 flex items-center">
        <input 
          type="text" 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
          placeholder="Введите текст" 
          className="border p-2 mr-2"
        />
        <button 
          onClick={() => handleSubmit({text})} 
          className="bg-blue-500 text-white p-2 rounded"
        >
          Отправить
        </button>
      </div>
    </div>
  )
}
