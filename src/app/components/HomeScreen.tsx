import type React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Sun, Moon, Sunset, Sunrise, Star, ChevronLeft, BookOpen, RotateCcw, Compass, Headphones } from 'lucide-react';
import { AppState, PrayerTimings } from '../App';

// ── Hijri conversion ─────────────────────────────────────────────────────────
function toHijri(date: Date): { day: number; month: number; year: number } {
  const d = date.getDate(), m = date.getMonth() + 1, y = date.getFullYear();
  let jdn = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4)
    + Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12)
    - Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4)
    + d - 32075;
  let l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719)
    + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50)
    - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l) / 709);
  const hDay = l - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { day: hDay, month: hMonth, year: hYear };
}

const HIJRI_MONTHS = [
  'محرم','صفر','ربيع الأول','ربيع الآخر','جمادى الأولى','جمادى الآخرة',
  'رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة',
];
const AR_DAYS = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

// ── Prayer utils ──────────────────────────────────────────────────────────────
const DEFAULT_PRAYERS = [
  { id: 'fajr',    name: 'الفجر',   hour: 4,  minute: 45, color: '#6366F1' },
  { id: 'dhuhr',   name: 'الظهر',   hour: 12, minute: 15, color: '#F59E0B' },
  { id: 'asr',     name: 'العصر',   hour: 15, minute: 45, color: '#F97316' },
  { id: 'maghrib', name: 'المغرب',  hour: 18, minute: 30, color: '#EC4899' },
  { id: 'isha',    name: 'العشاء',  hour: 20, minute: 0,  color: '#8B5CF6' },
];

function parsePrayerTimings(t: PrayerTimings) {
  const parse = (s: string) => {
    const [h, m] = s.split(':').map(Number);
    return { hour: h, minute: m };
  };
  return [
    { id: 'fajr',    name: 'الفجر',  ...parse(t.Fajr),    color: '#6366F1' },
    { id: 'dhuhr',   name: 'الظهر',  ...parse(t.Dhuhr),   color: '#F59E0B' },
    { id: 'asr',     name: 'العصر',  ...parse(t.Asr),     color: '#F97316' },
    { id: 'maghrib', name: 'المغرب', ...parse(t.Maghrib), color: '#EC4899' },
    { id: 'isha',    name: 'العشاء', ...parse(t.Isha),    color: '#8B5CF6' },
  ];
}

function getNextPrayer(prayers: typeof DEFAULT_PRAYERS, now: Date) {
  const cur = now.getHours() * 60 + now.getMinutes();
  for (const p of prayers) {
    const pm = p.hour * 60 + p.minute;
    if (pm > cur) return { prayer: p, minutesLeft: pm - cur, secondsLeft: (pm - cur) * 60 - now.getSeconds() };
  }
  const fajr = prayers[0];
  const fajrMin = fajr.hour * 60 + fajr.minute;
  const mLeft = (24 * 60 - cur) + fajrMin;
  return { prayer: fajr, minutesLeft: mLeft, secondsLeft: mLeft * 60 - now.getSeconds() };
}

