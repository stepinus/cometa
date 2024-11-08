"use client";
import { EdgeTTSClient, ProsodyOptions, OUTPUT_FORMAT } from 'edge-tts-client';
import Scene from '../sphere/src/App'

import { useState,} from "react";
import { useMicVAD, type ReactRealTimeVADOptions } from "@ricky0123/vad-react";
import validate from "./verifySubmit";
import { createKaMetaAgent } from "./langchain";
import { useAudioChunkProcessor } from './useAudioChunkProcessor';
import useEdgeTTS from './useEdgeSpeech';

const options = new ProsodyOptions();
options.pitch = 'high';
options.rate = 'fast';
options.volume = 90;

interface VADState {
  loading: boolean;
  listening: boolean;
  errored: boolean;
  userSpeaking: boolean;
  start: () => void;
  pause: () => void;
}

const kaMetaAgent = createKaMetaAgent()

export default function ChatPage() {
  const { synthesizeAndPlay, stop, isPlaying } = useEdgeTTS();
  const [text,setText]  = useState<string>("");
  const [isPending, setIsPending] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [interimTranscript, setInterimTranscript] = useState<string>("");
  const [status, setStatus] = useState<string>("idle");
  const [response, setResponse] = useState<string>("");
  const [chainOn, setChainOn] = useState<boolean>(false);
  const {processAudioData} = useAudioChunkProcessor({})
  const vad = useMicVAD({
    startOnLoad: true,
    onFrameProcessed(probabilities, frame) {
        // return frame;
    },
    onSpeechStart: () => {
        if(isPending) return;
        console.log("onSpeechStart"); 
    },
    onVADMisfire: () => {
        console.log("onVADMisfire");
    },
    onSpeechEnd: async (frame) => {
        if(isPending) return;
        setIsPending(true);
       const text =  await processAudioData(frame)
       handleSubmit(text);

    },
    ortConfig(ort) {
      ort.env.wasm.wasmPaths = "/";
    },
    workletURL: "/vad.worklet.bundle.min.js", 
    modelURL: "/silero_vad.onnx",
    positiveSpeechThreshold: 0.9,
    minSpeechFrames: 7,
  }) as VADState;

  async function handleSubmit(text) {
    try {
      const {text:response} = await kaMetaAgent.processUserInput(text.text);
      await synthesizeAndPlay(response);
      console.log('next')
    } catch (e) {
      console.error(e);
    }
    setIsPending(false);
  }

  return (
    <div className="min-h-screen mflex flex-col items-center justify-center " style={{height:'100%'}}>
     <Scene />
    </div>
  )
}