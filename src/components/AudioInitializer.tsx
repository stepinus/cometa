import React,{ useState, useCallback } from 'react';



interface AudioInitializerProps {
  onInitialized: () => void;
}

export const AudioInitializer = ({ onInitialized }: AudioInitializerProps) => {
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async () => {
    try {
      // Create and resume AudioContext
      const audioContext = new window.AudioContext;
      await audioContext.resume();
      
      // Create a short silent buffer and play it
      const buffer = audioContext.createBuffer(1, 1, 22050);
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start();
      
      onInitialized();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize audio');
    }
  }, [onInitialized]);

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-90 z-50">
      <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Добро пожаловать</h2>
        <p className="mb-6 text-gray-600">
          Для работы приложения необходим доступ к микрофону. Нажмите кнопку "Начать" для продолжения.
        </p>
        {error && (
          <p className="text-red-500 mb-4">{error}</p>
        )}
        <button
          onClick={handleStart}
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
        >
          Начать
        </button>
      </div>
    </div>
  );
};
