import { useState, useCallback } from 'react';
import { createClient, LiveTTSEvents } from '@deepgram/sdk';

// WAV header для корректного воспроизведения аудио
const wavHeader = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, // "RIFF"
  0x00, 0x00, 0x00, 0x00, // Placeholder for file size
  0x57, 0x41, 0x56, 0x45, // "WAVE"
  0x66, 0x6D, 0x74, 0x20, // "fmt "
  0x10, 0x00, 0x00, 0x00, // Chunk size (16)
  0x01, 0x00,             // Audio format (1 for PCM)
  0x01, 0x00,             // Number of channels (1)
  0x80, 0xBB, 0x00, 0x00, // Sample rate (48000)
  0x00, 0xEE, 0x02, 0x00, // Byte rate (48000 * 2)
  0x02, 0x00,             // Block align (2)
  0x10, 0x00,             // Bits per sample (16)
  0x64, 0x61, 0x74, 0x61, // "data"
  0x00, 0x00, 0x00, 0x00  // Placeholder for data size
]);

export const useDeepgramTTS = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const playText = useCallback(async (text: string, model: string = 'aura-asteria-en') => {
    setIsPlaying(true);
    setAudioUrl(null);

    try {
      const deepgram = createClient(import.meta.env.VITE_APP_DEEPGRAM_API_KEY);
      const dgConnection = deepgram.speak.live({
        model: model,
        encoding: 'linear16',
        sample_rate: 48000,
      });

      let audioBuffer = new Uint8Array(wavHeader);

      return new Promise<void>((resolve, reject) => {
        dgConnection.on(LiveTTSEvents.Open, () => {
          dgConnection.sendText(text);
          dgConnection.flush();
        });

        dgConnection.on(LiveTTSEvents.Audio, (data) => {
          const buffer = new Uint8Array(data);
          audioBuffer = new Uint8Array([...audioBuffer, ...buffer]);
        });

        dgConnection.on(LiveTTSEvents.Flushed, () => {
          const blob = new Blob([audioBuffer], { type: 'audio/wav' });
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);

          const audio = new Audio(url);
          audio.onended = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            setIsPlaying(false);
            URL.revokeObjectURL(url);
            reject(new Error('Audio playback failed'));
          };
          audio.play();
        });

        dgConnection.on(LiveTTSEvents.Error, (err) => {
          console.error('Deepgram TTS Error:', err);
          setIsPlaying(false);
          reject(err);
        });
      });
    } catch (error) {
      console.error('TTS Playback Error:', error);
      setIsPlaying(false);
      throw error;
    }
  }, []);

  return { playText, isPlaying, audioUrl };
};
