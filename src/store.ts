import { create } from 'zustand';
import * as THREE from 'three';

export interface VADAudioData {
  rawData: Float32Array | null;
  energy: number;
  isSpeaking: boolean;
  timestamp: number;
}

export const statusMap = {
  isIdle: 0,
  isRecording: 1,
  isWaitingForResponse: 2,
  isSpeaking: 3,
};

interface StoreState {
  isInit: boolean;
  innerSegments: number;
  audioContext?: AudioContext;
  vadAudioData: VADAudioData | null;
  
  setInnerSegments: (value: number) => void;
  updateVADData: (data: Partial<VADAudioData>) => void;
  initAudio: () => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  isInit: false,
  innerSegments: 130,
  vadAudioData: null,

  setInnerSegments: (value) => set({ innerSegments: value }),
  
  updateVADData: (data) => set((state) => ({
    vadAudioData: {
      ...(state.vadAudioData || {
        rawData: null,
        energy: 0,
        isSpeaking: false,
        timestamp: 0
      }),
      ...data,
      timestamp: Date.now()
    }
  })),

  initAudio: async () => {
    return new Promise((resolve) => {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      set({ audioContext, isInit: true });
      console.log('Audio initialized');
      resolve();
    });
  },
}));
