import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const StartPage = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Initialize audio context
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    // You might want to store this in a context or state management solution
  }, []);

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-8">Welcome</h1>
        <div className="space-y-4">
          <button
            onClick={() => navigate('/app')}
            className="block w-64 bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Start Application
          </button>
          <button
            onClick={() => navigate('/settings')}
            className="block w-64 bg-gray-500 text-white px-6 py-3 rounded-lg hover:bg-gray-600 transition-colors"
          >
            Change API Settings
          </button>
        </div>
      </div>
    </div>
  );
};
