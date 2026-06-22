import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X, Play, Pause, SkipBack, SkipForward, ChevronUp,
  Loader2, AlertCircle, Repeat, ChevronRight, CircleStop,
} from 'lucide-react';
import { AudioState } from '../App';

// ── Surah limit ───────────────────────────────────────────────────────────────
const TOTAL_SURAHS = 114;

// ── Surah names (index 0 = unused, index 1 = الفاتحة … index 114 = الناس) ──
const SURAH_NAMES: string[] = [
  '',
  'الفاتحة','البقرة','آل عمران','النساء','المائدة','الأنعام','الأعراف','الأنفال',
  'التوبة','يونس','هود','يوسف','الرعد','إبراهيم','الحجر','النحل','الإسراء',
  'الكهف','مريم','طه','الأنبياء','الحج','المؤمنون','النور','الفرقان','الشعراء',
  'النمل','القصص','العنكبوت','الروم','لقمان','السجدة','الأحزاب','سبأ','فاطر',
  'يس','الصافات','ص','الزمر','غافر','فصلت','الشورى','الزخرف','الدخان',
  'الجاثية','الأحقاف','محمد','الفتح','الحجرات','ق','الذاريات','الطور','النجم',
  'القمر','الرحمن','الواقعة','الحديد','المجادلة','الحشر','الممتحنة','الصف',
  'الجمعة','المنافقون','التغابن','الطلاق','التحريم','الملك','القلم','الحاقة',
  'المعارج','نوح','الجن','المزمل','المدثر','القيامة','الإنسان','المرسلات',
  'النبأ','النازعات','عبس','التكوير','الانفطار','المطففين','الانشقاق','البروج',
  'الطارق','الأعلى','الغاشية','الفجر','البلد','الشمس','الليل','الضحى',
  'الشرح','التين','العلق','القدر','البينة','الزلزلة','العاديات','القارعة',
  'التكاثر','العصر','الهمزة','الفيل','قريش','الماعون','الكوثر','الكافرون',
  'النصر','المسد','الإخلاص','الفلق','الناس',
];

function getSurahName(num: number): string {
  return SURAH_NAMES[num] ?? `السورة ${toAr(num)}`;
}

// ── GLOBAL singleton: guarantees only one <Audio> element ever plays ──────────
// Keeps a reference outside any React component tree so it survives re-mounts.
let _globalAudio: HTMLAudioElement | null = null;
function getGlobalAudio(): HTMLAudioElement {
  if (!_globalAudio) {
    _globalAudio = new Audio();
    _globalAudio.preload = 'auto';
  }
  return _globalAudio;
}

// ── Playback modes ────────────────────────────────────────────────────────────
type PlayMode = 'stop' | 'repeat' | 'next';
const PLAY_MODES: PlayMode[] = ['stop', 'repeat', 'next'];
const PLAY_MODE_LABELS: Record<PlayMode, string> = {
  stop: 'إيقاف',
  repeat: 'تكرار',
  next: 'التالي',
};
const PLAY_MODE_ICONS: Record<PlayMode, React.ReactNode> = {
  stop: <CircleStop size={15} />,
  repeat: <Repeat size={15} />,
  next: <ChevronRight size={15} />,
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function toAr(n: number | string) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

function formatTime(sec: number) {
  if (!isFinite(sec)) return '٠:٠٠';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${toAr(m)}:${String(s).padStart(2, '0').replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d])}`;
}

// ── URL builders ──────────────────────────────────────────────────────────────
function primaryUrl(reciterId: string, surahNum: number) {
  const editionMap: Record<string, string> = {
    'Abdul_Basit_Abdu_Samad_128kbps': 'ar.abdulbasitmurattal',
    'Mishary_Rashid_Alafasy_128kbps': 'ar.alafasy',
    'Saad_Al_Ghamdi_128kbps': 'ar.saadalghamdi',
  };
  const edition = editionMap[reciterId] ?? 'ar.alafasy';
  return `https://cdn.islamic.network/quran/audio-surah/128/${edition}/${surahNum}.mp3`;
}

