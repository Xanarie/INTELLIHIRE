import axios from 'axios';

export const API_BASE   = import.meta.env.VITE_API_URL        ?? 'http://localhost:8000/api/admin';
export const API_PUBLIC = import.meta.env.VITE_API_PUBLIC_URL ?? 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
});

export const apiPublic = axios.create({
  baseURL: API_PUBLIC,
  timeout: 8_000,
});

// Inject the logged-in user's name on every admin request so the backend
// can attribute activity log entries correctly.
api.interceptors.request.use(config => {
  const name = localStorage.getItem('userName');
  if (name) config.headers['X-Actor-Name'] = name;
  return config;
});