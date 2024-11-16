import { useEffect, useState, useCallback, useRef } from 'react';
import { EdgeTTSClient, ProsodyOptions, OUTPUT_FORMAT } from 'edge-tts-client';
import { useStore } from './store';

const useEdgeTTS = () => {
  const [ttsClient, setTtsClient] = useState<EdgeTTSClient | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioEndResolveRef = useRef<(() => void) | null>(null);
  const audioChunksRef = useRef<Uint8Array[]>([]);
  const { setIntensity } = useStore();
  const intensityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateIntensity = () => {
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      const intensity = Math.sqrt(
        dataArray.reduce((sum, value) => sum + Math.pow((value - 128) / 128, 2), 0) / dataArray.length
      );

      setIntensity(intensity*3);
    }
  };

  useEffect(() => {
    try {
      const client = new EdgeTTSClient();
      setTtsClient(client);
      audioContextRef.current = new AudioContext();
    } catch (error) {
      console.error('Error creating audio context:', error);
    }

    return () => {
      try {
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        if (intensityIntervalRef.current) {
          clearInterval(intensityIntervalRef.current);
        }
      } catch (error) {
        console.error('Error cleaning up audio context:', error);
      }
    };
  }, []);

  const synthesizeAndPlay = useCallback(async (text: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      if (!ttsClient || !audioContextRef.current) {
        reject(new Error('TTS client or audio context not initialized'));
        return;
      }

      try {
        await ttsClient.setMetadata('ru-RU-SvetlanaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, 'ru-RU');
        const options = new ProsodyOptions();
        options.pitch = 'medium';
        options.rate = 'medium';
        options.volume = 90;

        const stream = ttsClient.toStream(text, options);
        setIsPlaying(true);
        audioEndResolveRef.current = resolve;
        audioChunksRef.current = [];

        stream.on('data', (audioChunk: Uint8Array) => {
          audioChunksRef.current.push(audioChunk);
        });

        stream.on('end', async () => {
          try {
            const concatenatedBuffer = new Uint8Array(
              audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
            );
            let offset = 0;
            audioChunksRef.current.forEach((chunk) => {
              concatenatedBuffer.set(chunk, offset);
              offset += chunk.length;
            });

            const audioBuffer = await audioContextRef.current!.decodeAudioData(
              concatenatedBuffer.buffer
            );

            if (sourceNodeRef.current) {
              sourceNodeRef.current.stop();
              sourceNodeRef.current.disconnect();
            }

            const source = audioContextRef.current!.createBufferSource();
            const analyser = audioContextRef.current!.createAnalyser();
            
            source.buffer = audioBuffer;
            source.connect(analyser);
            analyser.connect(audioContextRef.current!.destination);
            
            sourceNodeRef.current = source;
            analyserRef.current = analyser;

            // Запускаем интервал для расчета интенсивности
            intensityIntervalRef.current = setInterval(calculateIntensity, 50);

            source.onended = () => {
              setIsPlaying(false);
              if (intensityIntervalRef.current) {
                clearInterval(intensityIntervalRef.current);
              }
              if (audioEndResolveRef.current) {
                audioEndResolveRef.current();
                audioEndResolveRef.current = null;
              }
            };

            source.start();
          } catch (error) {
            console.error('Error decoding or playing audio:', error);
            reject(error);
          }
        });

      } catch (error) {
        console.error('Error synthesizing audio:', error);
        reject(error);
      }
    });
  }, [ttsClient]);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }
    if (intensityIntervalRef.current) {
      clearInterval(intensityIntervalRef.current);
    }
    setIsPlaying(false);
    
    if (audioEndResolveRef.current) {
      audioEndResolveRef.current();
      audioEndResolveRef.current = null;
    }
  }, []);

  return {
    synthesizeAndPlay,
    stop,
    isPlaying,
  };
};

export default useEdgeTTS;
