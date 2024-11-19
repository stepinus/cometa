"use client";
import { EdgeTTSClient, ProsodyOptions, OUTPUT_FORMAT } from 'edge-tts-client';
import Scene from '../sphere/src/App'

import { useState, useEffect } from "react";
import { useMicVAD, type ReactRealTimeVADOptions } from "@ricky0123/vad-react";
import { useAudioChunkProcessor } from './useAudioChunkProcessor';
import useEdgeTTS from './useEdgeSpeech';
import {useStore} from './store'
import { useProphecyGenerator } from './useProphecy';
import { Leva } from 'leva';
import { StatusMessage } from './StatusMessage';
import useSaluteSTT from './useSaluteSTT';

const options = new ProsodyOptions();
options.pitch = 'high';
options.rate = 'medum';
options.volume = 90;

interface VADState {
  loading: boolean;
  listening: boolean;
  errored: boolean;
  userSpeaking: boolean;
  start: () => void;
  pause: () => void;
}

export default function ChatPage() {
  const setStatus = useStore((state) => state.setStatus);
  const setIntensity = useStore((state) => state.setIntensity);
  const status = useStore((state) => state.status);
  const { synthesizeAndPlay, stop, isPlaying } = useEdgeTTS();
  const [text,setText]  = useState<string>("");
  const [isPending, setIsPending] = useState<boolean>(false);
  const {processAudioData} = useAudioChunkProcessor({})
  const {processUserInput} = useProphecyGenerator();
 const  {recognizeSpeech, synthesizeSpeech} = useSaluteSTT();
  const {listening, userSpeaking, pause, start} = useMicVAD({
    startOnLoad: true,
    onFrameProcessed(probabilities, audioData) {
      // Расчет интенсивности через среднеквадратичное значение (RMS)
      const intensity = Math.sqrt(
        audioData.reduce((sum, value) => sum + value * value, 0) / audioData.length
      );
      // Обновление интенсивности в глобальном store
      setIntensity(intensity*3);
    },
    onSpeechStart: () => {
        // if(isPending) return;

        // console.log("onSpeechStart"); 
    },
    onVADMisfire: () => {
        // console.log("onVADMisfire");
    },
    onSpeechEnd: async (frame) => {
        if(isPending) return;
        setIsPending(true);
        setStatus(false);
   const result = await recognizeSpeech(frame);
    const text = result.result.join('.')  
    handleSubmit(text);

    },

    positiveSpeechThreshold: 0.7,
    minSpeechFrames: 7,
  }) as VADState;

  async function handleSubmit(inputText:any) {
    try {
      if(inputText.length < 4) {
      setStatus(true);
      setIsPending(false);
      return
    };
      const response = await processUserInput(inputText)
        setStatus(true);
        if(response && response.length > 0){
          console.log('response', response)
          await synthesizeSpeech(response);
        }
        console.log('miss!')
      setStatus(true);
      setIsPending(false);
    } catch (e) {
      setIsPending(false); // Очищаем по
      setStatus(true);
    }
  }


  return (
    <div className="min-h-screen mflex flex-col items-center justify-center " style={{height:'100%'}}>
      <StatusMessage isPending={isPending} isPlaying={isPlaying} />
      <Leva hidden/>
      <Scene /> 
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
