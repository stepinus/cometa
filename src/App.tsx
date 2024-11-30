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

enum AppState {
  SLEEPING = 'SLEEPING',
  LISTENING = 'LISTENING',
  PENDING = 'PENDING',
  SPEAKING = 'SPEAKING'
}

interface VADState {
  loading: boolean;
  listening: boolean;
  errored: boolean;
  userSpeaking: boolean;
  start: () => void;
  pause: () => void;
}

const MAX_SPEECH = 10000; // 10 seconds
const SLEEP_TIMEOUT = 10000; // 10 seconds
const LISTENING_TIMEOUT = 8000; // 8 seconds

export default function ChatPage() {
  const setStatus = useStore((state) => state.setStatus);
  const setIntensity = useStore((state) => state.setIntensity);
  const status = useStore((state) => state.status);
  const [text, setText] = useState<string>("");
  const [appState, setAppState] = useState<AppState>(AppState.SLEEPING);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const maxSpeechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const clearTimeouts = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (maxSpeechTimeoutRef.current) {
      clearTimeout(maxSpeechTimeoutRef.current);
      maxSpeechTimeoutRef.current = null;
    }
  };

  const handleStateTransition = (newState: AppState) => {
    clearTimeouts();
    setAppState(newState);
    
    switch (newState) {
      case AppState.SLEEPING:
        setStatus(false);
        pause();
        break;
      case AppState.LISTENING:
        setStatus(true);
        start();
        if(timeoutRef.current){
          clearTimeout(timeoutRef.current);
        }      
        // Start timeout to go back to sleep if no speech detected
        timeoutRef.current = setTimeout(() => {
          if (appState === AppState.LISTENING) {
            handleStateTransition(AppState.SLEEPING);
          }
        }, SLEEP_TIMEOUT);
        break;
      case AppState.PENDING:
        setStatus(false);
        pause();
        break;
      case AppState.SPEAKING:
        setStatus(true);
        break;
    }
  };

  const {recognizeSpeech, synthesizeSpeech} = useSaluteSTT();
  const {processUserInput} = useProphecyGenerator();

  const {listening, userSpeaking, pause, start} = useMicVAD({
    startOnLoad: true,
    onFrameProcessed(probabilities, audioData) {
      if (appState === AppState.SLEEPING || appState === AppState.PENDING || appState === AppState.SPEAKING) return;
      
      const intensity = Math.sqrt(
        audioData.reduce((sum, value) => sum + value * value, 0) / audioData.length
      );
      setIntensity(intensity * 3);
    },
    onSpeechStart: () => {
      if (appState !== AppState.LISTENING) return;
      
      // Сбрасываем таймер засыпания
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          setAppState(AppState.SLEEPING);
        }, SLEEP_TIMEOUT);
      }
      
      // Устанавливаем таймер максимальной длительности речи
      maxSpeechTimeoutRef.current = setTimeout(() => {
        if (appState === AppState.LISTENING) {
          pause(); // Pause VAD
          setTimeout(() => {
            if (appState === AppState.LISTENING) {
              start(); // Resume VAD
            }
          }, 100); // Small delay before resuming
        }
      }, MAX_SPEECH);
    },
    onSpeechEnd: async (frame) => {
      if (appState !== AppState.LISTENING) return;
      // Очищаем таймер максимальной длительности речи
      if (maxSpeechTimeoutRef.current) {
        clearTimeout(maxSpeechTimeoutRef.current);
        maxSpeechTimeoutRef.current = null;
      }
      
      handleStateTransition(AppState.PENDING);
      try {
        const recognizedText = await recognizeSpeech(frame);
        await handleSubmit(recognizedText.result.join('.'));
      } catch (e) {
        console.error('Speech recognition error:', e);
        handleStateTransition(AppState.LISTENING);
      }
    },
    onVADMisfire: () => {
      if (appState !== AppState.LISTENING) return;
    },
    positiveSpeechThreshold: 0.7,
    minSpeechFrames: 7,
    redemptionFrames: 7,
  }) as VADState;

  const handleWakeWord = () => {
    console.log('Wake word detected!');
    handleStateTransition(AppState.LISTENING);
  };

  async function handleSubmit(inputText: string) {
    try {
      const response = await processUserInput(inputText);
      if (response && response.text) {
        handleStateTransition(AppState.SPEAKING);
        setIsPlaying(true);
        await synthesizeSpeech(response.text);
        setIsPlaying(false);
        
        if (response.isLastProphecy) {
          handleStateTransition(AppState.SLEEPING);
        } else {
          handleStateTransition(AppState.LISTENING);
        }
      }
    } catch (error) {
      console.error('Error processing input:', error);
      setIsPlaying(false);
      handleStateTransition(AppState.SLEEPING);
    }
  }

  // Porcupine wake word detection setup
  const {
    keywordDetection,
    isLoaded,
    isListening: isPorcupineListening,
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
      startPorcupine();
    });
    
    return () => {
      stopPorcupine();
      release();
      clearTimeouts();
    };
  }, []);

  useEffect(() => {
    if (keywordDetection !== null) {
      console.log('Wake word detected!', keywordDetection);
      handleWakeWord();
    }
  }, [keywordDetection]);

  return (
    <div className="w-screen h-screen">
      <Leva hidden/>
      <Scene />
      <StatusMessage 
        isPending={appState === AppState.PENDING} 
        isPlaying={isPlaying} 
        isAwake={appState !== AppState.SLEEPING} 
      />
    </div>
  )
}
