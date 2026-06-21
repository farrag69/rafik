import type React from 'react';
import { useState } from 'react';
import { motion } from 'motion/react';
import {
  Sun, Moon, Type, Bell, MapPin, BookOpen, Sliders,
  ChevronLeft, Database, Heart
} from 'lucide-react';
import { AppState, FontSize } from '../App';

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-12 rounded-full transition-colors duration-300 flex items-center flex-shrink-0"
      style={{ backgroundColor: checked ? 'var(--primary)' : 'var(--switch-background)', height: 26, width: 48 }}
    >
      <motion.div
        className="absolute w-5 h-5 bg-white rounded-full shadow-md"
        animate={{ x: checked ? 24 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
      />
    </button>
  );
}

function SettingRow({
  icon, label, value, onPress, right,
}: {
  icon: React.ReactNode; label: string; value?: string;
  onPress?: () => void; right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onPress}
      className="w-full flex items-center gap-3 py-3.5 px-4 text-right transition-colors hover:bg-muted/50 rounded-xl"
    >
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-foreground" style={{ fontSize: 14 }}>{label}</p>
        {value && <p className="text-muted-foreground" style={{ fontSize: 12 }}>{value}</p>}
      </div>
      {right ?? <ChevronLeft size={16} className="text-muted-foreground" />}
    </button>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="text-muted-foreground px-1 mb-2" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {title}
      </h3>
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm divide-y divide-border">
        {children}
      </div>
    </section>
  );
}

const FONT_OPTIONS: { label: string; value: FontSize }[] = [
  { label: 'صغير', value: 'small' },
  { label: 'متوسط', value: 'medium' },
  { label: 'كبير', value: 'large' },
];

const CALCULATION_METHODS = [
  'هيئة كبار العلماء (مكة)',
  'جامعة إسلامية - كراتشي',
  'رابطة العالم الإسلامي',
  'الهيئة الإسلامية لأمريكا الشمالية',
];

