const FALLBACK_API_BASE = "https://azaad-backend-api-production.up.railway.app";

export const API_BASE = import.meta.env.VITE_API_BASE_URL || FALLBACK_API_BASE;

// Intentionally empty by default. Public frontend API keys should be provided via env.
export const DEFAULT_API_KEY = import.meta.env.VITE_API_KEY || "";
