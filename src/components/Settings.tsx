import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const envKeys = [
  'VITE_APP_OPENAI_API_BASE',
  'VITE_APP_OPENAI_API_BASE2',
  'VITE_APP_OPENAI_API_KEY',
  'VITE_APP_OPENAI_API_KEY2',
  'VITE_APP_COMETA_API_KEY',
  'VITE_APP_DEEPGRAM_API_KEY',
  'VITE_APP_SALUTE',
  'VITE_OAUTH_API_URL',
  'VITE_RECOGNIZE_API_URL',
  'VITE_APP_MODEL',
  'VITE_APP_WAKEWORD'
];

export const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<Record<string, string>>({});

  useEffect(() => {
    const storedSettings: Record<string, string> = {};
    envKeys.forEach(key => {
      storedSettings[key] = localStorage.getItem(key) || import.meta.env[key] || '';
    });
    setSettings(storedSettings);
  }, []);

  const handleSave = () => {
    Object.entries(settings).forEach(([key, value]) => {
      localStorage.setItem(key, value);
    });
    navigate('/');
    window.location.reload();
  };

  const handleCancel = () => {
    navigate('/');
  };

  return (
    <div className="p-4 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">API Settings</h1>
      <div className="space-y-4">
        {envKeys.map(key => (
          <div key={key} className="flex flex-col">
            <label className="text-sm font-medium mb-1">{key}</label>
            <input
              type="text"
              value={settings[key] || ''}
              onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
              className="border rounded p-2"
            />
          </div>
        ))}
      </div>
      <div className="mt-6 flex space-x-4">
        <button
          onClick={handleSave}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Save
        </button>
        <button
          onClick={handleCancel}
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
