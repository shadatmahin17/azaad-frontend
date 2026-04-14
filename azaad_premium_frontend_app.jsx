import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Search,
  Library,
  Heart,
  User,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Shuffle,
  Repeat,
  Volume2,
  Moon,
  Sun,
  Music2,
  Clock3,
  Sparkles,
  Plus,
  ListMusic,
  Disc3,
  Radio,
  ChevronRight,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const API_BASE = "https://azaad-backend-api-production.up.railway.app";
const DEFAULT_API_KEY = "123456";

const STORAGE_KEYS = {
  theme: "azaad_theme",
  apiKey: "azaad_api_key",
  favorites: "azaad_favorites",
  recent: "azaad_recent",
  playlists: "azaad_playlists",
  volume: "azaad_volume",
};

const defaultCover =
  "https://mahin-cloud-storage.s3.ap-southeast-1.amazonaws.com/img/Background.jpg";

function readStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");
  return `${m}:${s}`;
}

function normalizeSong(raw, index) {
  const absoluteUrl = (path) => {
    if (!path) return "";
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  };

  return {
    id: String(raw.id || raw._id || raw.slug || `song-${index}`),
    title: raw.title || raw.songTitle || raw.name || "Untitled Track",
    artist: raw.artist || raw.artistName || raw.singer || raw.singers || "Unknown Artist",
    album: raw.album || raw.category || "Azaad Collection",
    vibe: raw.vibe || raw.genre || raw.type || "Featured",
    duration: Number(raw.duration || 0),
    featured: Boolean(raw.featured),
    trending: Boolean(raw.trending),
    audioUrl: absoluteUrl(raw.audioUrl || raw.audio || raw.songUrl || raw.fileUrl || raw.url),
    coverUrl: absoluteUrl(raw.coverUrl || raw.cover || raw.imageUrl || raw.thumbnail || raw.coverImage) || defaultCover,
  };
}

function createPlaylist(name) {
  return {
    id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    songIds: [],
    createdAt: new Date().toISOString(),
  };
}

function LogoPulse({ spinning = false }) {
  return (
    <motion.div
      animate={spinning ? { rotate: 360 } : { rotate: 0 }}
      transition={spinning ? { duration: 10, repeat: Infinity, ease: "linear" } : { duration: 0.4 }}
      className="relative h-11 w-11 overflow-hidden rounded-2xl border border-emerald-400/20 bg-gradient-to-br from-emerald-400/20 via-white/10 to-white/5 p-1 shadow-2xl shadow-emerald-950/40"
    >
      <img
        src="https://mahin-cloud-storage.s3.ap-southeast-1.amazonaws.com/img/favicon.png"
        alt="Azaad"
        className="h-full w-full rounded-xl object-cover"
      />
    </motion.div>
  );
}

function Equalizer({ active }) {
  return (
    <div className="flex h-5 items-end gap-1">
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className="w-1 rounded-full bg-emerald-400"
          animate={
            active
              ? { height: [6, 18, 8, 14, 6] }
              : { height: 6 }
          }
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.12 }}
        />
      ))}
    </div>
  );
}

