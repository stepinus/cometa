"use client";
import { EdgeTTSClient, ProsodyOptions, OUTPUT_FORMAT } from 'edge-tts-client';
import Scene from '../sphere/src/App'

import { useState, useEffect} from "react";
import { useMicVAD, type ReactRealTimeVADOptions } from "@ricky0123/vad-react";
import { useAudioChunkProcessor } from './useAudioChunkProcessor';
import useEdgeTTS from './useEdgeSpeech';
import {useStore} from './store'
import { useProphecyGenerator } from './useProphecy';

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
  const status = useStore((state) => state.status);

  const { synthesizeAndPlay, stop, isPlaying } = useEdgeTTS();
  const [text,setText]  = useState<string>("");
  const [isPending, setIsPending] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [response, setResponse] = useState<string>("");
  const [chainOn, setChainOn] = useState<boolean>(false);
  const {processAudioData} = useAudioChunkProcessor({})
  const {processUserInput} = useProphecyGenerator();
  // const { playText, isPlaying:isDeepPlaying } = useDeepgramTTS();

  const {listening, userSpeaking, pause, start} = useMicVAD({
    startOnLoad: true,
    onFrameProcessed(probabilities, audioData) {
      // console.log(1)
      // updateVADData({ rawData: audioData, energy: probabilities[0] });
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
      //  const text =  await processAudioData(frame)
      //  handleSubmit(text);

    },

    positiveSpeechThreshold: 0.7,
    minSpeechFrames: 10,
  }) as VADState;

  async function handleSubmit(inputText:any) {
    console.log(inputText)
    try {
      console.log('submit')
      const response = await processUserInput(inputText.text)
      await synthesizeAndPlay(response);
      setIsPending(false); // Очищаем по
            setStatus(true);
    } catch (e) {
      console.error(e);
      setIsPending(false); // Очищаем по
      setStatus(true);
    }
  }

  useEffect(()=>{
  if(isPlaying){setIsPending(true)} else{
    setIsPending(false)
  }
  },[isPlaying])

  return (
    <div className="min-h-screen mflex flex-col items-center justify-center " style={{height:'100%'}}>
     {/* <Scene />  */}
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
