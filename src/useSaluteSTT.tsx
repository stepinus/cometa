import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from './store';

interface SaluteSTTOptions {
  authorizationKey: string;
  scope?: 'SALUTE_SPEECH_PERS' | 'SALUTE_SPEECH_CORP' | 'SALUTE_SPEECH_B2B' | 'SBER_SPEECH';
}

interface TokenData {
  token: string;
  expiresAt: number;
}

interface Emotions {
  negative: number;
  neutral: number;
  positive: number;
}

interface RecognitionResult {
  result: string[];
  emotions?: Emotions[];
  status: number;
  requestId?: string;
}

interface SynthesisOptions {
  format?: 'opus' | 'wav16' | 'pcm16';
  voice?: string; // например 'May_24000'
  sampleRate?: 8000 | 16000 | 24000 | 48000;
}

const convertFloat32ToInt16 = (float32Array: Float32Array): Int16Array => {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Конвертируем float32 [-1.0, 1.0] в int16 [-32768, 32767]
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
};

// Добавляем функцию convertInt16ToFloat32
const convertInt16ToFloat32 = (input: Int16Array): Float32Array => {
  const output = new Float32Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const int = input[i];
    // Преобразуем из 16-битного int в диапазоне [-32768, 32767] в float в диапазоне [-1, 1]
    const float = int / (int < 0 ? 32768 : 32767);
    output[i] = float;
  }
  return output;
};

