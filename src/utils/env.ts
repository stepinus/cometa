export const getEnvVar = (key: string): string => {
  const localValue = localStorage.getItem(key);
  if (localValue !== null) {
    return localValue;
  }
  return import.meta.env[key] || '';
};
