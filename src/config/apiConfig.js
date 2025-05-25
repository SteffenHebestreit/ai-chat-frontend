const DEFAULT_BACKEND_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8081/research-agent/api';

export const getBackendUrl = () => {
  return localStorage.getItem('backendUrl') || DEFAULT_BACKEND_URL;
};
