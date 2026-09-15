import React, { useState } from 'react';
import { ClanEvent, EventType, Settings } from '../types';
import { CalendarDays, ChevronLeft, ChevronRight, Award, Clock, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { ActiveTab } from './Navbar';
import { format12HourTime, getEventEffectivePoints } from '../utils/calculations';
import { getEventColorTheme, getEventTypeColorTheme } from '../utils/eventColors';
import { EventDropsSection } from './EventDropsSection';

interface CalendarViewProps {
  events: ClanEvent[];
  eventTypes: EventType[];
  selectedYear: number;
  selectedMonth: number;
  onSelectYearMonth: (year: number, month: number) => void;
  onNavigate: (tab: ActiveTab) => void;
  onNavigateSettingsSchedule: () => void;
  settings: Settings;
  isAdmin: boolean;
  adminUid: string;
  onOpenAuth: () => void;
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
  onNavigateSettingsSchedule,
  settings,
  isAdmin,
  adminUid,
  onOpenAuth
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
      <div className="flex flex-wrap items-center justify-between gap-4 bg-neutral-900/60 border border-neutral-800/80 p-4 rounded-2xl shadow-md">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 mr-1">Event Types:</span>
          {eventTypes.map(et => {
            const theme = getEventTypeColorTheme(et);
            const effPoints = settings?.eventPointConfiguration?.[et.id] ?? et.points;
            return (
              <div 
                key={et.id} 
                className="flex items-center gap-2 text-xs font-semibold px-2.5 py-1.5 rounded-xl border transition-all shadow-sm"
                style={{
                  backgroundColor: `rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.12)`,
                  borderColor: `rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.35)`,
                  color: '#ffffff'
                }}
              >
                <span 
                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                  style={{
                    backgroundColor: theme.hex,
                    boxShadow: `0 0 6px ${theme.hex}`
                  }}
                />
                <span className="text-sm select-none">{theme.icon}</span>
                <span>{et.name}</span>
                <span 
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded-md ml-0.5"
                  style={{
                    backgroundColor: `rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.25)`,
                    color: theme.lightHex,
                    border: `1px solid rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.4)`
                  }}
                >
                  +{effPoints}p
                </span>
              </div>
            );
          })}
          {eventTypes.length === 0 && (
            <span className="text-xs text-neutral-500 italic">No event types defined yet</span>
          )}
        </div>
        <button
          onClick={onNavigateSettingsSchedule}
          className="text-xs bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-3.5 py-2 rounded-xl font-semibold transition-all flex items-center gap-1.5 shadow-sm ml-auto"
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

                <div className="space-y-1.5 overflow-y-auto max-h-[96px] pr-0.5 mt-1">
                  {dayEvents.map(ev => {
                    const theme = getEventColorTheme(ev, eventTypes);
                    const effectivePts = getEventEffectivePoints(ev, eventTypes, settings);

                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setSelectedEventDetails(ev)}
                        style={{
                          backgroundColor: `rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.14)`,
                          borderColor: `rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.35)`,
                          borderLeftColor: theme.hex,
                          borderLeftWidth: '3.5px'
                        }}
                        className="group w-full border rounded-lg p-1.5 text-left transition-all cursor-pointer shadow-sm hover:brightness-125 hover:shadow-md hover:scale-[1.01] focus:outline-none block"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1 min-w-0">
                            <span className="text-[11px] shrink-0 select-none leading-none">{theme.icon}</span>
                            <p 
                              className="text-[11px] font-bold truncate text-white group-hover:underline underline-offset-2"
                            >
                              {ev.name}
                            </p>
                          </div>
                          <span 
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 font-mono"
                            style={{
                              backgroundColor: `rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.28)`,
                              color: theme.lightHex,
                              border: `1px solid rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.45)`
                            }}
                          >
                            +{effectivePts}p
                          </span>
                        </div>
                        {ev.time && (
                          <div 
                            className="flex items-center gap-1 mt-0.5 text-[9px] font-mono font-semibold"
                            style={{ color: theme.lightHex }}
                          >
                            <Clock className="w-2.5 h-2.5 shrink-0" />
                            <span>{format12HourTime(ev.time)}</span>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEventDetails && (() => {
        const modalTheme = getEventColorTheme(selectedEventDetails, eventTypes);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white space-y-4">
              <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-md shrink-0"
                    style={{
                      backgroundColor: `rgba(${modalTheme.rgb.r}, ${modalTheme.rgb.g}, ${modalTheme.rgb.b}, 0.2)`,
                      border: `1px solid rgba(${modalTheme.rgb.r}, ${modalTheme.rgb.g}, ${modalTheme.rgb.b}, 0.4)`,
                      color: modalTheme.hex
                    }}
                  >
                    {modalTheme.icon}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{selectedEventDetails.name}</h3>
                    <p className="text-xs text-neutral-400">Scheduled Event Details</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedEventDetails(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded-lg bg-neutral-800/60 transition-colors"
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
                    <span 
                      className="font-bold flex items-center gap-1.5 font-mono"
                      style={{ color: modalTheme.lightHex }}
                    >
                      <Clock className="w-3.5 h-3.5" /> {format12HourTime(selectedEventDetails.time)}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-2 border-b border-neutral-800/60">
                  <span className="text-neutral-400 text-xs">Points Value</span>
                  <span 
                    className="font-bold flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-mono"
                    style={{
                      backgroundColor: `rgba(${modalTheme.rgb.r}, ${modalTheme.rgb.g}, ${modalTheme.rgb.b}, 0.2)`,
                      color: modalTheme.lightHex,
                      border: `1px solid rgba(${modalTheme.rgb.r}, ${modalTheme.rgb.g}, ${modalTheme.rgb.b}, 0.4)`
                    }}
                  >
                    <Award className="w-3.5 h-3.5" /> +{getEventEffectivePoints(selectedEventDetails, eventTypes, settings)} Points
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-neutral-400 text-xs">Status</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    Active
                  </span>
                </div>
              </div>

              <EventDropsSection
                event={selectedEventDetails}
                settings={settings}
                isAdmin={isAdmin}
                adminUid={adminUid}
                onOpenAuth={onOpenAuth}
              />

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
        );
      })()}
    </div>
  );
};
