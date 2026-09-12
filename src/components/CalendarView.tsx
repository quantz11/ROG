import React, { useState } from 'react';
import { ClanEvent, EventType } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, Award, Clock, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { ActiveTab } from './Navbar';
import { format12HourTime } from '../utils/calculations';

interface CalendarViewProps {
  events: ClanEvent[];
  eventTypes: EventType[];
  selectedYear: number;
  selectedMonth: number;
  onSelectYearMonth: (year: number, month: number) => void;
  onNavigate: (tab: ActiveTab) => void;
  onNavigateSettingsSchedule: () => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  eventTypes,
  selectedYear,
  selectedMonth,
  onSelectYearMonth,
  onNavigate,
  onNavigateSettingsSchedule
}) => {
  const [selectedEventDetails, setSelectedEventDetails] = useState<ClanEvent | null>(null);

  // Month navigation helpers
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onSelectYearMonth(selectedYear - 1, 12);
    } else {
      onSelectYearMonth(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onSelectYearMonth(selectedYear + 1, 1);
    } else {
      onSelectYearMonth(selectedYear, selectedMonth + 1);
    }
  };

  // Generate calendar grid days
  const firstDayOfMonth = new Date(selectedYear, selectedMonth - 1, 1).getDay();
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();

  const calendarCells = [];
  // Padding for previous month trailing days
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarCells.push({ day: null, dateStr: '' });
  }

  // Days of current month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarCells.push({ day, dateStr });
  }

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header & Controls */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase font-bold tracking-widest text-amber-400">Schedule & Calendar</span>
          <h2 className="text-2xl font-black text-white mt-1 flex items-center gap-2">
            <CalendarDays className="w-7 h-7 text-amber-400" />
            Event Calendar
          </h2>
          <p className="text-sm text-neutral-400 mt-1">
            Browse all scheduled clan events, war times, and meetings for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-neutral-950/80 border border-neutral-800 p-1.5 rounded-xl">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
            title="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-4 text-sm font-bold text-white tracking-wide">
            {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors"
            title="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend & Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900/60 border border-neutral-800/80 px-5 py-3 rounded-xl">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-xs font-semibold text-neutral-400">Event Types:</span>
          {eventTypes.map(et => (
            <div key={et.id} className="flex items-center gap-2 text-xs text-neutral-300">
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
              {et.name} ({et.points} pts)
            </div>
          ))}
          {eventTypes.length === 0 && (
            <span className="text-xs text-neutral-500 italic">No event types defined yet</span>
          )}
        </div>
        <button
          onClick={onNavigateSettingsSchedule}
          className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" /> Manage & Add Events
        </button>
      </div>

      {/* Calendar Grid */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Days of week header */}
        <div className="grid grid-cols-7 border-b border-neutral-800 bg-neutral-950/60 text-center">
          {DAYS_OF_WEEK.map((d, i) => (
            <div key={i} className="py-3 text-xs font-bold uppercase tracking-wider text-neutral-400">
              {d}
            </div>
          ))}
        </div>

        {/* Calendar Cells Grid */}
        <div className="grid grid-cols-7 auto-rows-fr">
          {calendarCells.map((cell, idx) => {
            if (!cell.day) {
              return (
                <div key={idx} className="min-h-[110px] bg-neutral-950/30 border-b border-r border-neutral-800/50 p-2 opacity-30"></div>
              );
            }

            const dayEvents = events.filter(e => e.date === cell.dateStr && e.active);
            const isToday = 
              cell.day === new Date().getDate() && 
              selectedMonth === new Date().getMonth() + 1 && 
              selectedYear === new Date().getFullYear();

            return (
              <div
                key={idx}
                className={`min-h-[120px] border-b border-r border-neutral-800 p-2 flex flex-col transition-colors hover:bg-neutral-800/30 ${
                  isToday ? 'bg-amber-500/[0.03]' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${
                      isToday
                        ? 'bg-amber-500 text-neutral-950 font-black'
                        : 'text-neutral-300'
                    }`}
                  >
                    {cell.day}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded font-medium">
                      {dayEvents.length} event{dayEvents.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div className="space-y-1 overflow-y-auto max-h-[90px] pr-0.5 mt-1">
                  {dayEvents.map(ev => {
                    const et = eventTypes.find(t => t.id === ev.eventTypeId);
                    return (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEventDetails(ev)}
                        className="group bg-neutral-950 border border-neutral-800 hover:border-amber-500/50 rounded-lg p-1.5 text-left transition-all cursor-pointer shadow-sm"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-[11px] font-bold text-white truncate group-hover:text-amber-400">
                            {ev.name}
                          </p>
                          <span className="text-[9px] font-bold bg-amber-500/20 text-amber-400 px-1 rounded shrink-0">
                            +{ev.points}p
                          </span>
                        </div>
                        {ev.time && (
                          <div className="flex items-center gap-1 mt-0.5 text-[9px] text-amber-300/90 font-mono">
                            <Clock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                            <span>{format12HourTime(ev.time)}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEventDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <CalendarIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedEventDetails.name}</h3>
                  <p className="text-xs text-neutral-400">Scheduled Event Details</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedEventDetails(null)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800/60"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60">
                <span className="text-neutral-400 text-xs">Date</span>
                <span className="font-semibold text-white">{selectedEventDetails.date}</span>
              </div>
              {selectedEventDetails.time && (
                <div className="flex items-center justify-between py-2 border-b border-neutral-800/60">
                  <span className="text-neutral-400 text-xs">Event Time</span>
                  <span className="font-bold text-amber-400 flex items-center gap-1.5 font-mono">
                    <Clock className="w-3.5 h-3.5" /> {format12HourTime(selectedEventDetails.time)}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-neutral-800/60">
                <span className="text-neutral-400 text-xs">Points Value</span>
                <span className="font-bold text-amber-400 flex items-center gap-1">
                  <Award className="w-4 h-4" /> +{selectedEventDetails.points} Points
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-neutral-400 text-xs">Status</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Active
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                onClick={() => {
                  setSelectedEventDetails(null);
                  onNavigate('attendance');
                }}
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold text-xs transition-colors shadow-lg shadow-amber-500/20"
              >
                Mark Attendance for this Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
