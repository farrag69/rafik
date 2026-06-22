import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search, ChevronLeft, Bookmark, Type, Share2, X, ArrowRight,
  Play, Pause, Loader2, BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { Drawer } from 'vaul';
import { AppState, AudioState } from '../App';

// ── Types ────────────────────────────────────────────────────────────────────
interface Ayah { number: number; text: string; }
interface SurahMeta { number: number; name: string; verses: number; type: string; ayahs: Ayah[]; }
interface QuranData { surahs: SurahMeta[]; }

// ── Helpers ──────────────────────────────────────────────────────────────────
function toAr(n: number | string) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
}

const RECITERS: { id: string; name: string }[] = [
  { id: 'Abdul_Basit_Abdu_Samad_128kbps', name: 'عبد الباسط عبد الصمد' },
  { id: 'Mishary_Rashid_Alafasy_128kbps', name: 'مشاري راشد العفاسي' },
  { id: 'Saad_Al_Ghamdi_128kbps',         name: 'سعد الغامدي' },
];

type QuranView = 'hub' | 'reader';
type HubTab = 'read' | 'audio' | 'bookmarks';

// ── Share / Tafsir ───────────────────────────────────────────────────────────
async function shareVerse(text: string, surahName: string, verseNum: number) {
  const msg = `${text}\n\nسورة ${surahName} – الآية ${verseNum}\n\nمن تطبيق رفيق في الدرب`;
  if (navigator.share) {
    try { await navigator.share({ title: `سورة ${surahName}`, text: msg }); } catch { /* cancelled */ }
  } else {
    await navigator.clipboard.writeText(msg);
    toast.success('تم نسخ الآية');
  }
}

