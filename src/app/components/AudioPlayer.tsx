import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, Pause, SkipBack, SkipForward, ChevronUp, Loader2, AlertCircle } from 'lucide-react';
import { AudioState } from '../App';

// ── Surah order for prev/next navigation ─────────────────────────────────────
const TOTAL_SURAHS = 114;

function toAr(n: number | string) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

function formatTime(sec: number) {
  if (!isFinite(sec)) return '٠:٠٠';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${toAr(m)}:${String(s).padStart(2, '0').replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])}`;
}

function audioUrl(reciterId: string, surahNum: number) {
  return `https://cdn.islamic.network/quran/audio/128/${reciterId}/${surahNum}.mp3`;
}

interface Props {
  audioState: AudioState;
  onClose: () => void;
  onStateChange: (s: AudioState | null) => void;
}

export function AudioPlayer({ audioState, onClose, onStateChange }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Reset + load when surah/reciter changes
  useEffect(() => {
    setLoading(true);
    setError(false);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    const audio = new Audio();
    audioRef.current = audio;
    audio.preload = 'metadata';
    audio.src = audioUrl(audioState.reciterId, audioState.surahNumber);

    audio.onloadedmetadata = () => { setDuration(audio.duration); setLoading(false); };
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => { setError(true); setLoading(false); };
    audio.oncanplay = () => {
      setLoading(false);
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    };

    return () => {
      audio.pause();
      audio.src = '';
    };
  }, [audioState.surahNumber, audioState.reciterId]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) { audio.pause(); setIsPlaying(false); }
    else { audio.play().then(() => setIsPlaying(true)).catch(() => {}); }
  }, [isPlaying]);

  const seek = useCallback((pct: number) => {
    const audio = audioRef.current;
    if (!audio || !isFinite(duration)) return;
    audio.currentTime = pct * duration;
  }, [duration]);

  const goPrev = useCallback(() => {
    if (audioState.surahNumber <= 1) return;
    onStateChange({ ...audioState, surahNumber: audioState.surahNumber - 1, surahName: '' });
  }, [audioState, onStateChange]);

  const goNext = useCallback(() => {
    if (audioState.surahNumber >= TOTAL_SURAHS) return;
    onStateChange({ ...audioState, surahNumber: audioState.surahNumber + 1, surahName: '' });
  }, [audioState, onStateChange]);

  const progress = duration > 0 ? currentTime / duration : 0;

  // ── Mini Player ──────────────────────────────────────────────────────────
  return (
    <>
      {/* Mini Player */}
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="absolute left-0 right-0 z-40"
        style={{ bottom: 84 }}
      >
        <div className="mx-3">
          <div
            className="bg-card/98 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden"
            onClick={() => setExpanded(true)}
          >
            {/* Progress line */}
            <div className="h-0.5 bg-muted relative">
              <div
                className="absolute inset-y-0 right-0 bg-primary transition-all"
                style={{ width: `${progress * 100}%` }}
              />
            </div>

            <div className="px-4 py-3 flex items-center gap-3">
              {/* Surah name & reciter */}
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span style={{ fontSize: 18 }}>🎧</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground truncate" style={{ fontSize: 13, fontWeight: 700 }}>
                  {audioState.surahName || `السورة ${toAr(audioState.surahNumber)}`}
                </p>
                <p className="text-muted-foreground truncate" style={{ fontSize: 11 }}>
                  {audioState.reciterName}
                </p>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-2">
                {loading ? (
                  <Loader2 size={18} className="text-primary animate-spin" />
                ) : error ? (
                  <AlertCircle size={18} className="text-destructive" />
                ) : (
                  <button
                    onClick={e => { e.stopPropagation(); togglePlay(); }}
                    className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center"
                  >
                    {isPlaying
                      ? <Pause size={16} className="text-white" fill="white" />
                      : <Play size={16} className="text-white" fill="white" />}
                  </button>
                )}
                <button
                  onClick={e => { e.stopPropagation(); onClose(); }}
                  className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
                >
                  <X size={14} className="text-muted-foreground" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Full Player Sheet */}
      <AnimatePresence>
        {expanded && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 z-50"
              onClick={() => setExpanded(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="absolute bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl border-t border-border"
              style={{ maxHeight: '85vh' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>

              {/* Header */}
              <div className="px-5 pb-2 flex items-center justify-between">
                <button onClick={() => setExpanded(false)} className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center">
                  <ChevronUp size={16} className="text-foreground" />
                </button>
                <p className="text-muted-foreground" style={{ fontSize: 12 }}>المشغّل</p>
                <div className="w-8" />
              </div>

              {/* Content */}
              <div className="px-6 pb-10">
                {/* Album art */}
                <div className="w-40 h-40 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto my-6">
                  <span style={{ fontSize: 64 }}>📖</span>
                </div>

                {/* Surah info */}
                <div className="text-center mb-6">
                  <h2 className="text-foreground" style={{ fontSize: 22, fontWeight: 800 }}>
                    {audioState.surahName || `السورة ${toAr(audioState.surahNumber)}`}
                  </h2>
                  <p className="text-muted-foreground mt-1" style={{ fontSize: 14 }}>
                    {audioState.reciterName}
                  </p>
                  {(loading || error) && (
                    <div className="flex items-center justify-center gap-2 mt-2">
                      {loading && <><Loader2 size={14} className="text-primary animate-spin" /><span className="text-muted-foreground" style={{ fontSize: 12 }}>جاري التحميل...</span></>}
                      {error && <><AlertCircle size={14} className="text-destructive" /><span className="text-destructive" style={{ fontSize: 12 }}>تعذّر تحميل الصوت</span></>}
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div
                    className="h-2 rounded-full bg-muted overflow-hidden cursor-pointer"
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      // RTL: right = 0%, left = 100%
                      const pct = 1 - (e.clientX - rect.left) / rect.width;
                      seek(Math.max(0, Math.min(1, pct)));
                    }}
                  >
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${progress * 100}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-muted-foreground" style={{ fontSize: 11 }}>{formatTime(duration)}</span>
                    <span className="text-muted-foreground" style={{ fontSize: 11 }}>{formatTime(currentTime)}</span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center gap-6">
                  <button
                    onClick={goPrev}
                    disabled={audioState.surahNumber <= 1}
                    className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center disabled:opacity-40"
                  >
                    <SkipForward size={20} className="text-foreground" />
                  </button>

                  <button
                    onClick={togglePlay}
                    disabled={loading || error}
                    className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg disabled:opacity-50"
                  >
                    {loading
                      ? <Loader2 size={24} className="text-white animate-spin" />
                      : isPlaying
                        ? <Pause size={24} className="text-white" fill="white" />
                        : <Play size={24} className="text-white" fill="white" />}
                  </button>

                  <button
                    onClick={goNext}
                    disabled={audioState.surahNumber >= TOTAL_SURAHS}
                    className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center disabled:opacity-40"
                  >
                    <SkipBack size={20} className="text-foreground" />
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