export function SettingsScreen({
  isDark, toggleDark, fontSize, setFontSize, prayerMethod, setPrayerMethod,
}: AppState) {
  const [notifications, setNotifications] = useState({
    prayer: true, azkar: true, quran: false, tasbeeh: false,
  });
  const [showMethodPicker, setShowMethodPicker] = useState(false);

  const toggleNotif = (key: keyof typeof notifications) => {
    setNotifications(p => ({ ...p, [key]: !p[key] }));
  };

  return (
    <div className="px-5 pt-8 space-y-5 pb-8">
      {/* Header */}
      <header>
        <h1 className="text-foreground mb-1" style={{ fontSize: 22 }}>الإعدادات</h1>
      </header>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-3xl p-5 flex items-center gap-4 shadow-sm"
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #0F766E 0%, #065F59 100%)' }}
        >
          <span style={{ fontSize: 28 }}>🌿</span>
        </div>
        <div>
          <p className="text-foreground" style={{ fontSize: 17, fontWeight: 700 }}>رفيق في الدرب</p>
          <p className="text-muted-foreground" style={{ fontSize: 13 }}>رحلتك الروحية تبدأ هنا</p>
          <div className="flex items-center gap-1.5 mt-1">
            <Heart size={12} className="text-accent fill-accent" />
            <span className="text-accent" style={{ fontSize: 12 }}>٣٢ يوم متواصل</span>
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <SectionCard title="المظهر">
        <SettingRow
          icon={isDark ? <Moon size={16} /> : <Sun size={16} />}
          label="الوضع الليلي"
          value={isDark ? 'مُفعَّل' : 'معطَّل'}
          right={<ToggleSwitch checked={isDark} onChange={toggleDark} />}
        />
        <div className="py-3.5 px-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Type size={16} />
            </div>
            <p className="text-foreground flex-1" style={{ fontSize: 14 }}>حجم النص</p>
          </div>
          <div className="flex gap-2">
            {FONT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setFontSize(opt.value)}
                className={`flex-1 py-2 rounded-xl transition-all ${
                  fontSize === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
                style={{ fontSize: 13 }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* Prayer settings */}
      <SectionCard title="الصلاة">
        <SettingRow icon={<MapPin size={16} />} label="الموقع" value="يتم تحديده تلقائياً" right={<div />} />
        <div>
          <SettingRow
            icon={<Sliders size={16} />}
            label="طريقة الحساب"
            value={CALCULATION_METHODS[prayerMethod]}
            onPress={() => setShowMethodPicker(!showMethodPicker)}
          />
          <motion.div
            initial={false}
            animate={{ height: showMethodPicker ? 'auto' : 0, opacity: showMethodPicker ? 1 : 0 }}
            transition={{ duration: 0.25 }}
            style={{ overflow: 'hidden' }}
          >
            <div className="pb-2">
              {CALCULATION_METHODS.map((m, i) => (
                <button
                  key={i}
                  onClick={() => { setPrayerMethod(i); setShowMethodPicker(false); }}
                  className={`w-full text-right px-12 py-2.5 transition-colors ${
                    prayerMethod === i ? 'text-primary' : 'text-muted-foreground'
                  }`}
                  style={{ fontSize: 13 }}
                >
                  {prayerMethod === i && <span className="ml-1">✓ </span>}
                  {m}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </SectionCard>

      {/* Notifications */}
      <SectionCard title="الإشعارات">
        <SettingRow icon={<Bell size={16} />} label="تنبيهات الصلاة"
          right={<ToggleSwitch checked={notifications.prayer} onChange={() => toggleNotif('prayer')} />} />
        <SettingRow icon={<Bell size={16} />} label="تذكير الأذكار"
          right={<ToggleSwitch checked={notifications.azkar} onChange={() => toggleNotif('azkar')} />} />
        <SettingRow icon={<Bell size={16} />} label="تذكير القرآن"
          right={<ToggleSwitch checked={notifications.quran} onChange={() => toggleNotif('quran')} />} />
        <SettingRow icon={<Bell size={16} />} label="تذكير التسبيح"
          right={<ToggleSwitch checked={notifications.tasbeeh} onChange={() => toggleNotif('tasbeeh')} />} />
      </SectionCard>

      {/* Quran settings */}
      <SectionCard title="القرآن">
        <SettingRow icon={<BookOpen size={16} />} label="اختيار القارئ" value="عبد الباسط عبد الصمد" />
        <SettingRow icon={<Type size={16} />} label="خط القرآن" value="خط عثماني (Scheherazade New)" />
      </SectionCard>

      {/* Data */}
      <SectionCard title="البيانات">
        <SettingRow icon={<Database size={16} />} label="النسخ الاحتياطي" value="آخر نسخة: اليوم" />
        <SettingRow icon={<Database size={16} />} label="مسح البيانات" onPress={() => {}} />
      </SectionCard>

      {/* ── Adham Memorial Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="rounded-3xl p-5 border border-primary/20"
        style={{ background: 'linear-gradient(135deg, rgba(15,118,110,0.08) 0%, rgba(182,141,64,0.06) 100%)' }}
      >
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0F766E22 0%, #B68D4022 100%)' }}
          >
            <span style={{ fontSize: 22 }}>🌿</span>
          </div>
          <div>
            <p className="text-foreground" style={{ fontSize: 15, fontWeight: 700 }}>صدقة جارية</p>
            <p className="text-muted-foreground" style={{ fontSize: 12 }}>عن التطبيق</p>
          </div>
        </div>
        <p
          className="text-foreground text-right leading-relaxed"
          style={{ fontSize: 15, lineHeight: 2, fontFamily: "'Cairo', sans-serif" }}
        >
          صُنع هذا التطبيق صدقةً جاريةً على روح{' '}
          <span className="text-primary font-bold">أدهم</span>
          {' '}— رحمه الله وأسكنه فسيح جناته.
        </p>
        <div className="mt-3 pt-3 border-t border-primary/10 text-center">
          <p className="text-muted-foreground" style={{ fontSize: 13, fontFamily: "'Scheherazade New', serif", lineHeight: 2 }}>
            ﴿ رَبَّنَا تَقَبَّلْ مِنَّا ۖ إِنَّكَ أَنتَ السَّمِيعُ الْعَلِيمُ ﴾
          </p>
        </div>
      </motion.div>

      {/* Footer */}
      <div className="text-center py-4">
        <p className="text-muted-foreground" style={{ fontSize: 12 }}>
          الإصدار ١.٠.٠ · صُنع بـ ❤️ لكل مسلم في رحلته
        </p>
      </div>
    </div>
  );
}
