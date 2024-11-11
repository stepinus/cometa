'use client'
import { useEffect, useState, useCallback, useRef } from 'react';
import { getVoices, tts } from 'edge-tts'
import { EdgeTTSClient, ProsodyOptions, OUTPUT_FORMAT } from 'edge-tts-client';

const useEdgeTTS = () => {
  const [ttsClient, setTtsClient] = useState<EdgeTTSClient | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<Uint8Array[]>([]);

  useEffect(() => {
    const client = new EdgeTTSClient();
    setTtsClient(client);
    audioContextRef.current = new AudioContext();

    return () => {
      client.close();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };

  }, []);

  const synthesizeAndPlay = useCallback(async (text: string) => {
    if (!ttsClient || !audioContextRef.current) return;
    await ttsClient.setMetadata('ru-RU-SvetlanaNeural', OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, 'ru-RU');
    const options = new ProsodyOptions();
    options.pitch = 'low';
    options.rate = 1.2;
    options.volume = 90;

    // Очищаем предыдущий буфер
    audioBufferRef.current = [];

    const stream = ttsClient.toStream(text, options);
    setIsPlaying(true);

    stream.on('data', async (audioChunk: Uint8Array) => {
      // Добавляем чанк в буфер
      audioBufferRef.current.push(audioChunk);

      try {
        // Создаем единый буфер из всех полученных чанков
        const concatenatedBuffer = new Uint8Array(
          audioBufferRef.current.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        
        let offset = 0;
        audioBufferRef.current.forEach(chunk => {
          concatenatedBuffer.set(chunk, offset);
          offset += chunk.length;
        });

        // Декодируем аудио буфер
        const audioBuffer = await audioContextRef.current!.decodeAudioData(
          concatenatedBuffer.buffer
        );
        
        // Останавливаем предыдущий источник если он есть
        if (sourceNodeRef.current) {
          sourceNodeRef.current.stop();
          sourceNodeRef.current.disconnect();
        }

        // Создаем новый источник и проигрываем
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current!.destination);
        sourceNodeRef.current = source;
        source.start();

        source.onended = () => {
          console.log('Audio ended');
          source.disconnect();
        };

      } catch (error) {
        console.error('Error decoding audio:', error);
      }
    });

    stream.on('end', () => {

      setIsPlaying(false);
    });
  }, [ttsClient]);

  const stop = useCallback(() => {
    if (sourceNodeRef.current) {
      sourceNodeRef.current.stop();
      sourceNodeRef.current.disconnect();
    }
    setIsPlaying(false);
    audioBufferRef.current = [];
  }, []);

  return {
    synthesizeAndPlay,
    stop,
    isPlaying
  };
};

export default useEdgeTTS;