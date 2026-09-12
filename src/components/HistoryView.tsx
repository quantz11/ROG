import React, { useState } from 'react';
import { History, Calendar, Lock, Unlock, ArrowRight, Shield } from 'lucide-react';
import { Settings } from '../types';
import { isMonthUnlocked, formatMonthKey } from '../utils/calculations';

interface HistoryViewProps {
  currentYear: number;
  currentMonth: number;
  onSelectMonthYear: (year: number, month: number) => void;
  settings: Settings;
  onToggleUnlockMonth: (year: number, month: number) => Promise<void> | void;
  isAdmin: boolean;
  onOpenAuth?: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const HistoryView: React.FC<HistoryViewProps> = ({
  currentYear,
  currentMonth,
  onSelectMonthYear,
  settings,
  onToggleUnlockMonth,
  isAdmin,
  onOpenAuth
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [togglingKey, setTogglingKey] = useState<string | null>(null);

  // Generate all 12 months for the selected year
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  const now = new Date();
  const liveYear = now.getFullYear();
  const liveMonth = now.getMonth() + 1;

  const handleToggle = async (year: number, month: number) => {
    if (!isAdmin) {
      if (onOpenAuth) onOpenAuth();
      return;
    }
    const key = formatMonthKey(year, month);
    setTogglingKey(key);
    try {
      await onToggleUnlockMonth(year, month);
    } finally {
      setTogglingKey(null);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <History className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-widest">Historical Archives</span>
          </div>
          <h2 className="text-2xl font-black text-white">Monthly History</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Browse past monthly attendance records and manage editing permissions for archived periods.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-neutral-800 rounded-xl p-1.5 border border-neutral-700/60">
          <span className="text-xs text-neutral-400 px-2 font-medium">Year:</span>
          {[2024, 2025, 2026, 2027].map(y => (
            <button
              key={y}
              onClick={() => setSelectedYear(y)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedYear === y ? 'bg-amber-500 text-neutral-950 shadow-md' : 'text-neutral-400 hover:text-white'
              }`}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {months.map(monthNum => {
          const monthKey = formatMonthKey(selectedYear, monthNum);
          const isCurrentSelected = currentYear === selectedYear && currentMonth === monthNum;
          const isLiveCurrentMonth = liveYear === selectedYear && liveMonth === monthNum;
          const isUnlocked = isMonthUnlocked(selectedYear, monthNum, settings.unlockedMonths || []);
          const isProcessing = togglingKey === monthKey;

          return (
            <div 
              key={monthNum}
              className={`bg-neutral-900 border rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all ${
                isCurrentSelected 
                  ? 'border-amber-500/80 bg-neutral-900/90 shadow-amber-500/10' 
                  : isUnlocked
                    ? 'border-emerald-500/30 bg-neutral-900/90'
                    : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-amber-400" />
                    <span className="text-lg font-bold text-white">{MONTH_NAMES[monthNum - 1]} {selectedYear}</span>
                  </div>
                  {isLiveCurrentMonth ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      Live Month
                    </span>
                  ) : isCurrentSelected ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-neutral-800 text-neutral-300 border border-neutral-700">
                      Selected
                    </span>
                  ) : null}
                </div>
                <div>
                  {isUnlocked ? (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-400 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Unlocked for editing</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-neutral-800/80 border border-neutral-700/60 text-xs text-neutral-400 font-medium">
                      <Lock className="w-3 h-3 text-neutral-400" />
                      <span>Archived (Read-Only)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between mt-6 pt-4 border-t border-neutral-800 gap-2">
                <button
                  onClick={() => onSelectMonthYear(selectedYear, monthNum)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                >
                  View Attendance <ArrowRight className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => handleToggle(selectedYear, monthNum)}
                  disabled={isProcessing}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    isProcessing 
                      ? 'opacity-70 cursor-wait bg-neutral-800 text-neutral-400 border border-neutral-700'
                      : !isAdmin
                        ? 'bg-neutral-800 text-neutral-400 hover:text-amber-300 hover:bg-neutral-700 border border-neutral-700'
                        : isUnlocked 
                          ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/40' 
                          : 'bg-neutral-800 text-neutral-200 hover:text-white hover:bg-neutral-700 border border-neutral-700'
                  }`}
                  title={
                    !isAdmin 
                      ? 'Admin sign-in required to lock/unlock months'
                      : isUnlocked 
                        ? 'Click to lock and archive this month' 
                        : 'Click to unlock this month for editing'
                  }
                >
                  {isProcessing ? (
                    <div className="w-3 h-3 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  ) : !isAdmin ? (
                    <Shield className="w-3.5 h-3.5 text-amber-500/80" />
                  ) : isUnlocked ? (
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Unlock className="w-3.5 h-3.5 text-amber-400" />
                  )}
                  <span>
                    {isProcessing 
                      ? 'Saving...' 
                      : !isAdmin 
                        ? 'Admin Only'
                        : isUnlocked 
                          ? 'Lock Month' 
                          : 'Unlock Month'}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

