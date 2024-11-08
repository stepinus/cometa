"use client";
import { EdgeTTSClient, ProsodyOptions, OUTPUT_FORMAT } from 'edge-tts-client';

import { useState, useEffect, use } from "react";
import { useMicVAD, type ReactRealTimeVADOptions } from "@ricky0123/vad-react";
import clsx from "clsx";
import validate from "./verifySubmit";
import { createKaMetaAgent } from "./langchain";;
import { useAudioChunkProcessor } from './useAudioChunkProcessor';
import useEdgeTTS from './useEdgeSpeech';
import { set } from 'lodash';

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
        // stopRecognition();
    },
    ortConfig(ort) {
      // ort.env.wasm.wasmPaths = "/";
    },
    // workletURL: "/vad.worklet.bundle.min.js", 
    // modelURL: "/silero_vad.onnx",
    positiveSpeechThreshold: 0.9,
    minSpeechFrames: 7,
  }) as VADState;

  async function handleSubmit(text) {
    try {
      const {text:response} = await kaMetaAgent.processUserInput(text.text);
      // await synthesizeAndPlay(response);
      console.log('next')
    } catch (e) {
      console.error(e);
    }
    setIsPending(false);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <br />
      <div className="fixed bottom-0 flex flex-col items-center gap-4">
        <button
          className={clsx("px-4 py-2 rounded-full transition-colors", {
            "bg-red-500 hover:bg-red-600 text-white": vad.listening,
            "bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700":
              !vad.listening,
          })}
        ></button>

        <div className="text-neutral-400 dark:text-neutral-600 text-center"></div>
        {(transcript || interimTranscript) && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-md">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {transcript}{" "}
            </p>
          </div>
        )}
        {response && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg max-w-md">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {response}{" "}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}