export default function AzaadPremiumFrontend() {
  const audioRef = useRef(null);
  const [theme, setTheme] = useState("dark");
  const [apiKey, setApiKey] = useState(DEFAULT_API_KEY);
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState("home");
  const [currentSongId, setCurrentSongId] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState("off");
  const [favorites, setFavorites] = useState([]);
  const [recent, setRecent] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [queueOpen, setQueueOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("My Playlist");

  useEffect(() => {
    const storedTheme = readStorage(STORAGE_KEYS.theme, "dark");
    const storedApiKey = readStorage(STORAGE_KEYS.apiKey, DEFAULT_API_KEY);
    const storedFavorites = readStorage(STORAGE_KEYS.favorites, []);
    const storedRecent = readStorage(STORAGE_KEYS.recent, []);
    const storedPlaylists = readStorage(STORAGE_KEYS.playlists, [createPlaylist("Liked Collection")]);
    const storedVolume = readStorage(STORAGE_KEYS.volume, 0.8);

    setTheme(storedTheme);
    setApiKey(storedApiKey);
    setFavorites(storedFavorites);
    setRecent(storedRecent);
    setPlaylists(storedPlaylists);
    setVolume(storedVolume);
  }, []);

  useEffect(() => writeStorage(STORAGE_KEYS.theme, theme), [theme]);
  useEffect(() => writeStorage(STORAGE_KEYS.apiKey, apiKey), [apiKey]);
  useEffect(() => writeStorage(STORAGE_KEYS.favorites, favorites), [favorites]);
  useEffect(() => writeStorage(STORAGE_KEYS.recent, recent), [recent]);
  useEffect(() => writeStorage(STORAGE_KEYS.playlists, playlists), [playlists]);
  useEffect(() => writeStorage(STORAGE_KEYS.volume, volume), [volume]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    let ignore = false;

    async function fetchSongs() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/songs`, {
          headers: { "x-api-key": apiKey || DEFAULT_API_KEY },
        });
        if (!res.ok) {
          throw new Error(`API returned ${res.status}`);
        }
        const data = await res.json();
        const rawSongs = Array.isArray(data) ? data : data.songs || data.data || [];
        const normalized = rawSongs.map(normalizeSong).filter((song) => song.audioUrl);
        if (!ignore) {
          setSongs(normalized);
          if (!currentSongId && normalized.length) {
            setCurrentSongId(normalized[0].id);
          }
        }
      } catch (err) {
        if (!ignore) {
          setError(err instanceof Error ? err.message : "Failed to load songs");
          setSongs([
            {
              id: "demo-1",
              title: "Night Drive",
              artist: "Azaad Originals",
              album: "Demo Sessions",
              vibe: "Chill",
              duration: 164,
              featured: true,
              trending: true,
              audioUrl: "https://cdn.pixabay.com/audio/2022/05/27/audio_1808fbf07a.mp3",
              coverUrl: defaultCover,
            },
            {
              id: "demo-2",
              title: "Skyline Echo",
              artist: "Azaad Originals",
              album: "Demo Sessions",
              vibe: "Ambient",
              duration: 195,
              featured: false,
              trending: true,
              audioUrl: "https://cdn.pixabay.com/audio/2022/10/25/audio_946b007e1a.mp3",
              coverUrl:
                "https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg?auto=compress&cs=tinysrgb&w=600",
            },
          ]);
          if (!currentSongId) setCurrentSongId("demo-1");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    fetchSongs();
    return () => {
      ignore = true;
    };
  }, [apiKey]);

  const currentSong = useMemo(() => songs.find((song) => song.id === currentSongId) || null, [songs, currentSongId]);

  const filteredSongs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return songs;
    return songs.filter((song) => {
      return [song.title, song.artist, song.album, song.vibe].some((field) => field.toLowerCase().includes(q));
    });
  }, [songs, query]);

  const featuredSongs = useMemo(() => songs.filter((song) => song.featured).slice(0, 6), [songs]);
  const trendingSongs = useMemo(() => songs.filter((song) => song.trending).slice(0, 8), [songs]);
  const recentSongs = useMemo(
    () => recent.map((id) => songs.find((song) => song.id === id)).filter(Boolean).slice(0, 8),
    [recent, songs]
  );
  const favoriteSongs = useMemo(
    () => favorites.map((id) => songs.find((song) => song.id === id)).filter(Boolean),
    [favorites, songs]
  );

  const currentQueue = useMemo(() => {
    const base = query ? filteredSongs : songs;
    return base;
  }, [filteredSongs, songs, query]);

  const toggleFavorite = (songId) => {
    setFavorites((prev) =>
      prev.includes(songId) ? prev.filter((id) => id !== songId) : [songId, ...prev]
    );
  };

  const touchRecent = (songId) => {
    setRecent((prev) => [songId, ...prev.filter((id) => id !== songId)].slice(0, 20));
  };

  const playSong = async (song) => {
    if (!song) return;
    setCurrentSongId(song.id);
    touchRecent(song.id);
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src !== song.audioUrl) {
      audio.src = song.audioUrl;
    }
    try {
      await audio.play();
      setIsPlaying(true);
    } catch {
      setIsPlaying(false);
    }
  };

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!currentSong && songs.length) {
      await playSong(songs[0]);
      return;
    }
    if (audio.paused) {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch {
        setIsPlaying(false);
      }
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const stepSong = (direction) => {
    if (!currentQueue.length) return;
    const idx = currentQueue.findIndex((song) => song.id === currentSongId);
    if (shuffle && currentQueue.length > 1) {
      let pick = currentQueue[Math.floor(Math.random() * currentQueue.length)];
      while (pick.id === currentSongId) {
        pick = currentQueue[Math.floor(Math.random() * currentQueue.length)];
      }
      playSong(pick);
      return;
    }
    const nextIndex = direction === "next" ? idx + 1 : idx - 1;
    if (nextIndex >= 0 && nextIndex < currentQueue.length) {
      playSong(currentQueue[nextIndex]);
    } else if (repeat === "all") {
      playSong(direction === "next" ? currentQueue[0] : currentQueue[currentQueue.length - 1]);
    }
  };

  const addPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    setPlaylists((prev) => [...prev, createPlaylist(newPlaylistName.trim())]);
    setNewPlaylistName("My Playlist");
  };

  const addToPlaylist = (playlistId, songId) => {
    setPlaylists((prev) =>
      prev.map((pl) =>
        pl.id === playlistId && !pl.songIds.includes(songId)
          ? { ...pl, songIds: [...pl.songIds, songId] }
          : pl
      )
    );
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTime = () => {
      setProgress(audio.currentTime || 0);
      setDuration(audio.duration || currentSong?.duration || 0);
    };
    const onLoaded = () => setDuration(audio.duration || currentSong?.duration || 0);
    const onEnded = () => {
      if (repeat === "one") {
        audio.currentTime = 0;
        audio.play();
      } else {
        stepSong("next");
      }
    };
    const onPause = () => setIsPlaying(false);
    const onPlay = () => setIsPlaying(true);

    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("play", onPlay);

    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("play", onPlay);
    };
  }, [currentSong, repeat, currentQueue, currentSongId, shuffle]);

  const NavButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setView(id)}
      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${
        view === id
          ? "bg-emerald-500/15 text-emerald-300"
          : "text-zinc-400 hover:bg-white/5 hover:text-white"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );

  const SongCard = ({ song, compact = false }) => (
    <motion.button
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      onClick={() => playSong(song)}
      className={`group rounded-3xl border border-white/8 bg-white/[0.04] p-3 text-left shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:bg-white/[0.07] ${
        compact ? "w-full" : ""
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl">
        <img src={song.coverUrl} alt={song.title} className="aspect-square w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition group-hover:opacity-100" />
        <div className="absolute bottom-3 right-3 flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400 text-black opacity-0 shadow-xl transition group-hover:opacity-100">
          <Play className="h-5 w-5 fill-current" />
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <div className="line-clamp-1 font-semibold text-white">{song.title}</div>
        <div className="line-clamp-1 text-sm text-zinc-400">{song.artist}</div>
        <div className="flex items-center gap-2 pt-1">
          <Badge variant="secondary" className="rounded-full bg-white/10 text-zinc-200">
            {song.vibe}
          </Badge>
          {song.trending && <Badge className="rounded-full bg-rose-500/15 text-rose-300">Trending</Badge>}
        </div>
      </div>
    </motion.button>
  );

  const SongRow = ({ song, index }) => (
    <div className="grid grid-cols-[32px_minmax(0,1fr)_140px_100px_120px] items-center gap-3 rounded-2xl px-3 py-3 text-sm text-zinc-300 transition hover:bg-white/[0.04] max-md:grid-cols-[28px_minmax(0,1fr)_60px]">
      <div className="text-zinc-500">{index + 1}</div>
      <button onClick={() => playSong(song)} className="flex min-w-0 items-center gap-3 text-left">
        <img src={song.coverUrl} alt={song.title} className="h-11 w-11 rounded-xl object-cover" />
        <div className="min-w-0">
          <div className="truncate font-medium text-white">{song.title}</div>
          <div className="truncate text-xs text-zinc-400">{song.artist}</div>
        </div>
      </button>
      <div className="truncate text-zinc-400 max-md:hidden">{song.album}</div>
      <button
        onClick={() => toggleFavorite(song.id)}
        className={`justify-self-start rounded-full p-2 ${favorites.includes(song.id) ? "text-emerald-300" : "text-zinc-500 hover:text-white"}`}
      >
        <Heart className={`h-4 w-4 ${favorites.includes(song.id) ? "fill-current" : ""}`} />
      </button>
      <div className="flex items-center justify-between max-md:justify-end">
        <span className="text-zinc-500 max-md:hidden">{formatTime(song.duration || 0)}</span>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="rounded-full text-zinc-300 hover:bg-white/10 hover:text-white">
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </DialogTrigger>
          <DialogContent className="border-white/10 bg-zinc-950 text-white">
            <DialogHeader>
              <DialogTitle>Add to playlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  onClick={() => addToPlaylist(playlist.id, song.id)}
                  className="flex w-full items-center justify-between rounded-2xl border border-white/10 px-4 py-3 text-left hover:bg-white/5"
                >
                  <span>{playlist.name}</span>
                  <ChevronRight className="h-4 w-4 text-zinc-500" />
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen ${theme === "dark" ? "dark bg-black text-white" : "bg-zinc-100 text-zinc-900"}`}>
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_24%),linear-gradient(180deg,#09090b_0%,#000_50%,#050505_100%)] dark:block hidden" />
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.10),transparent_28%),linear-gradient(180deg,#fafafa_0%,#f4f4f5_100%)] dark:hidden block" />

      <audio ref={audioRef} preload="metadata" />

      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-black/30 p-5 backdrop-blur-2xl lg:block">
          <div className="flex items-center gap-3 px-2 pb-8">
            <LogoPulse spinning={isPlaying} />
            <div>
              <div className="text-lg font-bold tracking-tight">Azaad</div>
              <div className="text-xs text-zinc-400">Premium streaming frontend</div>
            </div>
          </div>

          <div className="space-y-2">
            <NavButton id="home" icon={Home} label="Home" />
            <NavButton id="search" icon={Search} label="Search" />
            <NavButton id="library" icon={Library} label="Your Library" />
            <NavButton id="favorites" icon={Heart} label="Favorites" />
            <NavButton id="profile" icon={User} label="Profile" />
          </div>

          <Card className="mt-6 rounded-3xl border-white/10 bg-white/[0.04] text-white shadow-2xl shadow-black/20">
            <CardContent className="space-y-4 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Quick stats</div>
                  <div className="text-xs text-zinc-400">Live from your Railway backend</div>
                </div>
                <Sparkles className="h-4 w-4 text-emerald-300" />
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/5 p-3">
                  <div className="text-xl font-bold">{songs.length}</div>
                  <div className="text-zinc-400">Tracks</div>
                </div>
                <div className="rounded-2xl bg-white/5 p-3">
                  <div className="text-xl font-bold">{favorites.length}</div>
                  <div className="text-zinc-400">Favorites</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between px-2 text-sm">
              <span className="font-semibold text-zinc-200">Playlists</span>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="rounded-full p-1 text-zinc-400 hover:bg-white/10 hover:text-white">
                    <Plus className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="border-white/10 bg-zinc-950 text-white">
                  <DialogHeader>
                    <DialogTitle>Create playlist</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input value={newPlaylistName} onChange={(e) => setNewPlaylistName(e.target.value)} className="border-white/10 bg-white/5" />
                    <Button onClick={addPlaylist} className="w-full rounded-2xl bg-emerald-400 text-black hover:bg-emerald-300">
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="h-[320px] rounded-2xl border border-white/10 bg-white/[0.03] p-2">
              <div className="space-y-2 p-1">
                {playlists.map((playlist) => (
                  <button key={playlist.id} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-white/5">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/20 to-cyan-400/20">
                      <ListMusic className="h-5 w-5 text-emerald-300" />
                    </div>
                    <div>
                      <div className="font-medium text-white">{playlist.name}</div>
                      <div className="text-xs text-zinc-400">{playlist.songIds.length} tracks</div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col pb-36">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-black/20 px-4 py-4 backdrop-blur-2xl md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-2xl font-bold tracking-tight">{view === "home" ? "Good evening" : view.charAt(0).toUpperCase() + view.slice(1)}</div>
                <div className="text-sm text-zinc-400">Startup-grade music experience connected to your Railway backend.</div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative w-full min-w-[220px] max-w-md lg:w-80">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <Input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search songs, artists, albums, vibes"
                    className="rounded-2xl border-white/10 bg-white/5 pl-10 text-white placeholder:text-zinc-500"
                  />
                </div>
                <Input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-40 rounded-2xl border-white/10 bg-white/5 text-white"
                  placeholder="API key"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                  className="rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                >
                  {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <Button onClick={() => setQueueOpen(true)} className="rounded-2xl bg-emerald-400 text-black hover:bg-emerald-300">
                  <ListMusic className="mr-2 h-4 w-4" /> Queue
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 space-y-8 px-4 py-6 md:px-6">
            {error && (
              <Card className="rounded-3xl border-amber-500/20 bg-amber-500/10 text-amber-100">
                <CardContent className="p-4 text-sm">
                  Live API failed, so demo tracks are loaded. Check your backend response or API key if this is unexpected.
                </CardContent>
              </Card>
            )}

            {view === "home" && (
              <>
                <section className="grid gap-4 xl:grid-cols-[1.4fr_0.9fr]">
                  <Card className="overflow-hidden rounded-[28px] border-white/10 bg-white/[0.05] text-white shadow-2xl shadow-black/20">
                    <CardContent className="relative p-6 md:p-8">
                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.25),transparent_30%)]" />
                      <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
                        <div className="max-w-xl">
                          <Badge className="mb-4 rounded-full bg-emerald-400/15 text-emerald-300">Azaad Premium UI</Badge>
                          <h1 className="text-4xl font-black tracking-tight md:text-5xl">A music product that feels launch-ready.</h1>
                          <p className="mt-4 max-w-lg text-zinc-300">
                            Premium surfaces, fast playback, local playlist persistence, and a frontend contract already tuned to your Railway backend.
                          </p>
                          <div className="mt-6 flex flex-wrap gap-3">
                            <Button onClick={() => currentSong && playSong(currentSong)} className="rounded-2xl bg-emerald-400 px-6 text-black hover:bg-emerald-300">
                              <Play className="mr-2 h-4 w-4 fill-current" /> Play now
                            </Button>
                            <Button variant="ghost" onClick={() => setView("library")} className="rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10">
                              Open library
                            </Button>
                          </div>
                        </div>
                        <motion.div animate={isPlaying ? { rotate: 360 } : { rotate: 0 }} transition={isPlaying ? { duration: 12, repeat: Infinity, ease: "linear" } : { duration: 0.4 }} className="mx-auto h-48 w-48 overflow-hidden rounded-full border border-white/10 bg-black p-3 shadow-2xl shadow-emerald-950/30">
                          <img src={currentSong?.coverUrl || defaultCover} alt="Now playing" className="h-full w-full rounded-full object-cover" />
                        </motion.div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="rounded-[28px] border-white/10 bg-white/[0.05] text-white shadow-2xl shadow-black/20">
                    <CardContent className="space-y-5 p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-lg font-semibold">Now playing</div>
                          <div className="text-sm text-zinc-400">Live player status</div>
                        </div>
                        <Equalizer active={isPlaying} />
                      </div>
                      {currentSong ? (
                        <>
                          <div className="flex items-center gap-4">
                            <img src={currentSong.coverUrl} alt={currentSong.title} className="h-20 w-20 rounded-3xl object-cover" />
                            <div className="min-w-0">
                              <div className="truncate text-xl font-bold">{currentSong.title}</div>
                              <div className="truncate text-sm text-zinc-400">{currentSong.artist}</div>
                              <div className="mt-2 text-xs text-zinc-500">{currentSong.album}</div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs text-zinc-500">
                              <span>{formatTime(progress)}</span>
                              <span>{formatTime(duration || currentSong.duration || 0)}</span>
                            </div>
                            <Slider
                              value={[duration ? (progress / duration) * 100 : 0]}
                              onValueChange={(value) => {
                                const audio = audioRef.current;
                                if (audio && duration) {
                                  audio.currentTime = (value[0] / 100) * duration;
                                }
                              }}
                            />
                          </div>
                        </>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-zinc-400">No track selected yet.</div>
                      )}
                    </CardContent>
                  </Card>
                </section>

                <section>
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-xl font-bold">Featured picks</div>
                    <Button variant="ghost" className="rounded-full text-zinc-400 hover:text-white">See all</Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                    {(featuredSongs.length ? featuredSongs : songs.slice(0, 6)).map((song) => (
                      <SongCard key={song.id} song={song} />
                    ))}
                  </div>
                </section>

                <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                  <Card className="rounded-[28px] border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <div className="mb-4 flex items-center justify-between">
                        <div className="text-xl font-bold">Trending now</div>
                        <Radio className="h-4 w-4 text-rose-300" />
                      </div>
                      <div className="space-y-1">
                        {(trendingSongs.length ? trendingSongs : songs.slice(0, 8)).map((song, index) => (
                          <SongRow key={song.id} song={song} index={index} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <div className="space-y-6">
                    <Card className="rounded-[28px] border-white/10 bg-white/[0.04] text-white">
                      <CardContent className="p-5">
                        <div className="mb-4 flex items-center gap-2 text-xl font-bold">
                          <Clock3 className="h-5 w-5 text-cyan-300" /> Recently played
                        </div>
                        <div className="space-y-3">
                          {(recentSongs.length ? recentSongs : songs.slice(0, 4)).map((song) => (
                            <button key={song.id} onClick={() => playSong(song)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left hover:bg-white/5">
                              <img src={song.coverUrl} alt={song.title} className="h-12 w-12 rounded-2xl object-cover" />
                              <div className="min-w-0">
                                <div className="truncate font-medium">{song.title}</div>
                                <div className="truncate text-xs text-zinc-400">{song.artist}</div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="rounded-[28px] border-white/10 bg-gradient-to-br from-emerald-500/10 via-white/[0.03] to-cyan-500/10 text-white">
                      <CardContent className="p-5">
                        <div className="mb-2 text-xl font-bold">Built for the next release</div>
                        <p className="text-sm text-zinc-300">
                          This frontend is already shaped for playlists, favorites, recent history, search, queue, and premium player motion. Add backend user endpoints next and it becomes fully account-driven.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </section>
              </>
            )}

            {view === "search" && (
              <section className="space-y-5">
                <div>
                  <div className="text-2xl font-bold">Search</div>
                  <div className="text-sm text-zinc-400">Fast filtered discovery across your live catalog.</div>
                </div>
                <Card className="rounded-[28px] border-white/10 bg-white/[0.04] text-white">
                  <CardContent className="p-5">
                    <div className="space-y-1">
                      {filteredSongs.map((song, index) => (
                        <SongRow key={song.id} song={song} index={index} />
                      ))}
                      {!filteredSongs.length && !loading && (
                        <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-zinc-400">No songs match your search.</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {view === "library" && (
              <section className="space-y-5">
                <div>
                  <div className="text-2xl font-bold">Your Library</div>
                  <div className="text-sm text-zinc-400">Playlists and full catalog in one premium view.</div>
                </div>
                <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                  <Card className="rounded-[28px] border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <div className="mb-4 text-xl font-bold">Playlists</div>
                      <div className="space-y-2">
                        {playlists.map((playlist) => (
                          <div key={playlist.id} className="rounded-2xl bg-white/[0.04] p-4">
                            <div className="font-semibold">{playlist.name}</div>
                            <div className="mt-1 text-xs text-zinc-400">{playlist.songIds.length} tracks saved</div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[28px] border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <div className="mb-4 text-xl font-bold">All tracks</div>
                      <div className="space-y-1">
                        {songs.map((song, index) => (
                          <SongRow key={song.id} song={song} index={index} />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {view === "favorites" && (
              <section className="space-y-5">
                <div>
                  <div className="text-2xl font-bold">Favorites</div>
                  <div className="text-sm text-zinc-400">The tracks you keep coming back to.</div>
                </div>
                <Card className="rounded-[28px] border-white/10 bg-white/[0.04] text-white">
                  <CardContent className="p-5">
                    <div className="space-y-1">
                      {favoriteSongs.map((song, index) => (
                        <SongRow key={song.id} song={song} index={index} />
                      ))}
                      {!favoriteSongs.length && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-zinc-400">No favorites yet. Heart a few songs to build this section.</div>}
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}

            {view === "profile" && (
              <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <Card className="rounded-[28px] border-white/10 bg-white/[0.04] text-white">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400 text-2xl font-black text-black">
                        A
                      </div>
                      <div>
                        <div className="text-2xl font-bold">Azaad Listener</div>
                        <div className="text-sm text-zinc-400">Premium frontend preview profile</div>
                      </div>
                    </div>
                    <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl bg-white/[0.04] p-4">
                        <div className="text-xl font-bold">{songs.length}</div>
                        <div className="text-zinc-400">Catalog size</div>
                      </div>
                      <div className="rounded-2xl bg-white/[0.04] p-4">
                        <div className="text-xl font-bold">{recent.length}</div>
                        <div className="text-zinc-400">Recent plays</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="rounded-[28px] border-white/10 bg-white/[0.04] text-white">
                  <CardContent className="p-6">
                    <div className="text-xl font-bold">Integration status</div>
                    <div className="mt-4 space-y-3 text-sm text-zinc-300">
                      <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">Connected to <span className="font-semibold">{API_BASE}</span> via <span className="font-semibold">x-api-key</span>.</div>
                      <div className="rounded-2xl border border-white/10 p-4">Favorites, recent plays, theme, playlists, and volume are persisted locally right now.</div>
                      <div className="rounded-2xl border border-white/10 p-4">Once you expose auth, profile, favorites, and playlist endpoints, these can be promoted from local state to full account sync with minimal UI change.</div>
                    </div>
                  </CardContent>
                </Card>
              </section>
            )}
          </div>
        </main>
      </div>

      <AnimatePresence>
        {queueOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ x: 420 }} animate={{ x: 0 }} exit={{ x: 420 }} transition={{ type: "spring", damping: 28, stiffness: 220 }} className="absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-zinc-950/95 p-5 text-white shadow-2xl shadow-black/50">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <div className="text-xl font-bold">Queue</div>
                  <div className="text-sm text-zinc-400">Current filtered playback list</div>
                </div>
                <button onClick={() => setQueueOpen(false)} className="rounded-full p-2 text-zinc-400 hover:bg-white/10 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <ScrollArea className="h-[calc(100vh-120px)] pr-2">
                <div className="space-y-2">
                  {currentQueue.map((song, index) => (
                    <button key={song.id} onClick={() => playSong(song)} className={`flex w-full items-center gap-3 rounded-2xl p-3 text-left transition ${song.id === currentSongId ? "bg-emerald-400/10" : "hover:bg-white/5"}`}>
                      <div className="w-6 text-xs text-zinc-500">{index + 1}</div>
                      <img src={song.coverUrl} alt={song.title} className="h-12 w-12 rounded-2xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{song.title}</div>
                        <div className="truncate text-xs text-zinc-400">{song.artist}</div>
                      </div>
                      {song.id === currentSongId && <Equalizer active={isPlaying} />}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/70 px-4 py-3 backdrop-blur-2xl md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 lg:w-[28%]">
            <img src={currentSong?.coverUrl || defaultCover} alt={currentSong?.title || "No track"} className={`h-14 w-14 rounded-2xl object-cover shadow-xl ${isPlaying ? "ring-2 ring-emerald-400/40" : ""}`} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{currentSong?.title || "Nothing playing"}</div>
              <div className="truncate text-sm text-zinc-400">{currentSong?.artist || "Choose a track from the catalog"}</div>
            </div>
            <button onClick={() => currentSong && toggleFavorite(currentSong.id)} className={`rounded-full p-2 ${currentSong && favorites.includes(currentSong.id) ? "text-emerald-300" : "text-zinc-500 hover:text-white"}`}>
              <Heart className={`h-4 w-4 ${currentSong && favorites.includes(currentSong.id) ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="flex flex-1 flex-col items-center gap-3 lg:max-w-2xl">
            <div className="flex items-center gap-2 md:gap-4">
              <button onClick={() => setShuffle((s) => !s)} className={`rounded-full p-2 ${shuffle ? "text-emerald-300" : "text-zinc-400 hover:text-white"}`}>
                <Shuffle className="h-4 w-4" />
              </button>
              <button onClick={() => stepSong("prev")} className="rounded-full p-2 text-zinc-300 hover:bg-white/10 hover:text-white">
                <SkipBack className="h-5 w-5 fill-current" />
              </button>
              <button onClick={togglePlay} className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black shadow-xl transition hover:scale-105">
                {isPlaying ? <Pause className="h-5 w-5 fill-current" /> : <Play className="h-5 w-5 fill-current" />}
              </button>
              <button onClick={() => stepSong("next")} className="rounded-full p-2 text-zinc-300 hover:bg-white/10 hover:text-white">
                <SkipForward className="h-5 w-5 fill-current" />
              </button>
              <button
                onClick={() => setRepeat((r) => (r === "off" ? "all" : r === "all" ? "one" : "off"))}
                className={`rounded-full p-2 ${repeat !== "off" ? "text-emerald-300" : "text-zinc-400 hover:text-white"}`}
              >
                <Repeat className="h-4 w-4" />
              </button>
            </div>
            <div className="flex w-full items-center gap-3 text-xs text-zinc-500">
              <span>{formatTime(progress)}</span>
              <Slider
                value={[duration ? (progress / duration) * 100 : 0]}
                onValueChange={(value) => {
                  const audio = audioRef.current;
                  if (audio && duration) audio.currentTime = (value[0] / 100) * duration;
                }}
              />
              <span>{formatTime(duration || currentSong?.duration || 0)}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 lg:w-[28%]">
            <Equalizer active={isPlaying} />
            <Disc3 className={`h-4 w-4 ${isPlaying ? "animate-spin text-emerald-300" : "text-zinc-500"}`} />
            <Volume2 className="h-4 w-4 text-zinc-400" />
            <div className="w-28">
              <Slider value={[volume * 100]} onValueChange={(value) => setVolume(value[0] / 100)} />
            </div>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-28 left-4 right-4 z-40 mx-auto flex max-w-md items-center justify-between rounded-3xl border border-white/10 bg-zinc-950/90 p-2 backdrop-blur-2xl lg:hidden">
        {[
          ["home", Home],
          ["search", Search],
          ["library", Library],
          ["favorites", Heart],
          ["profile", User],
        ].map(([id, Icon]) => (
          <button key={id} onClick={() => setView(id)} className={`flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs ${view === id ? "bg-emerald-400/15 text-emerald-300" : "text-zinc-400"}`}>
            <Icon className="h-4 w-4" />
            <span className="capitalize">{id}</span>
          </button>
        ))}
      </nav>

      {loading && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/30 backdrop-blur-sm">
          <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ repeat: Infinity, duration: 1.2 }} className="flex items-center gap-3 rounded-3xl border border-white/10 bg-zinc-950/90 px-5 py-4 text-white shadow-2xl">
            <LogoPulse spinning />
            <div>
              <div className="font-semibold">Loading Azaad</div>
              <div className="text-sm text-zinc-400">Fetching your live catalog…</div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
