import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const API_BASE = `${BASE_URL}/api/admin`;
export const API_PUBLIC = BASE_URL;

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 60_000,
});

export const apiPublic = axios.create({
  baseURL: API_PUBLIC,
  timeout: 60_000,
});

api.interceptors.request.use(config => {
  const name = localStorage.getItem('userName');
  if (name) config.headers['X-Actor-Name'] = name;
  return config;
});