export const DEFAULT_COVER =
  "https://mahin-cloud-storage.s3.ap-southeast-1.amazonaws.com/img/Background.jpg";

export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function parseDurationToSeconds(rawDuration) {
  if (typeof rawDuration === "number" && Number.isFinite(rawDuration)) {
    if (rawDuration > 10_000) return Math.round(rawDuration / 1000);
    return Math.round(rawDuration);
  }

  if (typeof rawDuration !== "string") return 0;

  const trimmed = rawDuration.trim();
  if (!trimmed) return 0;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) return 0;
    if (numeric > 10_000) return Math.round(numeric / 1000);
    return Math.round(numeric);
  }

  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((part) => !Number.isFinite(part))) return 0;

  if (parts.length === 2) {
    return Math.round(parts[0] * 60 + parts[1]);
  }
  if (parts.length === 3) {
    return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }

  return 0;
}

export function normalizeSong(raw, index, apiBase) {
  const absoluteUrl = (path) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const durationRaw =
    raw.duration ??
    raw.length ??
    raw.songLength ??
    raw.song_length ??
    raw.durationSeconds ??
    raw.duration_seconds ??
    raw.durationMs ??
    raw.duration_ms ??
    raw.metadata?.duration;

  return {
    id: String(raw.id || raw._id || raw.slug || `song-${index}`),
    title: raw.title || raw.songTitle || raw.name || raw.metadata?.title || "Untitled Track",
    artist: raw.artist || raw.artistName || raw.singer || raw.singers || raw.metadata?.artist || "Unknown Artist",
    album: raw.album || raw.category || raw.metadata?.album || "Azaad Collection",
    vibe: raw.vibe || raw.genre || raw.type || "Featured",
    duration: parseDurationToSeconds(durationRaw),
    featured: Boolean(raw.featured),
    trending: Boolean(raw.trending),
    audioUrl: absoluteUrl(raw.audioUrl || raw.audio || raw.songUrl || raw.fileUrl || raw.url),
    coverUrl: absoluteUrl(raw.coverUrl || raw.cover || raw.imageUrl || raw.thumbnail || raw.coverImage) || DEFAULT_COVER,
  };
}

export function createPlaylist(name) {
  return {
    id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    songIds: [],
    createdAt: new Date().toISOString(),
  };
}

export function normalizePlaylist(raw, index) {
  const fallback = createPlaylist(`My Playlist ${index + 1}`);
  if (!raw || typeof raw !== "object") return fallback;
  return {
    id: String(raw.id || fallback.id),
    name: String(raw.name || fallback.name),
    songIds: Array.isArray(raw.songIds) ? raw.songIds.map(String) : [],
    createdAt:
      typeof raw.createdAt === "string" && !Number.isNaN(Date.parse(raw.createdAt))
        ? raw.createdAt
        : fallback.createdAt,
  };
}

export function ensurePlaylists(playlists) {
  if (!Array.isArray(playlists) || playlists.length === 0) {
    return [createPlaylist("My Playlist")];
  }
  return playlists.map(normalizePlaylist);
}
