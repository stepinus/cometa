import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useStore } from './store';
import { OggOpusDecoderWebWorker } from 'ogg-opus-decoder';

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
      const bufferLength = analyserRef.current.fftSize;
      const dataArray = new Uint8Array(bufferLength);
      analyserRef.current.getByteTimeDomainData(dataArray);

      let sumSquares = 0;
      for (let i = 0; i < bufferLength; i++) {
        const normalized = (dataArray[i] - 128) / 128;
        sumSquares += normalized * normalized;
      }
      const intensity = Math.sqrt(sumSquares / bufferLength);
      setIntensity(intensity * 3);
    }
  }, [setIntensity]);

  const fetchOAuthToken = useCallback(async () => {
    try {
      const rqUid = uuidv4();
      const response = await fetch('/salute', {
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
    if (tokenData && Date.now() < tokenData.expiresAt) {
      return Promise.resolve(tokenData);
    }
    
    return fetchOAuthToken();
  }, [fetchOAuthToken, tokenData]);

  const recognizeSpeech = useCallback(async (
    audioData: Float32Array,
  ): Promise<RecognitionResult> => {
    try {
      const currentToken = await getToken();
      
      const pcmData = convertFloat32ToInt16(audioData);
      
      const blob = new Blob([pcmData], { type: 'audio/x-pcm' });
      
      const response = await fetch('/speech', {
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

  // Инициализация декодера с использованием Web Worker
  const decoderRef = useRef<OggOpusDecoderWebWorker | null>(null);

  useEffect(() => {
    const initializeDecoder = async () => {
      const decoder = new OggOpusDecoderWebWorker();
      await decoder.ready;
      decoderRef.current = decoder;
    };
    initializeDecoder();
    
    return () => {
      // Очистка декодера при размонтировании
      if (decoderRef.current) {
        decoderRef.current.free();
      }
    };
  }, []);

  const synthesizeSpeech = useCallback(async (
    text: string,
    options: SynthesisOptions = {}
  ): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        const currentToken = await getToken();

        const format = options.format || 'opus';
        const voice = options.voice || 'May_24000';

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

        const oggOpusData = await response.arrayBuffer();
        const decoder = decoderRef.current;
        if (!decoder) {
          throw new Error('Decoder is not initialized.');
        }

        const decoded = await decoder.decode(new Uint8Array(oggOpusData)); // Добавлено await

        const audioContext = new AudioContext({ sampleRate: decoded.sampleRate });
        audioContextRef.current = audioContext;

        // Создание анализатора и подключение его к AudioContext
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyserRef.current = analyser;

        const audioBuffer = audioContext.createBuffer(decoded.channelData.length, decoded.channelData[0].length, decoded.sampleRate);
        decoded.channelData.forEach((channel, index) => {
          audioBuffer.copyToChannel(channel, index);
        });

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(analyser); // Подключение источника к анализатору
        analyser.connect(audioContext.destination); // Подключение анализатора к выходу

        source.start();

        setIsSpeaking(true);
        source.onended = () => {
          setIsSpeaking(false);
          resolve();
        };

      } catch (err) {
        setIsSpeaking(false);
        setError(err instanceof Error ? err : new Error(String(err)));
        reject(err);
      }
    });
  }, [getToken]);
  
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

  useEffect(() => {
    if (isSpeaking) {
      intensityIntervalRef.current = setInterval(calculateIntensity, 50); // вызываем каждые 100 мс во время проигрывания
    } else if (intensityIntervalRef.current) {
      clearInterval(intensityIntervalRef.current); // останавливаем, когда проигрывание завершено
    }

    return () => {
      if (intensityIntervalRef.current) {
        clearInterval(intensityIntervalRef.current);
      }
    };
  }, [isSpeaking, calculateIntensity]);

  return { 
    getToken,
    recognizeSpeech,
    synthesizeSpeech,
    error,
    isSpeaking 
  };
};

export default useSaluteSTT;