function formatCountdown(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function toArabicNumerals(n: string | number) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

// ── Greeting ──────────────────────────────────────────────────────────────────
function getGreeting(hour: number): { text: string; Icon: React.ComponentType<{ size?: number; className?: string }> } {
  if (hour >= 5 && hour < 12) return { text: 'صباح الخير', Icon: Sunrise };
  if (hour >= 12 && hour < 16) return { text: 'طاب نهارك', Icon: Sun };
  if (hour >= 16 && hour < 20) return { text: 'مساء الخير', Icon: Sunset };
  return { text: 'مساء النور', Icon: Moon };
}

// ── Sub-components ────────────────────────────────────────────────────────────
function StatCard({ label, value, total, icon, color }: { label: string; value: number; total?: number; icon: string; color: string }) {
  const pct = total ? (value / total) * 100 : Math.min((value / 100) * 100, 100);
  return (
    <div className="bg-card rounded-2xl p-3.5 flex flex-col gap-2.5 shadow-sm border border-border">
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <div>
        <p className="text-foreground leading-none" style={{ fontSize: 15, fontWeight: 700 }}>
          {toArabicNumerals(value)}{total ? `/${toArabicNumerals(total)}` : ''}
        </p>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        />
      </div>
    </div>
  );
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-card border border-border active:scale-95 transition-all duration-150 shadow-sm"
    >
      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
        {icon}
      </div>
      <span className="text-xs text-foreground leading-none">{label}</span>
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export function HomeScreen({
  isDark, toggleDark, prayerStats, azkarProgress, quranProgress,
  tasbeehCount, setActiveTab, prayerTimes, prayerTimesLoading, setShowQibla,
}: AppState) {
  const [now, setNow] = useState(new Date());
  const [countdown, setCountdown] = useState(0);

  const prayers = prayerTimes ? parsePrayerTimings(prayerTimes) : DEFAULT_PRAYERS;

  useEffect(() => {
    const tick = () => {
      const n = new Date();
      setNow(n);
      const { secondsLeft } = getNextPrayer(prayers, n);
      setCountdown(Math.max(0, secondsLeft));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [prayerTimes]); // re-init when times arrive

  const hijri = toHijri(now);
  const { prayer: nextPrayer } = getNextPrayer(prayers, now);
  const { text: greeting, Icon: GreetingIcon } = getGreeting(now.getHours());

  const prayersDone = Object.values(prayerStats).filter(Boolean).length;
  const azkarDone = Object.values(azkarProgress).filter(Boolean).length;

  // Progress bar between prev and next prayer
  const curMin = now.getHours() * 60 + now.getMinutes();
  let prevPrayer = prayers[prayers.length - 1];
  let nextPrayerFull = prayers[0];
  for (let i = 0; i < prayers.length; i++) {
    const pm = prayers[i].hour * 60 + prayers[i].minute;
    if (pm > curMin) {
      nextPrayerFull = prayers[i];
      prevPrayer = prayers[i === 0 ? prayers.length - 1 : i - 1];
      break;
    }
  }
  const prevMin = prevPrayer.hour * 60 + prevPrayer.minute;
  const nextMin = nextPrayerFull.hour * 60 + nextPrayerFull.minute;
  const span = nextMin > prevMin ? nextMin - prevMin : (24 * 60 - prevMin) + nextMin;
  const elapsed = curMin > prevMin ? curMin - prevMin : (24 * 60 - prevMin) + curMin;
  const progressPct = Math.min(100, (elapsed / span) * 100);

  const prayerTime = `${String(nextPrayer.hour).padStart(2, '0')}:${String(nextPrayer.minute).padStart(2, '0')}`;

  return (
    <div className="px-5 pt-8 space-y-5">
      {/* Header */}
      <header className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <GreetingIcon size={16} className="opacity-80" />
            <span className="text-sm text-muted-foreground">{greeting}</span>
          </div>
          <h1 className="text-foreground" style={{ fontSize: 18 }}>
            {AR_DAYS[now.getDay()]}، {toArabicNumerals(now.getDate())} {AR_MONTHS[now.getMonth()]}
          </h1>
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>
            {toArabicNumerals(hijri.day)} {HIJRI_MONTHS[hijri.month - 1]} {toArabicNumerals(hijri.year)} هـ
          </p>
        </div>
        <button
          onClick={toggleDark}
          className="w-10 h-10 rounded-2xl bg-card border border-border flex items-center justify-center shadow-sm active:scale-95 transition-transform"
        >
          {isDark
            ? <Sun size={18} className="text-[#C9A55A]" />
            : <Moon size={18} className="text-primary" />}
        </button>
      </header>

      {/* Next Prayer Hero Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="relative overflow-hidden rounded-3xl p-5"
        style={{ background: `linear-gradient(135deg, ${isDark ? '#0F3D38' : '#0F766E'} 0%, ${isDark ? '#0A2A26' : '#0D5E58'} 100%)` }}
      >
        <div className="absolute -top-8 -left-8 w-32 h-32 rounded-full bg-white/5" />
        <div className="absolute -bottom-12 -right-6 w-44 h-44 rounded-full bg-white/5" />
        <div className="absolute top-4 left-20 w-16 h-16 rounded-full bg-white/5" />

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/60 mb-0.5" style={{ fontSize: 13 }}>الصلاة القادمة</p>
              <h2 className="text-white" style={{ fontSize: 28, fontWeight: 800 }}>{nextPrayer.name}</h2>
              <div className="flex items-center gap-2">
                <p className="text-white/70" style={{ fontSize: 14 }}>
                  {prayerTimesLoading ? '...' : prayerTime}
                </p>
                {prayerTimesLoading && (
                  <div className="w-3 h-3 rounded-full border border-white/40 border-t-transparent animate-spin" />
                )}
              </div>
            </div>
            <div className="text-left">
              <p className="text-white/60 mb-0.5 text-left" style={{ fontSize: 12 }}>الوقت المتبقي</p>
              <p className="text-white tabular-nums" style={{ fontSize: 26, fontWeight: 800, letterSpacing: 1, direction: 'ltr' }}>
                {formatCountdown(countdown)}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-white/70"
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-white/50" style={{ fontSize: 11 }}>{prevPrayer.name}</span>
            <span className="text-white/50" style={{ fontSize: 11 }}>{nextPrayerFull.name}</span>
          </div>
        </div>
      </motion.div>

      {/* Daily Journey */}
      <section>
        <h3 className="text-foreground mb-3" style={{ fontSize: 15, fontWeight: 700 }}>رحلتي اليوم</h3>
        <div className="grid grid-cols-4 gap-2.5">
          <StatCard label="القرآن" value={2} total={5} icon="📖" color="#0F766E" />
          <StatCard label="الأذكار" value={azkarDone} total={4} icon="🤲" color="#B68D40" />
          <StatCard label="التسبيح" value={tasbeehCount} icon="📿" color="#8B5CF6" />
          <StatCard label="الصلاة" value={prayersDone} total={5} icon="🕌" color="#F59E0B" />
        </div>
      </section>

      {/* Continue Quran */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={() => setActiveTab('quran')}
        className="w-full bg-card border border-border rounded-2xl p-4 flex items-center gap-3 shadow-sm text-right"
      >
        <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <BookOpen size={20} className="text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-muted-foreground" style={{ fontSize: 12 }}>واصل القراءة</p>
          <p className="text-foreground truncate" style={{ fontSize: 14, fontWeight: 700 }}>
            {quranProgress.surahName} · الآية {toArabicNumerals(quranProgress.verseNumber)}
          </p>
          <p className="text-muted-foreground" style={{ fontSize: 11 }}>الصفحة {toArabicNumerals(quranProgress.pageNumber)}</p>
        </div>
        <ChevronLeft size={16} className="text-muted-foreground flex-shrink-0" />
      </motion.button>

      {/* Quick Actions */}
      <section>
        <h3 className="text-foreground mb-3" style={{ fontSize: 15, fontWeight: 700 }}>اختصارات سريعة</h3>
        <div className="grid grid-cols-4 gap-2.5">
          <QuickAction icon={<span style={{ fontSize: 20 }}>🤲</span>} label="أذكار" onClick={() => setActiveTab('worship')} />
          <QuickAction icon={<Compass size={20} />} label="القبلة" onClick={() => setShowQibla(true)} />
          <QuickAction icon={<RotateCcw size={20} />} label="تسبيح" onClick={() => setActiveTab('worship')} />
          <QuickAction icon={<Headphones size={20} />} label="تلاوة" onClick={() => setActiveTab('quran')} />
        </div>
      </section>

      {/* Motivational quote */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-card border border-border rounded-2xl p-4 text-center"
      >
        <Star size={16} className="text-accent mx-auto mb-2" />
        <p className="text-foreground" style={{ fontSize: 14, lineHeight: 1.8, fontStyle: 'italic' }}>
          ﴿ وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا ﴾
        </p>
        <p className="text-muted-foreground mt-1" style={{ fontSize: 11 }}>سورة الطلاق · الآية ٢</p>
      </motion.div>
    </div>
  );
}