const useSaluteSTT = () => {
  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const { setIntensity } = useStore();
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intensityIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const calculateIntensity = useCallback(() => {
    if (analyserRef.current) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      const intensity = Math.sqrt(
        dataArray.reduce((sum, value) => sum + Math.pow((value - 128) / 128, 2), 0) / dataArray.length
      );

      setIntensity(intensity * 3);
    }
  }, [setIntensity, analyserRef]);

  const fetchOAuthToken = useCallback(async () => {
    // Внутренняя функция для получения токена
    try {
      const rqUid = uuidv4();
      const response = await fetch('/salute', {  // Изменено с /oauth
        method: 'POST',
        headers: {
          'Authorization': `Basic ${import.meta.env.VITE_APP_SALUTE}`,
          'RqUID': rqUid,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ scope:'SALUTE_SPEECH_PERS' })
      });

      if (!response.ok) {
        throw new Error(`OAuth request failed: ${response.statusText}`);
      }

      const data = await response.json();
      const newTokenData: TokenData = {
        token: data.access_token,
        expiresAt: data.expires_at
      };

      setTokenData(newTokenData);
      return newTokenData;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  const getToken = useCallback(() => {
    // Проверяем валидность существующего токена
    if (tokenData && Date.now() < tokenData.expiresAt) {
      return Promise.resolve(tokenData);
    }
    
    // Если токен просрочен или отсутствует, получаем новый
    return fetchOAuthToken();
  }, [fetchOAuthToken, tokenData]);

  const recognizeSpeech = useCallback(async (
    audioData: Float32Array,
  ): Promise<RecognitionResult> => {
    try {
      const currentToken = await getToken();
      
      // Конвертируем Float32Array в Int16Array (PCM формат)
      const pcmData = convertFloat32ToInt16(audioData);
      
      // Создаем Blob из PCM данных
      const blob = new Blob([pcmData], { type: 'audio/x-pcm' });
      
      const response = await fetch('/speech', {  // Изменено с /recognize на /speech
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentToken.token}`,
          'Content-Type': 'audio/x-pcm;bit=16;rate=16000'
        },
        body: blob
      });

      if (!response.ok) {
        throw new Error(`Speech recognition failed: ${response.statusText}`);
      }

      const requestId = response.headers.get('X-Request-ID');
      const result = await response.json();

      return {
        ...result,
        requestId,
        status: response.status
      };
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, [getToken]);

  const synthesizeSpeech = useCallback(async (
    text: string,
    options: SynthesisOptions = {}
  ): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const currentToken = await getToken();

        const format = options.format || 'wav16';
        const voice = options.voice || 'May_24000';

        // Извлекаем частоту дискретизации из имени голоса
        const voiceParts = voice.split('_');
        const sampleRate = options.sampleRate || (voiceParts.length > 1 ? parseInt(voiceParts[1], 10) : 16000);

        const queryParams = new URLSearchParams({ format, voice });

        const headers = {
          'Authorization': `Bearer ${currentToken.token}`,
          'Content-Type': 'application/ssml',
        };

        const response = await fetch(`/synthesize?${queryParams.toString()}`, {
          method: 'POST',
          headers,
          body: text,
        });

        if (!response.ok || !response.body) {
          throw new Error(`Speech synthesis failed: ${response.statusText}`);
        }

        const AudioContext = window.AudioContext;
        if (!AudioContext) {
          throw new Error('Web Audio API is not supported in this browser.');
        }

        const audioContext = new AudioContext({ sampleRate });
        audioContextRef.current = audioContext;
        let startTime = 0;
        let leftover: Uint8Array | null = null;
        const reader = response.body.getReader();
        
        setIsSpeaking(true);
        const initialBufferDuration = 1; // в секундах
        let bufferedDuration = 0;
        const audioBuffers: AudioBuffer[] = [];
        let activeSourceNodes: AudioBufferSourceNode[] = [];
        let cumulativeTime = 0;

        const scheduleBuffers = () => {
          if (bufferedDuration >= initialBufferDuration) {
            startTime = audioContext.currentTime + 0.2;

            // Воспроизводим накопленные буферы
            audioBuffers.forEach(buffer => {
              const source = audioContext.createBufferSource();
              const analyser = audioContext.createAnalyser();
              
              source.buffer = buffer;
              source.connect(analyser);
              analyser.connect(audioContext.destination);
              
              analyserRef.current = analyser;
              activeSourceNodes.push(source);

              source.onended = () => {
                const index = activeSourceNodes.indexOf(source);
                if (index > -1) {
                  activeSourceNodes.splice(index, 1);
                  if (activeSourceNodes.length === 0) {
                    setIsSpeaking(false);
                    if (intensityIntervalRef.current) {
                      clearInterval(intensityIntervalRef.current);
                    }
                    resolve(); // Резолвим промис после окончания воспроизведения
                  }
                }
              };

              source.start(audioContext.currentTime + cumulativeTime);
              cumulativeTime += buffer.duration;
            });

            // Запускаем отслеживание интенсивности
            if (intensityIntervalRef.current) {
              clearInterval(intensityIntervalRef.current);
            }
            intensityIntervalRef.current = setInterval(calculateIntensity, 50);
            
            audioBuffers.length = 0; // Очищаем буфер после воспроизведения
          }
        };

        const readChunk = async () => {
          const { done, value } = await reader.read();
          if (done) {
            // Если все чанки прочитаны, но буфер еще не полон, принудительно воспроизводим
            if (audioBuffers.length > 0) {
              scheduleBuffers();
            }
            return;
          }

          let chunk = value!;
          // Если есть остаток от предыдущего чанка, объединяем его с текущим
          if (leftover) {
            const combined = new Uint8Array(leftover.length + chunk.length);
            combined.set(leftover);
            combined.set(chunk, leftover.length);
            chunk = combined;
            leftover = null;
          }

          const frameSize = 2; // 16 бит PCM
          const validLength = Math.floor(chunk.length / frameSize) * frameSize;

          const validChunk = chunk.slice(0, validLength);
          // Сохраняем остаток для следующего чанка
          if (validLength < chunk.length) {
            leftover = chunk.slice(validLength);
          }

          // Преобразуем Uint8Array в Float32Array
          const int16Array = new Int16Array(validChunk.buffer);
          const float32Array = convertInt16ToFloat32(int16Array);

          // Создаем AudioBuffer из полученных данных
          const audioBuffer = audioContext.createBuffer(1, float32Array.length, sampleRate);
          audioBuffer.getChannelData(0).set(float32Array);
          
          audioBuffers.push(audioBuffer);
          bufferedDuration += audioBuffer.duration;
          
          scheduleBuffers();

          // Читаем следующий чанк
          await readChunk();
        };

        // Начинаем чтение и обработку данных
        readChunk();

      } catch (err) {
        setIsSpeaking(false);
        if (intensityIntervalRef.current) {
          clearInterval(intensityIntervalRef.current);
        }
        setError(err instanceof Error ? err : new Error(String(err)));
        reject(err);
      }
    });
  }, [getToken, calculateIntensity]);

  // Очистка при размонтировании компонента
  useEffect(() => {
    return () => {
      if (intensityIntervalRef.current) {
        clearInterval(intensityIntervalRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return { 
    getToken,
    recognizeSpeech,
    synthesizeSpeech,
    error,
    isSpeaking 
  };
};

export default useSaluteSTT;
