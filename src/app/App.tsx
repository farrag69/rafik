import { useState, useEffect, useCallback, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Toaster } from 'sonner';
import { BottomNav } from './components/BottomNav';
import { HomeScreen } from './components/HomeScreen';
import { QuranScreen } from './components/QuranScreen';
import { WorshipScreen } from './components/WorshipScreen';
import { PrayerScreen } from './components/PrayerScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { QiblaScreen } from './components/QiblaScreen';
import { AudioPlayer } from './components/AudioPlayer';

export type Tab = 'home' | 'quran' | 'worship' | 'prayer' | 'settings';
export type FontSize = 'small' | 'medium' | 'large';

export interface PrayerTimings {
  Fajr: string;
  Dhuhr: string;
  Asr: string;
  Maghrib: string;
  Isha: string;
}

export interface AudioState {
  surahNumber: number;
  surahName: string;
  reciterId: string;
  reciterName: string;
}

export interface AppState {
  isDark: boolean;
  toggleDark: () => void;
  fontSize: FontSize;
  setFontSize: (s: FontSize) => void;
  prayerStats: PrayerStats;
  setPrayerStats: (s: PrayerStats) => void;
  azkarProgress: AzkarProgress;
  setAzkarProgress: (p: AzkarProgress) => void;
  quranProgress: QuranProgress;
  setQuranProgress: (p: QuranProgress) => void;
  tasbeehCount: number;
  setTasbeehCount: (n: number) => void;
  setActiveTab: (tab: Tab) => void;
  // Prayer times
  prayerTimes: PrayerTimings | null;
  prayerTimesLoading: boolean;
  locationName: string;
  prayerMethod: number;
  setPrayerMethod: (m: number) => void;
  // Qibla
  setShowQibla: (v: boolean) => void;
  // Audio
  audioState: AudioState | null;
  setAudioState: (s: AudioState | null) => void;
}

export interface PrayerStats {
  fajr: boolean;
  dhuhr: boolean;
  asr: boolean;
  maghrib: boolean;
  isha: boolean;
}

export interface AzkarProgress {
  morning: boolean;
  evening: boolean;
  sleep: boolean;
  afterPrayer: boolean;
}

export interface QuranProgress {
  surahNumber: number;
  surahName: string;
  verseNumber: number;
  pageNumber: number;
}

// Method index → aladhan API method number
const METHOD_IDS: Record<number, number> = { 0: 4, 1: 1, 2: 3, 3: 2 };

