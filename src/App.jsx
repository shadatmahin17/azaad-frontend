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
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { API_BASE, DEFAULT_API_KEY } from "@/config/api";
import { STORAGE_KEYS, readStorage, writeStorage } from "@/lib/storage";
import { DEFAULT_COVER, createPlaylist, ensurePlaylists, formatTime, normalizeSong } from "@/lib/music";

function LogoPulse() {
  return (
    <motion.div
      animate={{ rotate: 0 }}
      transition={{ duration: 0.3 }}
      className="relative h-12 w-12 overflow-hidden rounded-2xl bg-transparent shadow-xl shadow-emerald-950/20"
    >
      <img
        src="https://mahin-cloud-storage.s3.ap-southeast-1.amazonaws.com/img/Logo.png"
        alt="Azaad"
        className="h-full w-full rounded-2xl object-contain"
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

function getGreetingByHour(hour) {
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
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
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [queueOpen, setQueueOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("My Playlist");
  const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false);
  const [autoplay, setAutoplay] = useState(true);
  const [currentTime, setCurrentTime] = useState(() => new Date());

  useEffect(() => {
    const storedTheme = readStorage(STORAGE_KEYS.theme, "dark");
    const storedApiKey = readStorage(STORAGE_KEYS.apiKey, DEFAULT_API_KEY);
    const storedFavorites = readStorage(STORAGE_KEYS.favorites, []);
    const storedRecent = readStorage(STORAGE_KEYS.recent, []);
    const storedPlaylists = ensurePlaylists(readStorage(STORAGE_KEYS.playlists, [createPlaylist("Liked Collection")]));
    const storedVolume = readStorage(STORAGE_KEYS.volume, 0.8);
    const storedAutoplay = readStorage(STORAGE_KEYS.autoplay, true);

    setTheme(storedTheme);
    setApiKey(storedApiKey);
    setFavorites(storedFavorites);
    setRecent(storedRecent);
    setPlaylists(storedPlaylists);
    setVolume(storedVolume);
    setAutoplay(storedAutoplay);
  }, []);

  useEffect(() => writeStorage(STORAGE_KEYS.theme, theme), [theme]);
  useEffect(() => writeStorage(STORAGE_KEYS.apiKey, apiKey), [apiKey]);
  useEffect(() => writeStorage(STORAGE_KEYS.favorites, favorites), [favorites]);
  useEffect(() => writeStorage(STORAGE_KEYS.recent, recent), [recent]);
  useEffect(() => writeStorage(STORAGE_KEYS.playlists, ensurePlaylists(playlists)), [playlists]);
  useEffect(() => writeStorage(STORAGE_KEYS.volume, volume), [volume]);
  useEffect(() => writeStorage(STORAGE_KEYS.autoplay, autoplay), [autoplay]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    const tick = () => setCurrentTime(new Date());
    const intervalId = window.setInterval(tick, 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const greeting = useMemo(() => getGreetingByHour(currentTime.getHours()), [currentTime]);

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
        const normalized = rawSongs.map((song, index) => normalizeSong(song, index, API_BASE)).filter((song) => song.audioUrl);
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
              coverUrl: DEFAULT_COVER,
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
  const artists = useMemo(() => {
    const grouped = new Map();
    songs.forEach((song) => {
      const key = song.artist?.trim() || "Unknown Artist";
      const current = grouped.get(key) || { name: key, songs: [], albums: new Set(), coverUrl: song.coverUrl };
      current.songs.push(song);
      current.albums.add(song.album);
      grouped.set(key, current);
    });
    return Array.from(grouped.values())
      .map((entry) => ({ ...entry, albums: Array.from(entry.albums) }))
      .sort((a, b) => b.songs.length - a.songs.length || a.name.localeCompare(b.name));
  }, [songs]);
  const recentSongs = useMemo(
    () => recent.map((id) => songs.find((song) => song.id === id)).filter(Boolean).slice(0, 8),
    [recent, songs]
  );
  const favoriteSongs = useMemo(
    () => favorites.map((id) => songs.find((song) => song.id === id)).filter(Boolean),
    [favorites, songs]
  );
  const selectedPlaylist = useMemo(
    () => playlists.find((pl) => pl.id === selectedPlaylistId) || playlists[0] || null,
    [playlists, selectedPlaylistId]
  );
  const selectedPlaylistSongs = useMemo(() => {
    if (!selectedPlaylist) return [];
    return selectedPlaylist.songIds.map((id) => songs.find((song) => song.id === id)).filter(Boolean);
  }, [selectedPlaylist, songs]);

  const currentQueue = useMemo(() => {
    const base = query ? filteredSongs : songs;
    return base;
  }, [filteredSongs, songs, query]);

  const autoplaySuggestions = useMemo(() => {
    if (!songs.length) return [];
    const recentSet = new Set(recent.slice(0, 6));
    const favoriteSet = new Set(favorites);
    const currentArtist = currentSong?.artist?.toLowerCase() || "";
    const currentVibe = currentSong?.vibe?.toLowerCase() || "";

    return songs
      .filter((song) => song.id !== currentSongId)
      .map((song) => {
        let score = 0;
        if (recentSet.has(song.id)) score += 6;
        if (favoriteSet.has(song.id)) score += 7;
        if (song.trending) score += 3;
        if (song.featured) score += 2;
        if (currentArtist && song.artist.toLowerCase() === currentArtist) score += 5;
        if (currentVibe && song.vibe.toLowerCase() === currentVibe) score += 4;
        return { song, score };
      })
      .sort((a, b) => b.score - a.score)
      .map((entry) => entry.song)
      .slice(0, 12);
  }, [songs, currentSongId, currentSong, recent, favorites]);

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
    if (currentSong?.audioUrl && audio.src !== currentSong.audioUrl) {
      audio.src = currentSong.audioUrl;
      setProgress(0);
      setDuration(currentSong.duration || 0);
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
      return true;
    }
    const nextIndex = direction === "next" ? idx + 1 : idx - 1;
    if (nextIndex >= 0 && nextIndex < currentQueue.length) {
      playSong(currentQueue[nextIndex]);
      return true;
    } else if (repeat === "all") {
      playSong(direction === "next" ? currentQueue[0] : currentQueue[currentQueue.length - 1]);
      return true;
    }
    return false;
  };

  const addPlaylist = () => {
    if (!newPlaylistName.trim()) return false;
    const created = createPlaylist(newPlaylistName.trim());
    setPlaylists((prev) => [...prev, created]);
    setSelectedPlaylistId(created.id);
    setNewPlaylistName("My Playlist");
    setCreatePlaylistOpen(false);
    return true;
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

  const renamePlaylist = (playlistId) => {
    const playlist = playlists.find((pl) => pl.id === playlistId);
    const nextName = window.prompt("Rename playlist", playlist?.name || "");
    if (!nextName || !nextName.trim()) return;
    setPlaylists((prev) => prev.map((pl) => (pl.id === playlistId ? { ...pl, name: nextName.trim() } : pl)));
  };

  const removePlaylist = (playlistId) => {
    setPlaylists((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((pl) => pl.id !== playlistId);
      if (playlistId === selectedPlaylistId) {
        setSelectedPlaylistId(next[0]?.id || null);
      }
      return next;
    });
  };

  useEffect(() => {
    if (!playlists.length) return;
    const exists = playlists.some((pl) => pl.id === selectedPlaylistId);
    if (!selectedPlaylistId || !exists) {
      setSelectedPlaylistId(playlists[0].id);
    }
  }, [playlists, selectedPlaylistId]);

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
        const advanced = stepSong("next");
        if (!advanced && autoplay && autoplaySuggestions.length) {
          playSong(autoplaySuggestions[0]);
        }
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
  }, [currentSong, repeat, currentQueue, currentSongId, shuffle, autoplay, autoplaySuggestions]);

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
          <div className="flex items-center justify-center px-2 pb-8">
            <LogoPulse />
          </div>

          <div className="space-y-2">
            <NavButton id="home" icon={Home} label="Home" />
            <NavButton id="search" icon={Search} label="Search" />
            <NavButton id="library" icon={Library} label="Your Library" />
            <NavButton id="artists" icon={Disc3} label="Artists" />
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
              <Dialog open={createPlaylistOpen} onOpenChange={setCreatePlaylistOpen}>
                <DialogTrigger asChild>
                  <button className="rounded-full border border-white/10 bg-white/[0.04] p-1.5 text-zinc-400 transition hover:border-emerald-300/40 hover:bg-emerald-300/10 hover:text-emerald-100">
                    <Plus className="h-4 w-4" />
                  </button>
                </DialogTrigger>
                <DialogContent className="border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 text-white shadow-2xl shadow-black/40">
                  <DialogHeader className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <DialogTitle className="text-xl font-semibold tracking-tight">Create playlist</DialogTitle>
                      <p className="mt-1 text-sm text-zinc-400">Give your playlist a name to get started.</p>
                    </div>
                    <DialogClose asChild>
                      <button className="rounded-lg border border-white/10 p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white" title="Close">
                        <X className="h-4 w-4" />
                      </button>
                    </DialogClose>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Input
                      value={newPlaylistName}
                      onChange={(e) => setNewPlaylistName(e.target.value)}
                      className="h-12 rounded-xl border-white/15 bg-white/5 text-base placeholder:text-zinc-500"
                      placeholder="My Playlist"
                    />
                    <div className="flex items-center gap-2">
                      <DialogClose asChild>
                        <Button variant="ghost" className="h-11 flex-1 rounded-xl border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button onClick={addPlaylist} className="h-11 flex-1 rounded-xl bg-emerald-400 text-base font-semibold text-black hover:bg-emerald-300">
                        Create
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            <ScrollArea className="h-[320px] rounded-2xl border border-white/10 bg-white/[0.03] p-2">
              <div className="space-y-2 p-1">
                {playlists.map((playlist) => {
                  const isSelected = selectedPlaylist?.id === playlist.id;
                  return (
                    <div
                      key={playlist.id}
                      className={`group rounded-2xl border p-2.5 transition ${
                        isSelected
                          ? "border-emerald-300/60 bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 shadow-[0_10px_25px_rgba(16,185,129,0.18)]"
                          : "border-white/5 bg-black/20 hover:border-emerald-400/30 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedPlaylistId(playlist.id)}
                          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left"
                        >
                          <div
                            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                              isSelected
                                ? "bg-gradient-to-br from-emerald-300/25 to-cyan-300/20 text-emerald-200"
                                : "bg-white/[0.06] text-zinc-300 group-hover:text-emerald-200"
                            }`}
                          >
                            <ListMusic className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-semibold tracking-tight text-white">{playlist.name}</div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-400">
                              <span className="rounded-full bg-white/5 px-2 py-0.5">{playlist.songIds.length} tracks</span>
                              <span className="truncate">{new Date(playlist.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </button>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            onClick={() => renamePlaylist(playlist.id)}
                            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                            title="Rename playlist"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => removePlaylist(playlist.id)}
                            disabled={playlists.length <= 1}
                            className="rounded-lg p-2 text-zinc-400 transition hover:bg-white/10 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-40"
                            title={playlists.length <= 1 ? "At least one playlist is required" : "Delete playlist"}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col pb-36">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-black/20 px-4 py-4 backdrop-blur-2xl md:px-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="text-2xl font-bold tracking-tight">{view === "home" ? greeting : view.charAt(0).toUpperCase() + view.slice(1)}</div>
                <div className="text-sm text-zinc-400">Startup-grade music experience connected to your Railway backend.</div>
              </div>
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto lg:justify-end">
                <div className="relative w-full min-w-0 sm:min-w-[220px] sm:max-w-md lg:w-80">
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
                  className="w-full rounded-2xl border-white/10 bg-white/5 text-white sm:w-40"
                  placeholder="API key"
                />
                <div className="flex w-full items-center justify-between gap-3 sm:ml-auto sm:w-auto sm:justify-start">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                    className="shrink-0 rounded-2xl border border-white/10 bg-white/5 text-white hover:bg-white/10"
                  >
                    {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                  </Button>
                  <Button onClick={() => setQueueOpen(true)} className="h-10 shrink-0 rounded-2xl bg-emerald-400 px-4 text-black hover:bg-emerald-300">
                    <ListMusic className="mr-2 h-4 w-4" /> Queue
                  </Button>
                </div>
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
                          <img src={currentSong?.coverUrl || DEFAULT_COVER} alt="Now playing" className="h-full w-full rounded-full object-cover" />
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
                              className="azaad-slider azaad-slider--progress"
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
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
                            <div className="text-xl font-bold">Autoplay radio</div>
                            <p className="text-xs text-zinc-400">Spotify-style smart continuation when queue ends.</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setAutoplay((value) => !value)}
                            className={`rounded-full border ${autoplay ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200" : "border-white/15 bg-white/5 text-zinc-300"}`}
                          >
                            <Radio className="mr-1 h-3.5 w-3.5" />
                            {autoplay ? "On" : "Off"}
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {autoplaySuggestions.slice(0, 3).map((song) => (
                            <button key={song.id} onClick={() => playSong(song)} className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition hover:bg-white/5">
                              <img src={song.coverUrl} alt={song.title} className="h-10 w-10 rounded-xl object-cover" />
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-sm font-medium">{song.title}</div>
                                <div className="truncate text-xs text-zinc-400">{song.artist}</div>
                              </div>
                            </button>
                          ))}
                          {!autoplaySuggestions.length && (
                            <div className="rounded-2xl border border-dashed border-white/10 px-3 py-4 text-xs text-zinc-400">
                              Play more tracks to train your radio suggestions.
                            </div>
                          )}
                        </div>
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
                          <div key={playlist.id} className={`rounded-2xl border bg-white/[0.04] p-4 ${selectedPlaylist?.id === playlist.id ? "border-emerald-400/40" : "border-white/10"}`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="truncate font-semibold">{playlist.name}</div>
                              <Badge variant="secondary" className="rounded-full bg-emerald-500/15 text-emerald-300">{playlist.songIds.length}</Badge>
                            </div>
                            <div className="mt-1 text-xs text-zinc-400">Updated {new Date(playlist.createdAt).toLocaleDateString()}</div>
                            <div className="mt-3 flex items-center gap-2">
                              <Button size="sm" variant="outline" onClick={() => setSelectedPlaylistId(playlist.id)} className="rounded-xl">
                                Open
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => renamePlaylist(playlist.id)} className="rounded-xl border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-white">
                                <Pencil className="mr-1 h-3.5 w-3.5" /> Rename
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removePlaylist(playlist.id)}
                                disabled={playlists.length <= 1}
                                className="rounded-xl border border-white/10 text-zinc-300 hover:bg-white/10 hover:text-rose-300 disabled:opacity-40"
                              >
                                <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="rounded-[28px] border-white/10 bg-white/[0.04] text-white">
                    <CardContent className="p-5">
                      <div className="mb-2 text-xl font-bold">{selectedPlaylist ? `${selectedPlaylist.name} songs` : "Playlist songs"}</div>
                      <div className="mb-4 text-sm text-zinc-400">Open a playlist to see and play its tracks.</div>
                      <div className="space-y-1">
                        {selectedPlaylistSongs.map((song, index) => (
                          <SongRow key={song.id} song={song} index={index} />
                        ))}
                        {!selectedPlaylistSongs.length && (
                          <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-zinc-400">
                            No songs in this playlist yet. Use the <span className="text-zinc-200">Add</span> button on any track to include it.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </section>
            )}

            {view === "artists" && (
              <section className="space-y-5">
                <div>
                  <div className="text-2xl font-bold">Artists</div>
                  <div className="text-sm text-zinc-400">
                    Dynamically generated from <span className="font-medium text-zinc-200">GET /songs</span> metadata.
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {artists.map((artist) => (
                    <Card key={artist.name} className="rounded-[24px] border-white/10 bg-white/[0.04] text-white">
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-center gap-3">
                          <img src={artist.coverUrl || DEFAULT_COVER} alt={artist.name} className="h-14 w-14 rounded-2xl object-cover" />
                          <div className="min-w-0">
                            <div className="truncate text-lg font-semibold">{artist.name}</div>
                            <div className="text-xs text-zinc-400">
                              {artist.songs.length} songs · {artist.albums.length} albums
                            </div>
                          </div>
                        </div>
                        <div className="space-y-1">
                          {artist.songs.slice(0, 5).map((song) => (
                            <button key={song.id} onClick={() => playSong(song)} className="flex w-full items-center justify-between rounded-xl px-2 py-2 text-left text-sm hover:bg-white/5">
                              <span className="truncate pr-3">{song.title}</span>
                              <span className="shrink-0 text-xs text-zinc-500">{song.album}</span>
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {!artists.length && !loading && (
                    <Card className="rounded-[24px] border-white/10 bg-white/[0.04] text-white md:col-span-2 xl:col-span-3">
                      <CardContent className="p-8 text-center text-sm text-zinc-400">
                        No artists found in the current `/songs` response.
                      </CardContent>
                    </Card>
                  )}
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

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-black/75 px-3 py-3 backdrop-blur-2xl sm:px-4 md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3 lg:w-[28%]">
            <img src={currentSong?.coverUrl || DEFAULT_COVER} alt={currentSong?.title || "No track"} className={`h-14 w-14 rounded-2xl object-cover shadow-xl ${isPlaying ? "ring-2 ring-emerald-400/40" : ""}`} />
            <div className="min-w-0">
              <div className="truncate font-semibold text-white">{currentSong?.title || "Nothing playing"}</div>
              <div className="truncate text-sm text-zinc-400">{currentSong?.artist || "Choose a track from the catalog"}</div>
            </div>
            <button onClick={() => currentSong && toggleFavorite(currentSong.id)} className={`rounded-full p-2 ${currentSong && favorites.includes(currentSong.id) ? "text-emerald-300" : "text-zinc-500 hover:text-white"}`}>
              <Heart className={`h-4 w-4 ${currentSong && favorites.includes(currentSong.id) ? "fill-current" : ""}`} />
            </button>
          </div>

          <div className="flex w-full flex-1 flex-col items-center gap-3 lg:max-w-2xl">
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 md:gap-4">
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
              <button
                onClick={() => setAutoplay((value) => !value)}
                className={`rounded-full p-2 ${autoplay ? "text-emerald-300" : "text-zinc-400 hover:text-white"}`}
                title={autoplay ? "Autoplay radio on" : "Autoplay radio off"}
              >
                <Radio className="h-4 w-4" />
              </button>
            </div>
            <div className="flex w-full items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-zinc-500">
              <span>{formatTime(progress)}</span>
              <Slider
                className="azaad-slider azaad-slider--progress"
                value={[duration ? (progress / duration) * 100 : 0]}
                onValueChange={(value) => {
                  const audio = audioRef.current;
                  if (audio && duration) audio.currentTime = (value[0] / 100) * duration;
                }}
              />
              <span>{formatTime(duration || currentSong?.duration || 0)}</span>
            </div>
          </div>

          <div className="hidden items-center justify-end gap-3 sm:flex lg:w-[28%]">
            <Equalizer active={isPlaying} />
            <Disc3 className={`h-4 w-4 ${isPlaying ? "animate-spin text-emerald-300" : "text-zinc-500"}`} />
            <Volume2 className="h-4 w-4 text-zinc-400" />
            <div className="w-24 md:w-28">
              <Slider className="azaad-slider azaad-slider--volume" value={[volume * 100]} onValueChange={(value) => setVolume(value[0] / 100)} />
            </div>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-[92px] left-2 right-2 z-20 sm:bottom-24 sm:left-4 sm:right-4 mx-auto flex max-w-md items-center justify-between rounded-3xl border border-white/10 bg-zinc-950/90 p-2 backdrop-blur-2xl lg:hidden">
        {[
          ["home", Home],
          ["search", Search],
          ["library", Library],
          ["artists", Disc3],
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
            <LogoPulse />
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
