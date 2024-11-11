import { useState, useCallback } from 'react';
import { convertAudioToWav, transcribeAudio } from './audioUtils';
import { useStore } from './store';

interface AudioProcessorOptions {
  onProcessed?: (transcription: any) => void;
  onPending?: () => void;
  enableVADTracking?: boolean;
}

export const useAudioChunkProcessor = ({
  onProcessed,
  onPending,
  enableVADTracking = true
}: AudioProcessorOptions = {}) => {
  const { updateVADData } = useStore();

  const processAudioData = useCallback(async (audioData: Float32Array) => {
    console.log('processAudioData');
    try {
      if (onPending) {
        onPending();
      }

      const wav = convertAudioToWav(audioData, 16000);
      console.log(wav);
      const transcription = await transcribeAudio(wav);
      
      if (onProcessed) {
        onProcessed(transcription);
      }
      
      return transcription;
    } catch (error) {
      console.error('Ошибка обработки аудио:', error);
      throw error;
    } finally {
      console.log('finally');
    }
  }, [onProcessed, updateVADData, enableVADTracking]);

  return {
    processAudioData,
  };
};