function todayKey(method: number) {
  const d = new Date();
  return `prayerTimes_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}_m${method}`;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [isDark, setIsDark] = useState(false);
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  const [prayerStats, setPrayerStats] = useState<PrayerStats>({
    fajr: true, dhuhr: true, asr: false, maghrib: false, isha: false,
  });
  const [azkarProgress, setAzkarProgress] = useState<AzkarProgress>({
    morning: true, evening: false, sleep: false, afterPrayer: false,
  });
  const [quranProgress, setQuranProgress] = useState<QuranProgress>({
    surahNumber: 2, surahName: 'البقرة', verseNumber: 255, pageNumber: 42,
  });
  const [tasbeehCount, setTasbeehCount] = useState(47);

  // Prayer times
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimings | null>(null);
  const [prayerTimesLoading, setPrayerTimesLoading] = useState(false);
  const [locationName, setLocationName] = useState('القاهرة');
  const [prayerMethod, setPrayerMethodState] = useState(0);

  // Qibla + Audio
  const [showQibla, setShowQibla] = useState(false);
  const [audioState, setAudioState] = useState<AudioState | null>(null);

  const latRef = useRef(30.0444);
  const lngRef = useRef(31.2357);
  const locNameRef = useRef('القاهرة');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Apply font size to document root so all relative font sizes scale
  useEffect(() => {
    const sizeMap: Record<FontSize, string> = {
      small: '14px',
      medium: '16px',
      large: '18px',
    };
    document.documentElement.style.setProperty('--font-size', sizeMap[fontSize]);
  }, [fontSize]);

  const loadTimings = useCallback(async (lat: number, lng: number, method: number, name: string) => {
    const key = todayKey(method);
    const cached = localStorage.getItem(key);
    if (cached) {
      try {
        const { timings, locName } = JSON.parse(cached);
        setPrayerTimes(timings);
        setLocationName(locName ?? name);
        return;
      } catch { /* ignore */ }
    }
    setPrayerTimesLoading(true);
    try {
      const apiMethod = METHOD_IDS[method] ?? 4;
      const res = await fetch(
        `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=${apiMethod}`
      );
      const json = await res.json();
      if (json.code === 200) {
        const t = json.data.timings;
        const timings: PrayerTimings = {
          Fajr: t.Fajr.slice(0, 5),
          Dhuhr: t.Dhuhr.slice(0, 5),
          Asr: t.Asr.slice(0, 5),
          Maghrib: t.Maghrib.slice(0, 5),
          Isha: t.Isha.slice(0, 5),
        };
        setPrayerTimes(timings);
        setLocationName(name);
        localStorage.setItem(key, JSON.stringify({ timings, locName: name }));
      }
    } catch { /* keep null */ }
    finally { setPrayerTimesLoading(false); }
  }, []);

  const initLocation = useCallback((method: number) => {
    const tryFetch = (lat: number, lng: number, name: string) => {
      latRef.current = lat;
      lngRef.current = lng;
      locNameRef.current = name;
      loadTimings(lat, lng, method, name);
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => tryFetch(pos.coords.latitude, pos.coords.longitude, 'موقعي الحالي'),
        () => tryFetch(30.0444, 31.2357, 'القاهرة'),
        { timeout: 7000 }
      );
    } else {
      tryFetch(30.0444, 31.2357, 'القاهرة');
    }
  }, [loadTimings]);

  // Initial fetch
  useEffect(() => { initLocation(0); }, []);

  const setPrayerMethod = useCallback((m: number) => {
    setPrayerMethodState(m);
    loadTimings(latRef.current, lngRef.current, m, locNameRef.current);
  }, [loadTimings]);

  const appState: AppState = {
    isDark, toggleDark: () => setIsDark(p => !p),
    fontSize, setFontSize,
    prayerStats, setPrayerStats,
    azkarProgress, setAzkarProgress,
    quranProgress, setQuranProgress,
    tasbeehCount, setTasbeehCount,
    setActiveTab,
    prayerTimes, prayerTimesLoading, locationName,
    prayerMethod, setPrayerMethod,
    setShowQibla,
    audioState, setAudioState,
  };

  const screens: Record<Tab, JSX.Element> = {
    home: <HomeScreen {...appState} />,
    quran: <QuranScreen {...appState} />,
    worship: <WorshipScreen {...appState} />,
    prayer: <PrayerScreen {...appState} />,
    settings: <SettingsScreen {...appState} />,
  };

  return (
    <div
      dir="rtl"
      className="size-full flex items-start justify-center bg-[#2A3540] dark:bg-[#070A0D]"
      style={{ fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" }}
    >
      <div className="relative w-full max-w-[430px] h-screen bg-background flex flex-col overflow-hidden shadow-2xl">
        <div className="flex-1 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
              className={`min-h-full ${audioState ? 'pb-44' : 'pb-28'}`}
            >
              {screens[activeTab]}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Nav */}
        <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Mini Audio Player — above nav */}
        <AnimatePresence>
          {audioState && (
            <AudioPlayer
              audioState={audioState}
              onClose={() => setAudioState(null)}
              onStateChange={setAudioState}
            />
          )}
        </AnimatePresence>

        {/* Qibla full-screen overlay */}
        <AnimatePresence>
          {showQibla && (
            <QiblaScreen onClose={() => setShowQibla(false)} />
          )}
        </AnimatePresence>
      </div>

      <Toaster
        position="top-center"
        dir="rtl"
        toastOptions={{
          style: { fontFamily: "'Cairo', sans-serif", fontSize: 14 },
        }}
      />
    </div>
  );
}