// ── Tafsir Drawer ────────────────────────────────────────────────────────────
function TafsirDrawer({
  open, onOpenChange, surahNum, surahName, verseNum, verseText,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  surahNum: number;
  surahName: string;
  verseNum: number;
  verseText: string;
}) {
  const [tafsir, setTafsir] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open || !surahNum || !verseNum) return;
    setTafsir(null); setError(false); setLoading(true);
    fetch(`https://api.alquran.cloud/v1/ayah/${surahNum}:${verseNum}/ar.muyassar`)
      .then(r => r.json())
      .then(j => {
        if (j.code === 200) setTafsir(j.data.text);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [open, surahNum, verseNum]);

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/50 z-[60]" />
        <Drawer.Content
          className="fixed bottom-0 left-0 right-0 z-[70] flex flex-col rounded-t-3xl bg-background border-t border-border"
          style={{ maxHeight: '80vh' }}
          dir="rtl"
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
          </div>

          {/* Header */}
          <div className="px-5 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <div>
              <p className="text-foreground" style={{ fontSize: 15, fontWeight: 700 }}>
                سورة {surahName} – الآية {toAr(verseNum)}
              </p>
              <p className="text-muted-foreground" style={{ fontSize: 12 }}>تفسير الميسر</p>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center"
            >
              <X size={16} className="text-foreground" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
            {/* Verse */}
            <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15">
              <p
                className="text-primary text-right leading-loose"
                style={{ fontFamily: "'Scheherazade New', serif", fontSize: 20, lineHeight: 2.2 }}
              >
                {verseText}
              </p>
            </div>

            {/* Tafsir */}
            {loading && (
              <div className="flex items-center justify-center gap-2 py-8">
                <Loader2 size={20} className="text-primary animate-spin" />
                <span className="text-muted-foreground" style={{ fontSize: 14 }}>جاري التحميل...</span>
              </div>
            )}
            {error && !loading && (
              <div className="text-center py-8">
                <p className="text-muted-foreground" style={{ fontSize: 14 }}>التفسير غير متاح حالياً</p>
              </div>
            )}
            {tafsir && !loading && (
              <div>
                <p className="text-foreground text-right leading-relaxed" style={{ fontSize: 15, lineHeight: 2 }}>
                  {tafsir}
                </p>
                <p className="text-muted-foreground mt-3 text-right" style={{ fontSize: 12 }}>
                  المصدر: تفسير الميسر – مجمع الملك فهد
                </p>
              </div>
            )}
            <div className="h-4" />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// ── Verse Block ──────────────────────────────────────────────────────────────
// Each verse is rendered inline; the parent container uses flowing text.
function VerseInline({
  verse, text, surahName, surahNum, onTafsir,
}: {
  verse: number; text: string;
  surahName: string; surahNum: number;
  onTafsir: (v: number, t: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);

  return (
    <span className="relative">
      <span
        className="cursor-pointer"
        onContextMenu={e => { e.preventDefault(); setMenuOpen(true); }}
        onPointerDown={e => {
          const t = setTimeout(() => setMenuOpen(true), 500);
          const cancel = () => clearTimeout(t);
          e.currentTarget.addEventListener('pointerup', cancel, { once: true });
          e.currentTarget.addEventListener('pointerleave', cancel, { once: true });
        }}
      >
        {text}
      </span>
      {/* Verse number circle */}
      <span
        className="inline-flex items-center justify-center rounded-full bg-primary/15 text-primary mx-1.5 align-middle cursor-pointer"
        style={{
          fontFamily: "'Cairo', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          width: 26,
          height: 26,
          flexShrink: 0,
          display: 'inline-flex',
        }}
        onClick={() => setMenuOpen(true)}
      >
        {toAr(verse)}
      </span>

      {/* Context menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 z-50 bg-card border border-border rounded-2xl shadow-2xl p-3 flex justify-around"
              style={{ minWidth: 200, top: '100%' }}
            >
              <button
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
                onClick={() => { setBookmarked(true); setMenuOpen(false); toast.success('تم الحفظ'); }}
              >
                <Bookmark size={18} className={bookmarked ? 'text-accent fill-accent' : 'text-foreground'} />
                <span className="text-xs text-muted-foreground">حفظ</span>
              </button>
              <button
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
                onClick={() => { setMenuOpen(false); shareVerse(text, surahName, verse); }}
              >
                <Share2 size={18} className="text-foreground" />
                <span className="text-xs text-muted-foreground">مشاركة</span>
              </button>
              <button
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
                onClick={() => { setMenuOpen(false); onTafsir(verse, text); }}
              >
                <Type size={18} className="text-foreground" />
                <span className="text-xs text-muted-foreground">تفسير</span>
              </button>
              <button
                className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-muted transition-colors"
                onClick={() => setMenuOpen(false)}
              >
                <X size={18} className="text-muted-foreground" />
                <span className="text-xs text-muted-foreground">إغلاق</span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </span>
  );
}

// ── Quran Reader ─────────────────────────────────────────────────────────────
function QuranReader({
  surah, onBack, fontSize,
}: {
  surah: SurahMeta; onBack: () => void; fontSize: number;
}) {
  const [tafsirOpen, setTafsirOpen] = useState(false);
  const [tafsirVerse, setTafsirVerse] = useState(0);
  const [tafsirText, setTafsirText] = useState('');

  const handleTafsir = (v: number, t: string) => {
    setTafsirVerse(v);
    setTafsirText(t);
    setTafsirOpen(true);
  };

  return (
    <>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-5 py-4 flex items-center gap-3">
          <button onClick={onBack} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight size={18} className="text-foreground" />
          </button>
          <div className="flex-1 text-center">
            <h2 className="text-foreground" style={{ fontSize: 16 }}>سورة {surah.name}</h2>
            <p className="text-muted-foreground" style={{ fontSize: 11 }}>
              {surah.type} · {toAr(surah.verses)} آية
            </p>
          </div>
          <button className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <Bookmark size={16} className="text-foreground" />
          </button>
        </div>

        {/* Bismillah (except Fatiha & Tawba) */}
        {surah.number !== 1 && surah.number !== 9 && (
          <div className="py-5 text-center border-b border-border">
            <p
              className="text-primary"
              style={{ fontFamily: "'Scheherazade New', serif", fontSize: fontSize + 4, lineHeight: 2 }}
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </p>
          </div>
        )}

        {/* Verses — flowing Mushaf style */}
        <div className="px-5 py-6 flex-1">
          <p
            className="text-foreground text-right leading-loose"
            style={{
              fontFamily: "'Scheherazade New', 'Cairo', serif",
              fontSize,
              lineHeight: 2.4,
              wordSpacing: 4,
            }}
          >
            {surah.ayahs.map(a => (
              <VerseInline
                key={a.number}
                verse={a.number}
                text={a.text}
                surahName={surah.name}
                surahNum={surah.number}
                onTafsir={handleTafsir}
              />
            ))}
          </p>
        </div>

        {/* Footer controls */}
        <div className="sticky bottom-0 bg-card/95 backdrop-blur-sm border-t border-border px-5 py-3">
          <div className="flex items-center justify-center gap-4">
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground"
              style={{ fontSize: 13 }}
            >
              <span>أ-</span>
            </button>
            <span className="text-muted-foreground" style={{ fontSize: 12 }}>
              {toAr(surah.verses)} آية
            </span>
            <button
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-muted text-foreground"
              style={{ fontSize: 13 }}
            >
              <span>+أ</span>
            </button>
          </div>
        </div>
      </div>

      <TafsirDrawer
        open={tafsirOpen}
        onOpenChange={setTafsirOpen}
        surahNum={surah.number}
        surahName={surah.name}
        verseNum={tafsirVerse}
        verseText={tafsirText}
      />
    </>
  );
}

// ── Audio Tab ─────────────────────────────────────────────────────────────────
function AudioTab({
  surahs, setAudioState,
}: {
  surahs: SurahMeta[];
  setAudioState: (s: AudioState | null) => void;
}) {
  const [selectedReciter, setSelectedReciter] = useState<typeof RECITERS[0] | null>(null);
  const [searchSurah, setSearchSurah] = useState('');

  const filtered = surahs.filter(s =>
    s.name.includes(searchSurah) || String(s.number).includes(searchSurah)
  );

  if (selectedReciter) {
    return (
      <div>
        {/* Reciter header */}
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={() => setSelectedReciter(null)}
            className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          >
            <ArrowRight size={16} className="text-foreground" />
          </button>
          <div>
            <p className="text-foreground" style={{ fontSize: 14, fontWeight: 700 }}>{selectedReciter.name}</p>
            <p className="text-muted-foreground" style={{ fontSize: 12 }}>اختر السورة للاستماع</p>
          </div>
        </div>

        {/* Surah search */}
        <div className="relative mb-3">
          <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchSurah}
            onChange={e => setSearchSurah(e.target.value)}
            placeholder="ابحث عن سورة..."
            className="w-full bg-card border border-border rounded-xl py-2.5 pr-9 pl-3 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary text-sm"
            style={{ fontSize: 13 }}
          />
        </div>

        {/* Surah list */}
        <div className="space-y-2 pb-4">
          {filtered.map(s => (
            <motion.button
              key={s.number}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                setAudioState({
                  surahNumber: s.number,
                  surahName: s.name,
                  reciterId: selectedReciter.id,
                  reciterName: selectedReciter.name,
                });
              }}
              className="w-full bg-card border border-border rounded-2xl px-4 py-3 flex items-center gap-3 text-right"
            >
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <span className="text-primary" style={{ fontSize: 11, fontWeight: 700 }}>{toAr(s.number)}</span>
              </div>
              <div className="flex-1 text-right">
                <p className="text-foreground" style={{ fontSize: 14, fontWeight: 600 }}>{s.name}</p>
                <p className="text-muted-foreground" style={{ fontSize: 12 }}>{toAr(s.verses)} آية</p>
              </div>
              <Play size={14} className="text-primary flex-shrink-0" />
            </motion.button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="py-4">
      <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <span style={{ fontSize: 32 }}>🎧</span>
      </div>
      <p className="text-foreground text-center mb-1" style={{ fontSize: 16, fontWeight: 700 }}>تلاوة القرآن</p>
      <p className="text-muted-foreground text-center mb-5" style={{ fontSize: 13 }}>اختر القارئ ثم السورة للاستماع</p>
      <div className="space-y-3">
        {RECITERS.map(r => (
          <motion.button
            key={r.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSelectedReciter(r)}
            className="w-full bg-card border border-border rounded-2xl px-4 py-4 flex items-center gap-3 text-right"
          >
            <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center text-xl flex-shrink-0">
              🎙
            </div>
            <div className="flex-1">
              <p className="text-foreground" style={{ fontSize: 14, fontWeight: 600 }}>{r.name}</p>
              <p className="text-muted-foreground" style={{ fontSize: 12 }}>تلاوة كاملة للقرآن</p>
            </div>
            <ChevronLeft size={16} className="text-muted-foreground" />
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// ── Main Quran Screen ─────────────────────────────────────────────────────────
export function QuranScreen({ quranProgress, setQuranProgress, fontSize, setAudioState }: AppState) {
  const [view, setView] = useState<QuranView>('hub');
  const [activeTab, setActiveTab] = useState<HubTab>('read');
  const [selectedSurah, setSelectedSurah] = useState<SurahMeta | null>(null);
  const [search, setSearch] = useState('');
  const [quranData, setQuranData] = useState<QuranData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [bookmarks] = useState([
    { surah: 'البقرة', verse: 255, text: 'آية الكرسي' },
    { surah: 'الفاتحة', verse: 1, text: 'سورة الفاتحة' },
    { surah: 'الإخلاص', verse: 1, text: 'قل هو الله أحد' },
  ]);

  // Load Quran data lazily
  useEffect(() => {
    import('../../data/quran.json')
      .then((m: { default: QuranData }) => { setQuranData(m.default); })
      .finally(() => setLoadingData(false));
  }, []);

  const qFontSize = fontSize === 'small' ? 18 : fontSize === 'large' ? 26 : 22;
  const surahs = quranData?.surahs ?? [];
  const filtered = surahs.filter(s =>
    s.name.includes(search) || String(s.number).includes(search)
  );

  // Reader view
  if (view === 'reader' && selectedSurah) {
    return (
      <QuranReader
        surah={selectedSurah}
        onBack={() => { setView('hub'); setSelectedSurah(null); }}
        fontSize={qFontSize}
      />
    );
  }

  return (
    <div className="px-5 pt-8">
      {/* Header */}
      <header className="mb-5">
        <h1 className="text-foreground mb-1" style={{ fontSize: 22 }}>القرآن الكريم</h1>
        <p className="text-muted-foreground" style={{ fontSize: 13 }}>اقرأ بتمعن وتدبر</p>
      </header>

      {/* Search (only in read tab) */}
      {activeTab === 'read' && (
        <div className="relative mb-5">
          <Search size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="ابحث عن سورة..."
            className="w-full bg-card border border-border rounded-2xl py-3 pr-10 pl-4 text-foreground placeholder:text-muted-foreground outline-none focus:border-primary transition-colors"
            style={{ fontSize: 14 }}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([['read', 'قراءة'], ['audio', 'تلاوة'], ['bookmarks', 'المحفوظات']] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-4 py-2 rounded-xl transition-all duration-200 ${
              activeTab === id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
            style={{ fontSize: 13 }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loadingData && activeTab === 'read' && (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={28} className="text-primary animate-spin" />
          <p className="text-muted-foreground" style={{ fontSize: 14 }}>جاري تحميل القرآن الكريم...</p>
        </div>
      )}

      {/* Read tab */}
      {!loadingData && activeTab === 'read' && (
        <>
          {/* Continue reading card */}
          {!search && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                const s = surahs.find(x => x.number === quranProgress.surahNumber);
                if (s) { setSelectedSurah(s); setView('reader'); }
              }}
              className="w-full mb-5 p-4 rounded-2xl border border-primary/30 bg-primary/5 text-right"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <BookOpen size={18} className="text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-muted-foreground mb-0.5" style={{ fontSize: 12 }}>واصل من حيث توقفت</p>
                  <p className="text-primary" style={{ fontSize: 15, fontWeight: 700 }}>
                    {quranProgress.surahName} · الآية {toAr(quranProgress.verseNumber)}
                  </p>
                </div>
              </div>
              <div className="mt-3 h-1 rounded-full bg-primary/20 overflow-hidden">
                <div className="h-full w-[40%] rounded-full bg-primary" />
              </div>
            </motion.button>
          )}

          {/* Surah list */}
          <div className="space-y-2 pb-6">
            {filtered.map(s => (
              <motion.button
                key={s.number}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSelectedSurah(s);
                  setView('reader');
                  if (s.number === quranProgress.surahNumber) {
                    setQuranProgress({ ...quranProgress });
                  }
                }}
                className="w-full bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 text-right shadow-sm"
              >
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary" style={{ fontSize: 12, fontWeight: 700 }}>{toAr(s.number)}</span>
                </div>
                <div className="flex-1">
                  <p className="text-foreground" style={{ fontSize: 15, fontWeight: 700 }}>{s.name}</p>
                  <p className="text-muted-foreground" style={{ fontSize: 12 }}>
                    {s.type} · {toAr(s.verses)} آية
                  </p>
                </div>
                <ChevronLeft size={16} className="text-muted-foreground flex-shrink-0" />
              </motion.button>
            ))}
          </div>
        </>
      )}

      {/* Audio tab */}
      {activeTab === 'audio' && (
        <AudioTab surahs={surahs} setAudioState={setAudioState} />
      )}

      {/* Bookmarks tab */}
      {activeTab === 'bookmarks' && (
        <div className="space-y-3 pb-6">
          {bookmarks.map((bm, i) => (
            <div key={i} className="bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3">
              <Bookmark size={18} className="text-accent flex-shrink-0 fill-accent" />
              <div className="flex-1">
                <p className="text-foreground" style={{ fontSize: 14, fontWeight: 700 }}>
                  {bm.surah} · الآية {toAr(bm.verse)}
                </p>
                <p className="text-muted-foreground" style={{ fontSize: 12 }}>{bm.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
