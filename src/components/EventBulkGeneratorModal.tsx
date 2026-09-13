import React, { useState, useEffect, useMemo } from 'react';
import { EventType, Settings } from '../types';
import { X, Calendar, Sparkles, Clock, Check, AlertCircle } from 'lucide-react';
import { format12HourTime } from '../utils/calculations';

interface EventBulkGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTypes: EventType[];
  selectedYear: number;
  selectedMonth: number;
  settings?: Settings;
  onGenerate: (selectedEventTypeId: string, weekdays: number[], points: number, time?: string) => Promise<void> | void;
}

const WEEKDAYS = [
  { id: 1, label: 'Mon', fullLabel: 'Monday' },
  { id: 2, label: 'Tue', fullLabel: 'Tuesday' },
  { id: 3, label: 'Wed', fullLabel: 'Wednesday' },
  { id: 4, label: 'Thu', fullLabel: 'Thursday' },
  { id: 5, label: 'Fri', fullLabel: 'Friday' },
  { id: 6, label: 'Sat', fullLabel: 'Saturday' },
  { id: 0, label: 'Sun', fullLabel: 'Sunday' },
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const EventBulkGeneratorModal: React.FC<EventBulkGeneratorModalProps> = ({
  isOpen,
  onClose,
  eventTypes,
  selectedYear,
  selectedMonth,
  settings,
  onGenerate
}) => {
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>(settings?.defaultEventTypeId || '');
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(settings?.defaultEventWeekdays || [2]); // Default Tuesday
  const [points, setPoints] = useState<number>(7);
  const [time, setTime] = useState<string>(settings?.defaultEventTime || '');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Synchronize initial event type when modal opens or event types load
  useEffect(() => {
    if (isOpen && eventTypes.length > 0) {
      if (!selectedEventTypeId || !eventTypes.some(et => et.id === selectedEventTypeId)) {
        const defaultET = settings?.defaultEventTypeId && eventTypes.some(et => et.id === settings.defaultEventTypeId)
          ? eventTypes.find(et => et.id === settings.defaultEventTypeId)!
          : eventTypes[0];
        setSelectedEventTypeId(defaultET.id);
        const effectivePts = settings?.eventPointConfiguration?.[defaultET.id] ?? defaultET.points;
        setPoints(effectivePts);
      } else {
        const found = eventTypes.find(et => et.id === selectedEventTypeId);
        if (found) {
          const effectivePts = settings?.eventPointConfiguration?.[found.id] ?? found.points;
          setPoints(effectivePts);
        }
      }
      
      if (settings?.defaultEventWeekdays) {
        setSelectedWeekdays(settings.defaultEventWeekdays);
      }
      if (settings?.defaultEventTime !== undefined) {
        setTime(settings.defaultEventTime);
      }
      
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, eventTypes, settings]);

  // Preview generated dates
  const previewDates = useMemo(() => {
    if (!isOpen || selectedWeekdays.length === 0) return [];
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
    const dates: { day: number; formatted: string }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(selectedYear, selectedMonth - 1, day);
      if (selectedWeekdays.includes(dateObj.getDay())) {
        const formatted = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        dates.push({ day, formatted });
      }
    }
    return dates;
  }, [isOpen, selectedYear, selectedMonth, selectedWeekdays]);

  if (!isOpen) return null;

  const activeEventTypes = eventTypes.filter(et => et.active);
  const displayEventTypes = activeEventTypes.length > 0 ? activeEventTypes : eventTypes;

  const handleEventTypeChange = (id: string) => {
    setSelectedEventTypeId(id);
    const found = eventTypes.find(et => et.id === id);
    if (found) {
      const effectivePts = settings?.eventPointConfiguration?.[found.id] ?? found.points;
      setPoints(effectivePts);
    }
  };

  const toggleWeekday = (dayId: number) => {
    setError(null);
    if (selectedWeekdays.includes(dayId)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== dayId));
    } else {
      setSelectedWeekdays([...selectedWeekdays, dayId]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const effectiveEventTypeId = selectedEventTypeId || displayEventTypes[0]?.id;

    if (!effectiveEventTypeId) {
      setError('Please select or create an event type first.');
      return;
    }

    if (selectedWeekdays.length === 0) {
      setError('Please select at least one weekday.');
      return;
    }

    if (previewDates.length === 0) {
      setError(`No matching days found in ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear}.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await onGenerate(
        effectiveEventTypeId, 
        selectedWeekdays, 
        Number(points) || 0, 
        time.trim() ? time.trim() : undefined
      );
      onClose();
    } catch (err) {
      console.error('Failed in modal submit:', err);
      setError('Failed to generate events. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl text-white my-8">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Bulk Event Generator</h2>
            <p className="text-xs text-neutral-400">
              Generate recurring events for <span className="text-amber-400 font-semibold">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</span>
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Event Type</label>
            <select
              value={selectedEventTypeId || displayEventTypes[0]?.id || ''}
              onChange={(e) => handleEventTypeChange(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              {displayEventTypes.map(et => (
                <option key={et.id} value={et.id}>
                  {et.icon} {et.name} ({settings?.eventPointConfiguration?.[et.id] ?? et.points} pts)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Points for Generated Events</label>
            <input
              type="number"
              min="0"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-neutral-400 flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" /> Time (Optional)
              </label>
              {time && (
                <button
                  type="button"
                  onClick={() => setTime('')}
                  className="text-[10px] text-neutral-400 hover:text-amber-400 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] text-neutral-500">Presets:</span>
              {['13:00', '19:00', '20:00', '20:30', '21:00'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setTime(preset)}
                  className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                    time === preset
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                  }`}
                >
                  {format12HourTime(preset)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-2">Repeat on Weekdays</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WEEKDAYS.map(day => (
                <button 
                  type="button"
                  key={day.id} 
                  onClick={() => toggleWeekday(day.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedWeekdays.includes(day.id)
                      ? 'bg-amber-500/15 border-amber-500/60 text-white font-semibold'
                      : 'bg-neutral-800/40 border-neutral-700/60 text-neutral-400 hover:bg-neutral-800'
                  }`}
                >
                  <span>{day.fullLabel}</span>
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center transition-colors shrink-0 ${
                      selectedWeekdays.includes(day.id)
                        ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                        : 'border border-neutral-700 bg-neutral-800'
                    }`}
                  >
                    {selectedWeekdays.includes(day.id) && (
                      <Check className="w-3 h-3 text-neutral-950 stroke-[3.5]" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Schedule Preview Box */}
          <div className="p-3.5 bg-neutral-950/70 border border-neutral-800 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400 font-medium">Generation Summary:</span>
              <span className="font-bold text-amber-400 font-mono">
                {previewDates.length} Events to create
              </span>
            </div>
            {previewDates.length > 0 ? (
              <p className="text-[11px] text-neutral-400 truncate">
                Dates: {previewDates.map(d => `${MONTH_NAMES[selectedMonth - 1].substring(0, 3)} ${d.day}`).join(', ')}
              </p>
            ) : (
              <p className="text-[11px] text-red-400/80">
                Select at least one weekday above to generate events.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || previewDates.length === 0}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-neutral-950 text-xs font-bold transition-all shadow-md shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <span>Generate {previewDates.length} Events</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
