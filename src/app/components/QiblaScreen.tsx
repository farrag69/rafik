import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ArrowRight, RefreshCw, Navigation, AlertCircle } from 'lucide-react';

// ── Mecca coordinates ──────────────
const MECCA_LAT = 21.4225;
const MECCA_LNG = 39.8262;

interface Props {
  onClose: () => void;
}

export function QiblaScreen({ onClose }: Props) {
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [qiblaAngle, setQiblaAngle] = useState<number>(135); // Default for Cairo
  const [status, setStatus] = useState<'searching' | 'found' | 'no-permission' | 'unsupported' | 'needs-permission'>('searching');
  const [permissionRequested, setPermissionRequested] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  const absoluteHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const relativeHandlerRef = useRef<((e: DeviceOrientationEvent) => void) | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if iOS on mount
  useEffect(() => {
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.userAgent.includes('Mac') && 'ontouchstart' in navigator);
    setIsIOS(ios);
  }, []);

  // Calculate Qibla angle when lat/lng changes
  useEffect(() => {
    if (lat !== null && lng !== null) {
      const phiK = (lat * Math.PI) / 180;
      const lambdaK = (lng * Math.PI) / 180;
      const phiM = (MECCA_LAT * Math.PI) / 180;
      const lambdaM = (MECCA_LNG * Math.PI) / 180;

      const deltaL = lambdaM - lambdaK;

      const y = Math.sin(deltaL);
      const x = Math.cos(phiK) * Math.tan(phiM) - Math.sin(phiK) * Math.cos(deltaL);

      let qiblaRad = Math.atan2(y, x);
      let qiblaDeg = (qiblaRad * 180) / Math.PI;
      if (qiblaDeg < 0) {
        qiblaDeg += 360;
      }
      setQiblaAngle(qiblaDeg);
      setStatus('found');
    }
  }, [lat, lng]);

  const cleanupListeners = () => {
    if (absoluteHandlerRef.current) {
      window.removeEventListener('deviceorientationabsolute', absoluteHandlerRef.current, true);
      absoluteHandlerRef.current = null;
    }
    if (relativeHandlerRef.current) {
      window.removeEventListener('deviceorientation', relativeHandlerRef.current, true);
      relativeHandlerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude);
          setLng(position.coords.longitude);
        },
        (error) => {
          console.warn('Geolocation error, using Cairo default:', error);
          setLat(30.0444);
          setLng(31.2357);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setLat(30.0444);
      setLng(31.2357);
    }
  };

  const startCompass = () => {
    setStatus('searching');
    cleanupListeners();

    // Fetch location coords
    requestLocation();

    let lastEventWasAbsolute = false;

    const handleOrientationAbsolute = (e: DeviceOrientationEvent) => {
      if (e.alpha !== null) {
        lastEventWasAbsolute = true;
        const headingVal = (360 - e.alpha + 360) % 360;
        setHeading(headingVal);
      }
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if ('webkitCompassHeading' in e) {
        const headingVal = (e as any).webkitCompassHeading as number;
        if (headingVal !== undefined && headingVal !== null) {
          setHeading(headingVal);
        }
      } else if (e.alpha !== null && !lastEventWasAbsolute) {
        const headingVal = (360 - e.alpha + 360) % 360;
        setHeading(headingVal);
      }
    };

    absoluteHandlerRef.current = handleOrientationAbsolute;
    relativeHandlerRef.current = handleOrientation;

    window.addEventListener('deviceorientationabsolute', handleOrientationAbsolute, true);
    window.addEventListener('deviceorientation', handleOrientation, true);

    // Timeout fallback for devices without orientation sensors (like Desktops)
    timeoutRef.current = setTimeout(() => {
      setHeading(prev => {
        if (prev === null) {
          setStatus('found'); // Stop pulse animation, display static compass
        }
        return prev;
      });
    }, 2500);
  };

  const requestIOSPermissionDirect = async () => {
    const reqPermission = (DeviceOrientationEvent as any).requestPermission;
    if (typeof reqPermission === 'function') {
      try {
        const res = await reqPermission();
        if (res === 'granted') {
          setPermissionRequested(true);
          startCompass();
        } else {
          setStatus('no-permission');
        }
      } catch (err) {
        console.error('Permission request rejected:', err);
        setStatus('no-permission');
      }
    } else {
      startCompass();
    }
  };

  // Main coordinator on mount / isIOS change
  useEffect(() => {
    const hasIOSPermissionApi = typeof DeviceOrientationEvent !== 'undefined' && 
      typeof (DeviceOrientationEvent as any).requestPermission === 'function';

    if (isIOS && hasIOSPermissionApi && !permissionRequested) {
      setStatus('needs-permission');
    } else {
      startCompass();
    }

    return () => {
      cleanupListeners();
    };
  }, [isIOS, permissionRequested]);

  // Calculate the relative direction of Qibla relative to the top of the phone screen
  // If heading is 0 (phone pointing North), Qibla is at qiblaAngle.
  // If phone points at heading, Qibla relative to phone is qiblaAngle - heading.
  const relativeQiblaAngle = heading !== null ? (qiblaAngle - heading + 360) % 360 : qiblaAngle;
  
  // Aligned means the phone is pointing within 5 degrees of Mecca
  const isAligned = heading !== null && Math.abs((relativeQiblaAngle + 180) % 360 - 180) < 6;

  // Format numbers to Arabic
  const toAr = (n: number | string) => {
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[+d]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col justify-between"
      dir="rtl"
    >
      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between border-b border-border bg-card/50">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center">
            <ArrowRight size={18} className="text-foreground" />
          </button>
          <div>
            <h2 className="text-foreground font-bold" style={{ fontSize: 16 }}>اتجاه القبلة</h2>
            <p className="text-muted-foreground" style={{ fontSize: 11 }}>حدد اتجاه الكعبة المشرفة بدقة</p>
          </div>
        </div>
        <button
          onClick={startCompass}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
          title="إعادة معايرة"
        >
          <RefreshCw size={16} className="text-foreground" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {status === 'searching' && (
            <motion.div
              key="searching"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-10"
            >
              <div className="relative w-32 h-32 flex items-center justify-center mb-6">
                <motion.div
                  className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                />
                <Navigation size={48} className="text-primary animate-pulse" />
              </div>
              <p className="text-foreground font-bold text-center mb-2">جاري تحديد الموقع وتفعيل البوصلة...</p>
              <p className="text-muted-foreground text-sm text-center max-w-xs">يرجى التأكد من السماح بالوصول للموقع وحركة الجهاز.</p>
            </motion.div>
          )}

          {status === 'needs-permission' && (
            <motion.div
              key="needs-permission"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center text-center max-w-sm"
            >
              <div className="relative w-28 h-28 flex items-center justify-center mb-6">
                <div className="absolute inset-0 rounded-full border border-primary/20 bg-primary/5 animate-pulse" />
                <Navigation size={44} className="text-primary transform rotate-45" />
              </div>
              <h3 className="text-foreground font-bold mb-2" style={{ fontSize: 18 }}>تفعيل البوصلة الذكية</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                يرجى تفعيل مستشعرات الحركة والاتجاه لتحديد اتجاه الكعبة الشريفة تلقائياً أثناء تدوير الهاتف.
              </p>
              <button
                onClick={requestIOSPermissionDirect}
                className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:bg-primary/90 transition-all transform active:scale-95 w-full"
              >
                تفعيل البوصلة 🧭
              </button>
            </motion.div>
          )}

          {status === 'no-permission' && (
            <motion.div
              key="no-permission"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center text-center max-w-sm"
            >
              <AlertCircle size={48} className="text-destructive mb-4" />
              <h3 className="text-foreground font-bold mb-2">مطلوب إذن الوصول للحركة والموقع</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                يتطلب تحديد اتجاه القبلة استخدام مستشعرات الحركة والاتجاه في جهازك بالإضافة للموقع الجغرافي.
              </p>
              {isIOS && !permissionRequested && (
                <button
                  onClick={requestIOSPermissionDirect}
                  className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg hover:bg-primary/90 transition-all transform active:scale-95 w-full"
                >
                  السماح بالوصول للمستشعرات
                </button>
              )}
              <button
                onClick={requestIOSPermissionDirect}
                className="mt-3 px-6 py-3 rounded-2xl bg-muted text-foreground font-bold text-sm transition-all transform active:scale-95 w-full"
              >
                إعادة المحاولة
              </button>
            </motion.div>
          )}

          {status === 'unsupported' && (
            <motion.div
              key="unsupported"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center text-center max-w-sm"
            >
              <AlertCircle size={48} className="text-amber-500 mb-4" />
              <h3 className="text-foreground font-bold mb-2">المستشعرات غير مدعومة</h3>
              <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                جهازك أو المتصفح الحالي لا يدعم الوصول لمستشعر البوصلة. تم ضبط الاتجاه افتراضياً لمدينة القاهرة.
              </p>
              <button
                onClick={() => setStatus('found')}
                className="px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-bold text-sm shadow-lg w-full"
              >
                عرض اتجاه القبلة التقريبي
              </button>
            </motion.div>
          )}

          {status === 'found' && (
            <motion.div
              key="found"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center"
            >
              {/* Guidance Message */}
              <div className="mb-8 text-center h-14 flex items-center justify-center">
                {isAligned ? (
                  <motion.p
                    initial={{ scale: 0.9 }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="text-emerald-500 font-bold text-lg px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                  >
                    أنت الآن باتجاه القبلة الشريفة ✨
                  </motion.p>
                ) : (
                  <p className="text-muted-foreground text-sm text-center px-4">
                    {heading === null 
                      ? 'مستشعر الاتجاه غير متوفر. تم عرض اتجاه القبلة الثابت لموقعك.' 
                      : `قم بتدوير الجهاز بمقدار ${toAr(Math.round(relativeQiblaAngle))}° حتى يتطابق السهمان`}
                  </p>
                )}
              </div>

              {/* Compass Ring */}
              <div className="relative w-72 h-72 flex items-center justify-center">
                {/* Glow behind compass when aligned */}
                <AnimatePresence>
                  {isAligned && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1.05 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="absolute inset-0 rounded-full bg-emerald-500/10 blur-xl z-0"
                    />
                  )}
                </AnimatePresence>

                {/* Rotating Compass Dial */}
                <motion.div
                  className="absolute inset-0 z-10 select-none pointer-events-none"
                  animate={{ rotate: heading !== null ? -heading : 0 }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {/* Background Ring */}
                    <circle cx="100" cy="100" r="90" className="fill-card stroke-border" strokeWidth="4" />
                    
                    {/* Ring notches */}
                    {Array.from({ length: 12 }).map((_, i) => {
                      const angle = (i * 30 * Math.PI) / 180;
                      const x1 = 100 + Math.sin(angle) * 82;
                      const y1 = 100 - Math.cos(angle) * 82;
                      const x2 = 100 + Math.sin(angle) * 88;
                      const y2 = 100 - Math.cos(angle) * 88;
                      const isMain = i % 3 === 0;
                      return (
                        <line
                          key={i}
                          x1={x1}
                          y1={y1}
                          x2={x2}
                          y2={y2}
                          className={isMain ? "stroke-foreground" : "stroke-muted-foreground/40"}
                          strokeWidth={isMain ? 2 : 1}
                        />
                      );
                    })}

                    {/* Cardinal directions (N, S, E, W) */}
                    <text x="100" y="28" textAnchor="middle" className="fill-foreground font-bold text-[13px] tracking-widest">ش</text>
                    <text x="100" y="184" textAnchor="middle" className="fill-muted-foreground font-bold text-[13px]">ج</text>
                    <text x="180" y="105" textAnchor="middle" className="fill-muted-foreground font-bold text-[13px]">ق</text>
                    <text x="24" y="105" textAnchor="middle" className="fill-muted-foreground font-bold text-[13px]">غ</text>
                  </svg>
                </motion.div>

                {/* Qibla Indicator Arrow (points to Mecca, relative to True North) */}
                {/* When heading is rotated, the compass dial is rotated by -heading. */}
                {/* The Qibla arrow rotates with the compass dial, but pointing towards Mecca. */}
                <motion.div
                  className="absolute inset-0 z-20 pointer-events-none"
                  animate={{ rotate: relativeQiblaAngle }}
                  transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                >
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    {/* Arrow pointing North/Mecca */}
                    <defs>
                      <linearGradient id="qiblaArrow" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={isAligned ? "#10b981" : "#b68d40"} />
                        <stop offset="100%" stopColor={isAligned ? "#059669" : "#0f766e"} />
                      </linearGradient>
                    </defs>
                    
                    {/* Kaaba indicator icon at the top of the Qibla angle */}
                    <g transform="translate(100, 30)">
                      <circle
                        r="18"
                        className={isAligned ? "fill-emerald-500/10 stroke-emerald-500" : "fill-primary/10 stroke-primary"}
                        strokeWidth="2"
                      />
                      {/* Kaaba simple shape */}
                      <rect x="-7" y="-7" width="14" height="14" rx="2" className="fill-foreground" />
                      <rect x="-7" y="-3" width="14" height="3" className="fill-amber-500" />
                    </g>

                    {/* Styled pointing needle */}
                    <path
                      d="M 100 50 L 92 100 L 100 92 L 108 100 Z"
                      fill="url(#qiblaArrow)"
                      className="drop-shadow-md"
                    />
                  </svg>
                </motion.div>

                {/* Fixed center pointer (indicates phone's forward direction) */}
                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                  {/* Top center marker on the physical frame */}
                  <div className={`absolute top-0 w-1.5 h-6 rounded-b-full ${isAligned ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-primary'}`} />
                  
                  {/* Center glass cap */}
                  <div className="w-8 h-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center">
                    <div className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${isAligned ? 'bg-emerald-500' : 'bg-primary'}`} />
                  </div>
                </div>
              </div>

              {/* Angles details */}
              <div className="mt-8 flex gap-8">
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">درجة القبلة</p>
                  <p className="text-foreground font-bold text-lg mt-0.5">{toAr(Math.round(qiblaAngle))}°</p>
                </div>
                <div className="h-8 w-px bg-border align-middle self-center" />
                <div className="text-center">
                  <p className="text-muted-foreground text-xs">اتجاه جهازك</p>
                  <p className="text-foreground font-bold text-lg mt-0.5">
                    {heading !== null ? `${toAr(Math.round(heading))}°` : 'غير محدد'}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Info */}
      <div className="p-6 bg-card/50 border-t border-border text-center">
        <p className="text-muted-foreground text-xs leading-relaxed">
          ضع الهاتف على سطح مستوٍ تماماً وابتعد عن الأجهزة الإلكترونية أو الأجسام المعدنية التي قد تؤثر على دقة البوصلة.
        </p>
      </div>
    </motion.div>
  );
}
