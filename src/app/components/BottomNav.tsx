import type React from 'react';
import { motion } from 'motion/react';
import { Home, BookOpen, Infinity, Clock, Settings } from 'lucide-react';
import { Tab } from '../App';

const tabs: { id: Tab; label: string; Icon: React.ComponentType<{ size?: number; strokeWidth?: number }> }[] = [
  { id: 'home', label: 'الرئيسية', Icon: Home },
  { id: 'quran', label: 'القرآن', Icon: BookOpen },
  { id: 'worship', label: 'العبادة', Icon: Infinity },
  { id: 'prayer', label: 'الصلاة', Icon: Clock },
  { id: 'settings', label: 'الإعدادات', Icon: Settings },
];

interface Props {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

export function BottomNav({ activeTab, onTabChange }: Props) {
  return (
    <div className="absolute bottom-0 left-0 right-0 z-50">
      <div className="mx-3 mb-3 bg-card/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-border">
        <div className="flex items-center justify-around px-2 py-2">
          {tabs.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className="relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-2xl transition-all duration-300 min-w-[52px]"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 bg-primary/10 rounded-2xl"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.5 : 1.8}
                  className={`relative z-10 transition-colors duration-200 ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                />
                <span
                  className={`relative z-10 text-[10px] transition-colors duration-200 leading-none ${
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
