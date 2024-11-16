import { useEffect, useState, useCallback, useRef } from 'react';
import { EdgeTTSClient, ProsodyOptions, OUTPUT_FORMAT } from 'edge-tts-client';

const useEdgeTTS = () => {
  const [ttsClient, setTtsClient] = useState<EdgeTTSClient | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<Uint8Array[]>([]);
  const audioEndResolveRef = useRef<(() => void) | null>(null);

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
        // Добавляем небольшой префикс тишины для плавного старта
        const silentPrefixMs = 200;
        const silentPrefix = new Uint8Array(silentPrefixMs * 2); // 16-bit audio

        await ttsClient.setMetadata('ru-RU-SvetlanaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, 'ru-RU');
        const options = new ProsodyOptions();
        options.pitch = 'medium';
        options.rate = 'fast';
        options.volume = 90;

        audioBufferRef.current = [silentPrefix];

        const stream = ttsClient.toStream(text, options);
        setIsPlaying(true);

        // Устанавливаем резолв для окончания аудио
        audioEndResolveRef.current = resolve;

        stream.on('data', async (audioChunk: Uint8Array) => {
          audioBufferRef.current.push(audioChunk);
        });

        stream.on('end', async () => {
          try {
            const concatenatedBuffer = new Uint8Array(
              audioBufferRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
            );
            let offset = 0;
            audioBufferRef.current.forEach((chunk) => {
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
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current!.destination);
            sourceNodeRef.current = source;

            // Добавляем точный обработчик окончания
            source.onended = () => {
              setIsPlaying(false);
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
    setIsPlaying(false);
    audioBufferRef.current = [];
    
    // Резолвим промис, если аудио прервано
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
