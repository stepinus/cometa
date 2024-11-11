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
  status:boolean;
  setStatus:any;
  
  setInnerSegments: (value: number) => void;
  updateVADData: (data: Partial<VADAudioData>) => void;
  initAudio: () => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  status: true,
  isInit: false,
  innerSegments: 130,
  vadAudioData: null,
  isPending:false,
  setStatus: (status: boolean) => set({ status }),
 


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
const processAudioData = (data) => {
    if (!data || data.length === 0) {
        console.warn("No audio data available");
        return {bass: 0, treble: 0, intensity: 0};
    }

    const bass = data.slice(0, 8).reduce((a, b) => a + b, 0) / 8;
    const treble = data.slice(24).reduce((a, b) => a + b, 0) / 8;
    const intensity = data.reduce((a, b) => a + b, 0) / 32;
    return {
        bass: bass / 255,
        treble: treble / 255,
        intensity: intensity / 255,
        rawIntensity: intensity
    };
};