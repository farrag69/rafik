import type React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, CheckCircle2, Circle, ChevronDown, Loader2, Compass } from 'lucide-react';
import { AppState, PrayerStats, PrayerTimings } from '../App';

const PRAYER_META = [
  { id: 'fajr',    name: 'الفجر',  icon: '🌄', color: '#6366F1' },
  { id: 'dhuhr',   name: 'الظهر',  icon: '☀️', color: '#F59E0B' },
  { id: 'asr',     name: 'العصر',  icon: '🌤', color: '#F97316' },
  { id: 'maghrib', name: 'المغرب', icon: '🌅', color: '#EC4899' },
  { id: 'isha',    name: 'العشاء', icon: '🌙', color: '#8B5CF6' },
];

const SUNNAH = [
  { name: 'قيام الليل' },
  { name: 'الوتر' },
  { name: 'الضحى' },
  { name: 'سنة الفجر' },
];

const WEEKLY = [
  { day: 'ج', done: 5 }, { day: 'خ', done: 5 }, { day: 'أ', done: 4 },
  { day: 'ث', done: 5 }, { day: 'ت', done: 3 }, { day: 'ن', done: 5 },
  { day: 'أح', done: 4 },
];

function toAr(n: number | string) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

function formatCountdown(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${toAr(h)}س ${toAr(m)}د`;
  return `${toAr(m)}د ${toAr(s)}ث`;
}

function buildPrayers(times: PrayerTimings | null) {
  if (!times) {
    return PRAYER_META.map((p, i) => {
      const defaults = [{ h: 4, m: 45 }, { h: 12, m: 15 }, { h: 15, m: 45 }, { h: 18, m: 30 }, { h: 20, m: 0 }];
      return { ...p, hour: defaults[i].h, minute: defaults[i].m, time: `${String(defaults[i].h).padStart(2,'0')}:${String(defaults[i].m).padStart(2,'0')}` };
    });
  }
  const keys: (keyof PrayerTimings)[] = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
  return PRAYER_META.map((p, i) => {
    const t = times[keys[i]];
    const [h, m] = t.split(':').map(Number);
    return { ...p, hour: h, minute: m, time: t };
  });
}

function getNextPrayer(prayers: ReturnType<typeof buildPrayers>, now: Date) {
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const p of prayers) {
    if (p.hour * 60 + p.minute > cur) {
      return { prayer: p, secondsLeft: (p.hour * 60 + p.minute - cur) * 60 - now.getSeconds() };
    }
  }
  const f = prayers[0];
  return { prayer: f, secondsLeft: ((24 * 60 - cur) + f.hour * 60 + f.minute) * 60 - now.getSeconds() };
}

function getPrayerStatus(p: { hour: number; minute: number }, now: Date, done: boolean) {
  if (done) return 'done';
  const curMin = now.getHours() * 60 + now.getMinutes();
  return (p.hour * 60 + p.minute) > curMin ? 'upcoming' : 'missed';
}

function AnimateCollapseWrapper({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <motion.div
      initial={false}
      animate={{ height: show ? 'auto' : 0, opacity: show ? 1 : 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{ overflow: 'hidden' }}
    >
      {children}
    </motion.div>
  );
}

export function PrayerScreen({
  prayerStats, setPrayerStats, prayerTimes, prayerTimesLoading, locationName, setShowQibla,
}: AppState) {
  const [now, setNow] = useState(new Date());
  const [countdown, setCountdown] = useState(0);
  const [sunnahDone, setSunnahDone] = useState<boolean[]>([false, false, false, false]);
  const [showStats, setShowStats] = useState(false);

  const prayers = buildPrayers(prayerTimes);

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      setCountdown(Math.max(0, getNextPrayer(prayers, n).secondsLeft));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prayerTimes]);

  const { prayer: nextPrayer } = getNextPrayer(prayers, now);
  const prayersDone = Object.values(prayerStats).filter(Boolean).length;
  const togglePrayer = (id: keyof PrayerStats) => {
    setPrayerStats({ ...prayerStats, [id]: !prayerStats[id] });
  };

  return (
    <div className="px-5 pt-8 space-y-5">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-foreground" style={{ fontSize: 22 }}>الصلاة</h1>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin size={13} className="text-primary" />
            <span className="text-muted-foreground" style={{ fontSize: 13 }}>
              {prayerTimesLoading ? 'جاري التحديد...' : locationName}
            </span>
            {prayerTimesLoading && (
              <Loader2 size={12} className="text-primary animate-spin" />
            )}
          </div>
        </div>
        <div className="text-center bg-card border border-border rounded-2xl px-4 py-2">
          <p className="text-muted-foreground" style={{ fontSize: 11 }}>أُدِّيت اليوم</p>
          <p className="text-primary" style={{ fontSize: 20, fontWeight: 800 }}>{toAr(prayersDone)}/٥</p>
        </div>
      </header>

      {/* Next prayer card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative rounded-3xl p-5 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${nextPrayer.color}DD 0%, ${nextPrayer.color}AA 100%)` }}
      >
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-white/10" />
        <div className="absolute -bottom-10 -left-6 w-40 h-40 rounded-full bg-white/10" />
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <p className="text-white/70" style={{ fontSize: 13 }}>الصلاة القادمة</p>
            <div className="flex items-baseline gap-2">
              <h2 className="text-white" style={{ fontSize: 32, fontWeight: 800 }}>{nextPrayer.name}</h2>
              <span className="text-2xl">{nextPrayer.icon}</span>
            </div>
            <p className="text-white/80" style={{ fontSize: 14 }}>
              {prayerTimesLoading ? (
                <span className="flex items-center gap-1">
                  <Loader2 size={12} className="animate-spin" /> جاري الجلب
                </span>
              ) : nextPrayer.time}
            </p>
          </div>
          <div className="text-left">
            <p className="text-white/60" style={{ fontSize: 12 }}>المتبقي</p>
            <p className="text-white tabular-nums" style={{ fontSize: 22, fontWeight: 800 }}>
              {formatCountdown(countdown)}
            </p>
            <div className="mt-2 w-24 h-1.5 rounded-full bg-white/20 overflow-hidden">
              <div className="h-full w-1/2 rounded-full bg-white/70" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Prayer times list */}
      <section>
        <h3 className="text-foreground mb-3" style={{ fontSize: 15, fontWeight: 700 }}>مواقيت الصلاة</h3>
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          {prayers.map((p, i) => {
            const done = prayerStats[p.id as keyof PrayerStats];
            const status = getPrayerStatus(p, now, done);
            const isNext = p.id === nextPrayer.id;

            return (
              <div
                key={p.id}
                className={`flex items-center px-4 py-4 relative ${i < prayers.length - 1 ? 'border-b border-border' : ''} ${isNext ? 'bg-primary/5' : ''}`}
              >
                {isNext && (
                  <div className="w-1 h-8 rounded-full bg-primary absolute right-0" />
                )}
                <span className="text-xl ml-3">{p.icon}</span>
                <div className="flex-1">
                  <p
                    className="text-foreground"
                    style={{ fontSize: 15, fontWeight: isNext ? 700 : 500, color: isNext ? 'var(--primary)' : undefined }}
                  >
                    {p.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground" style={{ fontSize: 13 }}>
                      {prayerTimesLoading ? '—:—' : p.time}
                    </p>
                    {isNext && <span className="text-primary" style={{ fontSize: 11 }}>← القادمة</span>}
                  </div>
                </div>
                <button onClick={() => togglePrayer(p.id as keyof PrayerStats)} className="p-1">
                  {done ? (
                    <CheckCircle2 size={24} className="text-primary" style={{ fill: 'rgba(15,118,110,0.15)' }} />
                  ) : status === 'missed' ? (
                    <Circle size={24} className="text-destructive/50" />
                  ) : (
                    <Circle size={24} className="text-muted-foreground/40" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sunnah */}
      <section>
        <h3 className="text-foreground mb-3" style={{ fontSize: 15, fontWeight: 700 }}>السنن والنوافل</h3>
        <div className="grid grid-cols-2 gap-3">
          {SUNNAH.map((s, i) => (
            <button
              key={i}
              onClick={() => { const n = [...sunnahDone]; n[i] = !n[i]; setSunnahDone(n); }}
              className={`p-3.5 rounded-2xl border flex items-center gap-2.5 text-right transition-all ${
                sunnahDone[i] ? 'bg-primary/10 border-primary/30' : 'bg-card border-border'
              }`}
            >
              {sunnahDone[i]
                ? <CheckCircle2 size={18} className="text-primary flex-shrink-0" />
                : <Circle size={18} className="text-muted-foreground/40 flex-shrink-0" />}
              <p className="text-foreground" style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</p>
            </button>
          ))}
        </div>
      </section>

      {/* Weekly stats */}
      <section>
        <button className="w-full flex items-center justify-between mb-3" onClick={() => setShowStats(!showStats)}>
          <h3 className="text-foreground" style={{ fontSize: 15, fontWeight: 700 }}>إحصائيات الأسبوع</h3>
          <ChevronDown
            size={18} className="text-muted-foreground transition-transform"
            style={{ transform: showStats ? 'rotate(180deg)' : undefined }}
          />
        </button>
        <AnimateCollapseWrapper show={showStats}>
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-end justify-between gap-2">
              {[...WEEKLY].reverse().map((d, i) => (
                <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
                  <div className="w-full flex flex-col gap-1 items-center" style={{ height: 60 }}>
                    <div className="w-full rounded-t-lg bg-muted overflow-hidden flex flex-col justify-end" style={{ height: '100%' }}>
                      <motion.div
                        className="w-full rounded-t-lg bg-primary"
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.done / 5) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                      />
                    </div>
                  </div>
                  <span className="text-muted-foreground" style={{ fontSize: 11 }}>{d.day}</span>
                  <span className="text-primary" style={{ fontSize: 10, fontWeight: 700 }}>{toAr(d.done)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-muted-foreground" style={{ fontSize: 13 }}>متوسط الأسبوع</span>
              <span className="text-primary" style={{ fontSize: 14, fontWeight: 700 }}>{toAr(4.4)}/٥</span>
            </div>
          </div>
        </AnimateCollapseWrapper>
      </section>

      {/* Qibla card */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setShowQibla(true)}
        className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 mb-2 shadow-sm"
      >
        <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
          <Compass size={20} className="text-accent" />
        </div>
        <div className="flex-1 text-right">
          <p className="text-foreground" style={{ fontSize: 14, fontWeight: 700 }}>اتجاه القبلة</p>
          <p className="text-muted-foreground" style={{ fontSize: 12 }}>اضغط لفتح البوصلة</p>
        </div>
        <span className="text-2xl">🕋</span>
      </motion.button>
    </div>
  );
}
