// frontend/src/config/api.js
//
// Single source of truth for the API base URL.
// Previously hardcoded as "http://localhost:8000/api/admin" in at least 4 files:
//   useAdminData.js, useJob.js, AI.jsx, ApplicantDetail.jsx
//
// To switch to a deployed URL, change it here only.
// Vite exposes VITE_* env vars to the frontend via import.meta.env.

export const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api/admin';

// Public-facing applicant API (different prefix)
export const API_PUBLIC = import.meta.env.VITE_API_PUBLIC_URL ?? 'http://localhost:8000';