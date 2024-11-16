import { OpenAI } from 'openai';

export const client = new OpenAI({
  apiKey: import.meta.env.VITE_APP_OPENAI_API_KEY2 || '',
  baseURL: import.meta.env.VITE_APP_OPENAI_API_BASE2,
  dangerouslyAllowBrowser: true,
});

export const convertAudioToWav = (audioData: Float32Array, sampleRate: number = 16000): Blob => {
  // Создаем AudioContext
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  
  // Создаем AudioBuffer
  const audioBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
  audioBuffer.getChannelData(0).set(audioData);

  // Конвертируем в WAV
  const numOfChan = audioBuffer.numberOfChannels;
  const length = audioBuffer.length * numOfChan * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  const channels = [];
  let offset = 0;
  let pos = 0;

  // Записываем WAV заголовок
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // длина файла - 8
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // длина = 16
  setUint16(1); // PCM (несжатый)
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2 * numOfChan); // байт/сек
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4); // длина chunk

  // Записываем данные
  for(let i = 0; i < audioBuffer.numberOfChannels; i++) {
    channels.push(audioBuffer.getChannelData(i) as never);
  }

  while(pos < length) {
    for(let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset])); // ограничиваем значения
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767)|0; // конвертируем в 16-bit
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  // Вспомогательные функции для записи данных
  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }

  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  return new Blob([buffer], { type: "audio/wav" });
};

export const transcribeAudio = async (audioBlob: Blob) => {
  try {
    // Создаем File объект из Blob
    const audioFile = new File(
      [audioBlob], 
      `audio-${Date.now()}.wav`, // Уникальное имя файла с временной меткой
      { type: 'audio/wav' }
    );

    const result = await client.audio.transcriptions.create({
      file: audioFile,
      model: 'stt-openai/whisper-1',
      response_format: 'json',
      language:"ru",
    });
    console.log(result)
    return result;
  } catch (error) {
    console.error('Ошибка при транскрибации:', error);
    throw error;
  }
};