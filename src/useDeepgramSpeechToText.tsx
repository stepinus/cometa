import { useState, useCallback, useRef } from 'react';
import { createClient } from '@deepgram/sdk';

export function useDeepgramSpeechToText() {
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const connectionRef = useRef<any>(null);
  const isFinals = useRef<string[]>([]);

  const startListening = useCallback(async () => {
    try {
      const deepgram = createClient(import.meta.env.VITE_APP_DEEPGRAM_API_KEY);
      const connection = deepgram.listen.live({
        model: "nova-2",
        language: "ru",
        smart_format: true,
        interim_results: true,
        utterance_end_ms: 1000,
        vad_events: true,
        endpointing: 300,
      });

      connectionRef.current = connection;

      connection.on("open", () => {
        setIsListening(true);
        
        connection.on("Results", (data) => {
          const sentence = data.channel.alternatives[0].transcript;

          if (sentence.length === 0) return;

          if (data.is_final) {
            isFinals.current.push(sentence);

            if (data.speech_final) {
              const utterance = isFinals.current.join(" ");
              setTranscript(prev => prev + " " + utterance);
              isFinals.current = [];
            }
          }
        });

        connection.on("UtteranceEnd", () => {
          const utterance = isFinals.current.join(" ");
          if (utterance) {
            setTranscript(prev => prev + " " + utterance);
            isFinals.current = [];
          }
        });

        connection.on("error", (err) => {
          console.error("Deepgram connection error:", err);
          setIsListening(false);
        });
      });

      // Получение медиа-потока
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          connection.send(event.data);
        }
      };

      mediaRecorder.start(250);

      return connection;

    } catch (error) {
      console.error('Error starting speech recognition:', error);
      setIsListening(false);
      throw error;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (connectionRef.current) {
      connectionRef.current.finish();
      connectionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    isFinals.current = [];
  }, []);

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    clearTranscript
  };
}