function fallbackUrl(reciterId: string, surahNum: number) {
  const paddedSurah = String(surahNum).padStart(3, '0');
  const pathMap: Record<string, string> = {
    'Abdul_Basit_Abdu_Samad_128kbps': 'abdul_basit_murattal',
    'Mishary_Rashid_Alafasy_128kbps': 'mishaari_raashid_al_3afaasee',
    'Saad_Al_Ghamdi_128kbps': 'sa3d_al-ghaamidi/complete',
  };
  const path = pathMap[reciterId] ?? 'mishaari_raashid_al_3afaasee';
  return `https://download.quranicaudio.com/quran/${path}/${paddedSurah}.mp3`;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  audioState: AudioState;
  onClose: () => void;
  onStateChange: (s: AudioState | null) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function AudioPlayer({ audioState, onClose, onStateChange }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>('stop');

  // Store latest audioState in a ref so event handlers always see fresh values
  const audioStateRef = useRef(audioState);
  audioStateRef.current = audioState;

  const playModeRef = useRef(playMode);
  playModeRef.current = playMode;

  const onStateChangeRef = useRef(onStateChange);
  onStateChangeRef.current = onStateChange;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const goPrevRef = useRef<() => void>(() => {});
  const goNextRef = useRef<() => void>(() => {});

  // ── Stop audio and clean up when player component unmounts ──────────────────
  useEffect(() => {
    return () => {
      const audio = getGlobalAudio();
      audio.pause();
      audio.src = '';
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'none';
      }
    };
  }, []);

  // ── Load track whenever surah or reciter changes ──────────────────────────
  useEffect(() => {
    const audio = getGlobalAudio();

    // Immediately stop whatever was playing before
    audio.pause();

    setLoading(true);
    setError(false);
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    let usedFallback = false;

    // Media Session Position state helper
    const updatePositionState = () => {
      if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
        try {
          const d = audio.duration;
          const t = audio.currentTime;
          if (isFinite(d) && d > 0 && isFinite(t)) {
            navigator.mediaSession.setPositionState({
              duration: d,
              playbackRate: audio.playbackRate,
              position: t
            });
          }
        } catch (e) {
          console.warn('setPositionState error', e);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
      updatePositionState();
    };
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      updatePositionState();
    };
    const handleWaiting = () => setLoading(true);
    const handlePlaying = () => setLoading(false);

    const handlePlay = () => {
      setIsPlaying(true);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'playing';
      }
    };
    const handlePause = () => {
      setIsPlaying(false);
      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = 'paused';
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      const mode = playModeRef.current;
      const state = audioStateRef.current;
      if (mode === 'repeat') {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (mode === 'next') {
        if (state.surahNumber < TOTAL_SURAHS) {
          const nextNum = state.surahNumber + 1;
          onStateChangeRef.current({ ...state, surahNumber: nextNum, surahName: getSurahName(nextNum) });
        } else {
          // Last surah — just stop
          onCloseRef.current();
        }
      }
    };

    const handleError = () => {
      if (!usedFallback) {
        usedFallback = true;
        const fb = fallbackUrl(audioStateRef.current.reciterId, audioStateRef.current.surahNumber);
        audio.src = fb;
        audio.load();
      } else {
        setError(true);
        setLoading(false);
      }
    };

    const handleCanPlay = () => {
      setLoading(false);
      audio.play().catch(() => {});
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('playing', handlePlaying);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // ── Setup Media Session API ──
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: audioState.surahName || `السورة ${toAr(audioState.surahNumber)}`,
          artist: audioState.reciterName,
          album: 'رفيق في الدرب',
          artwork: [
            { src: 'https://cdn.islamic.network/quran/images/512.png', sizes: '512x512', type: 'image/png' },
          ]
        });

        navigator.mediaSession.setActionHandler('play', () => {
          audio.play().catch(() => {});
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          audio.pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          goPrevRef.current();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          goNextRef.current();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (details.seekTime !== undefined && isFinite(details.seekTime)) {
            audio.currentTime = details.seekTime;
            updatePositionState();
          }
        });
      } catch (e) {
        console.warn('Media Session configuration error', e);
      }
    }

    // Start loading the new track
    audio.src = primaryUrl(audioState.reciterId, audioState.surahNumber);
    audio.load();

    return () => {
      // Remove listeners so old handlers don't fire on the next track
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('playing', handlePlaying);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);

      // Clean up Media Session handlers
      if ('mediaSession' in navigator) {
        try {
          navigator.mediaSession.setActionHandler('play', null);
          navigator.mediaSession.setActionHandler('pause', null);
          navigator.mediaSession.setActionHandler('previoustrack', null);
          navigator.mediaSession.setActionHandler('nexttrack', null);
          navigator.mediaSession.setActionHandler('seekto', null);
        } catch (e) {}
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioState.surahNumber, audioState.reciterId]);

  // ── Controls ──────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const audio = getGlobalAudio();
    if (audio.paused) {
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, []);

  const seek = useCallback((pct: number) => {
    const audio = getGlobalAudio();
    if (!isFinite(audio.duration)) return;
    audio.currentTime = pct * audio.duration;
  }, []);

  const goPrev = useCallback(() => {
    const state = audioStateRef.current;
    if (state.surahNumber <= 1) return;
    const prevNum = state.surahNumber - 1;
    onStateChangeRef.current({ ...state, surahNumber: prevNum, surahName: getSurahName(prevNum) });
  }, []);
  goPrevRef.current = goPrev;

  const goNext = useCallback(() => {
    const state = audioStateRef.current;
    if (state.surahNumber >= TOTAL_SURAHS) return;
    const nextNum = state.surahNumber + 1;
    onStateChangeRef.current({ ...state, surahNumber: nextNum, surahName: getSurahName(nextNum) });
  }, []);
  goNextRef.current = goNext;

  const cyclePlayMode = useCallback(() => {
    setPlayMode(prev => {
      const idx = PLAY_MODES.indexOf(prev);
      return PLAY_MODES[(idx + 1) % PLAY_MODES.length];
    });
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Mini Player ── */}
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

      {/* ── Full Player Sheet ── */}
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
              style={{ maxHeight: '88vh' }}
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
                <div className="w-36 h-36 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto my-5">
                  <span style={{ fontSize: 58 }}>📖</span>
                </div>

                {/* Surah info */}
                <div className="text-center mb-5">
                  <h2 className="text-foreground" style={{ fontSize: 20, fontWeight: 800 }}>
                    {audioState.surahName || `السورة ${toAr(audioState.surahNumber)}`}
                  </h2>
                  <p className="text-muted-foreground mt-1" style={{ fontSize: 13 }}>
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
                <div className="mb-4">
                  <div
                    className="h-2 rounded-full bg-muted overflow-hidden cursor-pointer"
                    onClick={e => {
                      const rect = e.currentTarget.getBoundingClientRect();
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

                {/* Main controls */}
                <div className="flex items-center justify-center gap-5 mb-5">
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

                {/* Playback Mode Toggle */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={cyclePlayMode}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl border transition-all ${
                      playMode === 'stop'
                        ? 'bg-muted border-border text-muted-foreground'
                        : 'bg-primary/10 border-primary/40 text-primary'
                    }`}
                    style={{ fontSize: 13, fontWeight: 600 }}
                  >
                    <span className="flex items-center">{PLAY_MODE_ICONS[playMode]}</span>
                    <span>{PLAY_MODE_LABELS[playMode]}</span>
                  </button>
                </div>

                {/* Mode hint */}
                <p className="text-center text-muted-foreground mt-2" style={{ fontSize: 11 }}>
                  {playMode === 'stop' && 'يتوقف عند انتهاء السورة'}
                  {playMode === 'repeat' && 'يعيد السورة من البداية تلقائياً'}
                  {playMode === 'next' && 'ينتقل للسورة التالية تلقائياً'}
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
