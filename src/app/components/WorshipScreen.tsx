import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, CheckCircle2, Circle, RotateCcw, Minus, Plus } from 'lucide-react';
import { AppState, AzkarProgress } from '../App';

// ── Azkar Data ────────────────────────────────────────────────────────────────
const AZKAR_CATEGORIES = [
  {
    id: 'morning',
    title: 'أذكار الصباح',
    subtitle: 'بعد الفجر حتى الضحى',
    icon: '🌅',
    color: '#F59E0B',
    bg: '#FEF3C7',
    darkBg: '#2D2008',
    count: 12,
    items: [
      { text: 'أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَىٰ كُلِّ شَيْءٍ قَدِيرٌ', count: 1 },
      { text: 'اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ النُّشُورُ', count: 1 },
      { text: 'اللَّهُمَّ أَنْتَ رَبِّي، لَا إِلَٰهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَىٰ عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ', count: 1 },
      { text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ', count: 100 },
      { text: 'أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ\nاللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ...', count: 1, note: 'آية الكرسي' },
    ],
  },
  {
    id: 'evening',
    title: 'أذكار المساء',
    subtitle: 'بعد العصر حتى المغرب',
    icon: '🌆',
    color: '#8B5CF6',
    bg: '#EDE9FE',
    darkBg: '#1E1533',
    count: 10,
    items: [
      { text: 'أَمْسَيْنَا وَأَمْسَىٰ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَٰهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ', count: 1 },
      { text: 'اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ وَإِلَيْكَ الْمَصِيرُ', count: 1 },
      { text: 'اللَّهُمَّ إِنِّي أَمْسَيْتُ أُشْهِدُكَ وَأُشْهِدُ حَمَلَةَ عَرْشِكَ وَمَلَائِكَتَكَ وَجَمِيعَ خَلْقِكَ أَنَّكَ أَنْتَ اللَّهُ لَا إِلَٰهَ إِلَّا أَنْتَ وَحْدَكَ لَا شَرِيكَ لَكَ', count: 4 },
    ],
  },
  {
    id: 'sleep',
    title: 'أذكار النوم',
    subtitle: 'عند النوم',
    icon: '🌙',
    color: '#6366F1',
    bg: '#EEF2FF',
    darkBg: '#161830',
    count: 8,
    items: [
      { text: 'بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا', count: 1 },
      { text: 'سُبْحَانَ اللَّهِ', count: 33, note: 'ثلاثة وثلاثون' },
      { text: 'الْحَمْدُ لِلَّهِ', count: 33, note: 'ثلاثة وثلاثون' },
      { text: 'اللَّهُ أَكْبَرُ', count: 34, note: 'أربعة وثلاثون' },
    ],
  },
  {
    id: 'afterPrayer',
    title: 'أذكار ما بعد الصلاة',
    subtitle: 'بعد كل فريضة',
    icon: '🕌',
    color: '#0F766E',
    bg: '#ECFDF5',
    darkBg: '#0A2420',
    count: 9,
    items: [
      { text: 'أَسْتَغْفِرُ اللَّهَ', count: 3 },
      { text: 'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ تَبَارَكْتَ ذَا الْجَلَالِ وَالْإِكْرَامِ', count: 1 },
      { text: 'سُبْحَانَ اللَّهِ', count: 33 },
      { text: 'الْحَمْدُ لِلَّهِ', count: 33 },
      { text: 'اللَّهُ أَكْبَرُ', count: 33 },
    ],
  },
];

const TASBEEH_OPTIONS = [
  { dhikr: 'سُبْحَانَ اللَّهِ', target: 33, color: '#0F766E' },
  { dhikr: 'الْحَمْدُ لِلَّهِ', target: 33, color: '#B68D40' },
  { dhikr: 'اللَّهُ أَكْبَرُ', target: 34, color: '#8B5CF6' },
  { dhikr: 'لَا إِلَٰهَ إِلَّا اللَّهُ', target: 100, color: '#F59E0B' },
  { dhikr: 'الصَّلَاةُ عَلَى النَّبِيِّ ﷺ', target: 100, color: '#EC4899' },
];

type View = 'main' | 'azkar-session' | 'tasbeeh';

function toAr(n: number) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

// ── Azkar Session ─────────────────────────────────────────────────────────────
function AzkarSession({
  category,
  onBack,
  onComplete,
}: {
  category: typeof AZKAR_CATEGORIES[0];
  onBack: () => void;
  onComplete: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [counters, setCounters] = useState<number[]>(category.items.map(() => 0));
  const done = counters.every((c, i) => c >= category.items[i].count);

  const cur = category.items[currentIndex];
  const curCount = counters[currentIndex];
  const needed = cur.count;
  const pct = Math.min(100, (curCount / needed) * 100);

  const tap = () => {
    const nc = [...counters];
    if (nc[currentIndex] < needed) {
      nc[currentIndex]++;
      setCounters(nc);
      if (nc[currentIndex] >= needed && currentIndex < category.items.length - 1) {
        setTimeout(() => setCurrentIndex(i => i + 1), 400);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowRight size={18} className="text-foreground" />
        </button>
        <div className="flex-1 text-center">
          <h2 style={{ fontSize: 15 }}>{category.title}</h2>
        </div>
        <div className="text-primary" style={{ fontSize: 13 }}>
          {toAr(currentIndex + 1)}/{toAr(category.items.length)}
        </div>
      </div>

      {/* Progress */}
      <div className="h-1 bg-muted">
        <motion.div
          className="h-full"
          style={{ backgroundColor: category.color }}
          animate={{ width: `${((currentIndex + pct / 100) / category.items.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8">
        {done ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center space-y-4"
          >
            <div className="text-6xl">✅</div>
            <p className="text-foreground" style={{ fontSize: 20, fontWeight: 700 }}>أحسنت!</p>
            <p className="text-muted-foreground" style={{ fontSize: 14 }}>أتممت {category.title}</p>
            <button
              onClick={() => { onComplete(); onBack(); }}
              className="px-8 py-3 bg-primary text-primary-foreground rounded-2xl"
              style={{ fontSize: 15 }}
            >
              رائع، شكراً
            </button>
          </motion.div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="text-center space-y-3"
              >
                {cur.note && (
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>{cur.note}</p>
                )}
                <p
                  className="text-foreground leading-loose"
                  style={{ fontFamily: "'Scheherazade New', serif", fontSize: 22, lineHeight: 2.2 }}
                >
                  {cur.text}
                </p>
              </motion.div>
            </AnimatePresence>

            {/* Counter display */}
            <div className="text-center">
              <motion.p
                key={curCount}
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                className="text-primary"
                style={{ fontSize: 48, fontWeight: 800, lineHeight: 1 }}
              >
                {toAr(curCount)}
              </motion.p>
              <p className="text-muted-foreground" style={{ fontSize: 14 }}>من {toAr(needed)}</p>
            </div>

            {/* Tap button */}
            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={tap}
              className="w-32 h-32 rounded-full border-4 border-primary/30 flex items-center justify-center shadow-lg active:shadow-md transition-all"
              style={{ background: `radial-gradient(circle, var(--primary) 0%, #0A5C55 100%)` }}
            >
              <span className="text-white" style={{ fontSize: 15 }}>اضغط</span>
            </motion.button>

            {/* Circular progress */}
            <svg width="80" height="80" className="-mt-4">
              <circle cx="40" cy="40" r="34" fill="none" stroke="var(--muted)" strokeWidth="5" />
              <circle
                cx="40" cy="40" r="34"
                fill="none"
                stroke={category.color}
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
                transform="rotate(-90 40 40)"
                style={{ transition: 'stroke-dashoffset 0.3s ease' }}
              />
            </svg>
          </>
        )}
      </div>
    </div>
  );
}

// ── Tasbeeh Counter ───────────────────────────────────────────────────────────
function TasbeehCounter({ onBack, tasbeehCount, setTasbeehCount }: {
  onBack: () => void;
  tasbeehCount: number;
  setTasbeehCount: (n: number) => void;
}) {
  const [selectedDhikr, setSelectedDhikr] = useState(0);
  const [count, setCount] = useState(0);
  const opt = TASBEEH_OPTIONS[selectedDhikr];
  const pct = Math.min(100, (count / opt.target) * 100);
  const circumference = 2 * Math.PI * 90;

  const tap = () => {
    const n = count + 1;
    setCount(n);
    setTasbeehCount(tasbeehCount + 1);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center gap-3">
        <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <ArrowRight size={18} className="text-foreground" />
        </button>
        <div className="flex-1 text-center">
          <h2 style={{ fontSize: 15 }}>التسبيح</h2>
        </div>
        <button onClick={() => setCount(0)} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
          <RotateCcw size={16} className="text-muted-foreground" />
        </button>
      </div>

      {/* Dhikr selector */}
      <div className="px-5 py-3 flex gap-2 overflow-x-auto">
        {TASBEEH_OPTIONS.map((opt, i) => (
          <button
            key={i}
            onClick={() => { setSelectedDhikr(i); setCount(0); }}
            className={`px-3 py-1.5 rounded-xl whitespace-nowrap flex-shrink-0 transition-all ${
              selectedDhikr === i ? 'text-white' : 'bg-muted text-muted-foreground'
            }`}
            style={{ fontSize: 12, backgroundColor: selectedDhikr === i ? opt.color : undefined }}
          >
            {opt.dhikr.split(' ').slice(0, 2).join(' ')}
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6">
        {/* Circular progress ring */}
        <div className="relative">
          <svg width="220" height="220">
            <circle cx="110" cy="110" r="90" fill="none" stroke="var(--muted)" strokeWidth="10" />
            <circle
              cx="110" cy="110" r="90"
              fill="none"
              stroke={opt.color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={circumference * (1 - pct / 100)}
              transform="rotate(-90 110 110)"
              style={{ transition: 'stroke-dashoffset 0.15s ease' }}
            />
          </svg>

          {/* Center tap button */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={tap}
            className="absolute inset-0 flex flex-col items-center justify-center rounded-full"
          >
            <motion.p
              key={count}
              initial={{ scale: 1.3, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-foreground"
              style={{ fontSize: 52, fontWeight: 800, lineHeight: 1 }}
            >
              {toAr(count)}
            </motion.p>
            <p className="text-muted-foreground" style={{ fontSize: 13 }}>من {toAr(opt.target)}</p>
          </motion.button>
        </div>

        {/* Dhikr text */}
        <p
          className="text-foreground text-center"
          style={{ fontFamily: "'Scheherazade New', serif", fontSize: 24, lineHeight: 2 }}
        >
          {opt.dhikr}
        </p>

        {/* Manual controls */}
        <div className="flex items-center gap-6">
          <button
            onClick={() => count > 0 && setCount(count - 1)}
            className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center"
          >
            <Minus size={20} className="text-muted-foreground" />
          </button>
          <button
            onClick={tap}
            className="px-8 py-3 rounded-2xl text-white"
            style={{ backgroundColor: opt.color, fontSize: 15 }}
          >
            تسبيح
          </button>
          <button
            onClick={() => setCount(0)}
            className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center"
          >
            <RotateCcw size={18} className="text-muted-foreground" />
          </button>
        </div>

        {count >= opt.target && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-primary" style={{ fontSize: 16, fontWeight: 700 }}>أحسنت! أتممت العدد 🎉</p>
            <button onClick={() => setCount(0)} className="mt-2 text-muted-foreground" style={{ fontSize: 13 }}>
              إعادة
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Main Worship Screen ───────────────────────────────────────────────────────
export function WorshipScreen({ azkarProgress, setAzkarProgress, tasbeehCount, setTasbeehCount }: AppState) {
  const [view, setView] = useState<View>('main');
  const [selectedCategory, setSelectedCategory] = useState<typeof AZKAR_CATEGORIES[0] | null>(null);

  if (view === 'azkar-session' && selectedCategory) {
    return (
      <AzkarSession
        category={selectedCategory}
        onBack={() => { setView('main'); setSelectedCategory(null); }}
        onComplete={() => {
          const key = selectedCategory.id as keyof AzkarProgress;
          setAzkarProgress({ ...azkarProgress, [key]: true });
        }}
      />
    );
  }

  if (view === 'tasbeeh') {
    return (
      <TasbeehCounter
        onBack={() => setView('main')}
        tasbeehCount={tasbeehCount}
        setTasbeehCount={setTasbeehCount}
      />
    );
  }

  const azkarDone = Object.values(azkarProgress).filter(Boolean).length;

  return (
    <div className="px-5 pt-8 space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-foreground mb-1" style={{ fontSize: 22 }}>العبادة</h1>
        <p className="text-muted-foreground" style={{ fontSize: 13 }}>
          أتممت {toAr(azkarDone)} من ٤ أذكار اليوم
        </p>
      </header>

      {/* Azkar categories */}
      <section>
        <h3 className="text-foreground mb-3" style={{ fontSize: 15, fontWeight: 700 }}>الأذكار</h3>
        <div className="space-y-3">
          {AZKAR_CATEGORIES.map(cat => {
            const isDone = azkarProgress[cat.id as keyof AzkarProgress];
            return (
              <motion.button
                key={cat.id}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setSelectedCategory(cat); setView('azkar-session'); }}
                className="w-full bg-card border border-border rounded-2xl px-4 py-4 flex items-center gap-4 shadow-sm"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                  style={{ backgroundColor: cat.bg }}
                >
                  {cat.icon}
                </div>
                <div className="flex-1 text-right">
                  <p className="text-foreground" style={{ fontSize: 15, fontWeight: 700 }}>{cat.title}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>{cat.subtitle} · {toAr(cat.count)} ذكر</p>
                </div>
                {isDone ? (
                  <CheckCircle2 size={22} className="text-primary flex-shrink-0 fill-primary/20" />
                ) : (
                  <Circle size={22} className="text-muted-foreground/40 flex-shrink-0" />
                )}
              </motion.button>
            );
          })}
        </div>
      </section>

      {/* Tasbeeh */}
      <section>
        <h3 className="text-foreground mb-3" style={{ fontSize: 15, fontWeight: 700 }}>التسبيح</h3>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setView('tasbeeh')}
          className="w-full rounded-3xl p-5 text-right overflow-hidden relative"
          style={{ background: 'linear-gradient(135deg, #0F766E 0%, #065F59 100%)' }}
        >
          <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/5" />
          <div className="absolute -bottom-8 -right-4 w-32 h-32 rounded-full bg-white/5" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white/70" style={{ fontSize: 13 }}>اضغط للبدء</p>
              <p className="text-white" style={{ fontSize: 13 }}>اليوم: {toAr(tasbeehCount)}</p>
            </div>
            <p className="text-white" style={{ fontSize: 20, fontWeight: 800 }}>سبحان الله وبحمده</p>
            <p className="text-white/60" style={{ fontSize: 13 }}>سبحان الله العظيم</p>
          </div>
        </motion.button>
      </section>

      {/* Salawat */}
      <section>
        <h3 className="text-foreground mb-3" style={{ fontSize: 15, fontWeight: 700 }}>الصلاة على النبي ﷺ</h3>
        <div className="bg-card border border-border rounded-2xl p-4">
          <p
            className="text-foreground text-center mb-4"
            style={{ fontFamily: "'Scheherazade New', serif", fontSize: 18, lineHeight: 2.2 }}
          >
            اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ
          </p>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground" style={{ fontSize: 13 }}>١٠٠ مرة يومياً</span>
            <button
              className="px-4 py-2 bg-primary/10 text-primary rounded-xl"
              style={{ fontSize: 13 }}
              onClick={() => setView('tasbeeh')}
            >
              ابدأ العدّ
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
