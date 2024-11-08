import { useState, useCallback } from 'react';
import { convertAudioToWav, transcribeAudio } from './audioUtils';
import { set } from 'lodash';
import { on } from 'events';

interface AudioProcessorOptions {
  onProcessed?: (transcription: any) => void;
  onPending?:()=>void;
}

export const useAudioChunkProcessor = ({
  onProcessed,
  onPending
}: AudioProcessorOptions = {}) => {

  const processAudioData = useCallback(async (audioData: Float32Array<ArrayBufferLike>) => {
    console.log('processAudioData',)
    try {
      if(onPending){
          onPending()
      } 
      const wav = convertAudioToWav(audioData, 16000);
      console.log(wav)
      const transcription = await transcribeAudio(wav);
      if (onProcessed) {
        onProcessed(transcription);
      }
      return transcription;
    } catch (error) {
      console.error('Ошибка обработки аудио:', error);
      throw error;
    } finally {
    console.log('finally')
    }
  }, [onProcessed]);

  return {
    processAudioData,
  };
};
