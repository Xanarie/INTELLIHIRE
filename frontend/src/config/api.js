// frontend/src/config/api.js
//
// Single source of truth for API base URLs and shared axios instances.
// All components/hooks must import from here — never hardcode URLs directly.
//
// To switch to a deployed URL, change it here only.
// Vite exposes VITE_* env vars to the frontend via import.meta.env.

import axios from 'axios';

export const API_BASE   = import.meta.env.VITE_API_URL        ?? 'http://localhost:8000/api/admin';
export const API_PUBLIC = import.meta.env.VITE_API_PUBLIC_URL ?? 'http://localhost:8000';

// ── Shared axios instances ────────────────────────────────────────────────────
// Pre-configured with timeout so requests never hang during the presentation.
// 10 s for admin/AI calls (may do heavier DB work), 8 s for public endpoints.

export const api = axios.create({
  baseURL: API_BASE,
  timeout: 10_000,
});

export const apiPublic = axios.create({
  baseURL: API_PUBLIC,
  timeout: 8_000,
});