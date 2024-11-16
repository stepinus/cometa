import React, { useState, useRef, useEffect } from 'react';

interface StatusMessageProps {
  isPending: boolean;
  isPlaying: boolean;
}

export const StatusMessage: React.FC<StatusMessageProps> = ({ isPending, isPlaying }) => {
  const [isVisible, setIsVisible] = useState(false);
  const requestRef = useRef<number>();
  const text = isPending ? "Ожидайте ответа" : "Говорите, Предсказательница слушает вас";

  useEffect(() => {
    setIsVisible(false);
    
    const timer = setTimeout(() => {
      setIsVisible(!isPlaying);
    }, 50);

    return () => clearTimeout(timer);
  }, [isPending, isPlaying]);

  return (
    <div className="fixed top-[5%] left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className={`
        px-6 py-3 rounded-2xl text-2xl text-center transition-all duration-500 ease-in-out
        ${isVisible && !isPlaying
          ? 'opacity-100 scale-100 animate-pulse' 
          : 'opacity-0 scale-50'
        }
        ${isPending 
          ? 'text-white/60' 
          : 'text-white/70'
        }
      `}>
        {text}
      </div>
    </div>
  );
};
