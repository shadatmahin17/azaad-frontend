export const STORAGE_KEYS = {
  theme: "azaad_theme",
  apiKey: "azaad_api_key",
  favorites: "azaad_favorites",
  recent: "azaad_recent",
  playlists: "azaad_playlists",
  volume: "azaad_volume",
  autoplay: "azaad_autoplay",
};

export function readStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}
