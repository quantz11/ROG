import React, { useState, useMemo, useEffect } from 'react';
import { Member, ClanEvent, EventType, AttendanceRecord, Settings, MemberMonthlyStats } from '../types';
import { ChevronLeft, ChevronRight, Search, Download, Check, X, Shield, Plus, Calendar, Layers, Smartphone, Grid, CheckCircle2, XCircle, Users, AlertCircle, Lock, Unlock } from 'lucide-react';
import { setAttendance, batchSetAttendance } from '../services/dataService';
import { isMonthUnlocked, formatMonthKey, format12HourTime } from '../utils/calculations';

interface AttendanceViewProps {
  members: Member[];
  events: ClanEvent[];
  eventTypes: EventType[];
  attendance: AttendanceRecord[];
  settings: Settings;
  memberStats: MemberMonthlyStats[];
  selectedYear: number;
  selectedMonth: number;
  onMonthChange: (year: number, month: number) => void;
  isAdmin: boolean;
  onOpenAuth: () => void;
  onOpenMemberDetails: (memberId: string) => void;
  onOpenBulkGenerator: () => void;
  onOpenSchedule: () => void;
  onRefreshData: () => void;
  onToggleAttendance?: (memberId: string, eventId: string, attended: boolean) => void;
  onBatchToggleAttendance?: (updates: { memberId: string; eventId: string; attended: boolean }[]) => void;
  onToggleUnlockMonth?: (year: number, month: number) => Promise<void> | void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Stable member order across checkbox changes within a page session.
// Maps monthKey ("year_month") -> Map<memberId, initialIndex>.
// Resets only when the whole page refreshes.
const sessionMemberOrderMap = new Map<string, Map<string, number>>();

export const AttendanceView: React.FC<AttendanceViewProps> = ({
  members,
  events,
  eventTypes,
  attendance,
  settings,
  memberStats,
  selectedYear,
  selectedMonth,
  onMonthChange,
  isAdmin,
  onOpenAuth,
  onOpenMemberDetails,
  onOpenBulkGenerator,
  onOpenSchedule,
  onRefreshData,
  onToggleAttendance,
  onBatchToggleAttendance,
  onToggleUnlockMonth
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'eligible' | 'not_eligible' | 'active' | 'inactive'>('active');
  const [viewMode, setViewMode] = useState<'grid' | 'cards' | 'event_mode'>('grid');
  const [selectedEventForBulk, setSelectedEventForBulk] = useState<string>('');
  const [bulkFeedback, setBulkFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLockToggling, setIsLockToggling] = useState(false);

  const isUnlocked = isMonthUnlocked(selectedYear, selectedMonth, settings.unlockedMonths || []);
  const isLocked = !isUnlocked;

  // Active events sorted from latest to past (descending by date, then descending by time)
  const sortedActiveEvents = useMemo(() => {
    return [...events]
      .filter(e => e.active)
      .sort((a, b) => {
        const dateComp = b.date.localeCompare(a.date); // Latest date first
        if (dateComp !== 0) return dateComp;
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        return timeB.localeCompare(timeA); // Latest time first
      });
  }, [events]);

  // Categorize / group active events by Event Type, with events inside each group sorted latest to past
  const categorizedEvents = useMemo(() => {
    const groups: { eventType: EventType | null; eventTypeId: string; typeName: string; events: ClanEvent[] }[] = [];
    const map = new Map<string, ClanEvent[]>();

    sortedActiveEvents.forEach(ev => {
      if (!map.has(ev.eventTypeId)) {
        map.set(ev.eventTypeId, []);
      }
      map.get(ev.eventTypeId)!.push(ev);
    });

    // Maintain event types order based on eventTypes array
    eventTypes.forEach(et => {
      if (map.has(et.id)) {
        groups.push({
          eventType: et,
          eventTypeId: et.id,
          typeName: `${et.icon || '📅'} ${et.name} (${et.points} pts)`,
          events: map.get(et.id)!
        });
        map.delete(et.id);
      }
    });

    // Any remaining unknown event types
    map.forEach((evList, typeId) => {
      groups.push({
        eventType: null,
        eventTypeId: typeId,
        typeName: evList[0]?.name || 'Other Events',
        events: evList
      });
    });

    return groups;
  }, [sortedActiveEvents, eventTypes]);

  // Sync selectedEventForBulk whenever events change (defaults to the latest event)
  useEffect(() => {
    if (sortedActiveEvents.length > 0) {
      if (!selectedEventForBulk || !sortedActiveEvents.some(e => e.id === selectedEventForBulk)) {
        setSelectedEventForBulk(sortedActiveEvents[0].id);
      }
    } else {
      setSelectedEventForBulk('');
    }
  }, [sortedActiveEvents, selectedEventForBulk]);

  // Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      onMonthChange(selectedYear - 1, 12);
    } else {
      onMonthChange(selectedYear, selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      onMonthChange(selectedYear + 1, 1);
    } else {
      onMonthChange(selectedYear, selectedMonth + 1);
    }
  };

  // Checkbox toggle handler - Instant Optimistic UI update
  const handleCheckboxChange = (memberId: string, eventId: string, currentVal: boolean) => {
    if (!isAdmin) {
      return;
    }

    if (isLocked) {
      setBulkFeedback({
        type: 'error',
        text: `Attendance for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} is locked (Archived). Unlock this month to make changes.`
      });
      setTimeout(() => setBulkFeedback(null), 4000);
      return;
    }

    const newVal = !currentVal;

    // 1. Instant optimistic local state update (<1ms response)
    if (onToggleAttendance) {
      onToggleAttendance(memberId, eventId, newVal);
    }

    // 2. Persist to Firestore in the background without blocking the UI
    const memberObj = members.find(m => m.id === memberId);
    const eventObj = events.find(e => e.id === eventId);
    
    setAttendance(memberId, eventId, newVal, 'admin', {
      memberName: memberObj?.name,
      eventName: eventObj?.name,
      eventDate: eventObj?.date
    }).catch(err => {
      console.error('Failed to save attendance in background:', err);
      // Revert optimistic update on failure
      if (onToggleAttendance) {
        onToggleAttendance(memberId, eventId, currentVal);
      }
      setBulkFeedback({
        type: 'error',
        text: 'Network error: Failed to save attendance to database. Reverted.'
      });
      setTimeout(() => setBulkFeedback(null), 4000);
    });
  };

  // Group events by EventType
  const eventTypeMap = new Map<string, EventType>();
  eventTypes.forEach(et => eventTypeMap.set(et.id, et));

  const eventsByType: { eventType: EventType; events: ClanEvent[] }[] = [];
  eventTypes.forEach(et => {
    const matchedEvents = events.filter(e => e.eventTypeId === et.id && e.active);
    if (matchedEvents.length > 0) {
      eventsByType.push({ eventType: et, events: matchedEvents });
    }
  });

  const currentBulkEventId = selectedEventForBulk || sortedActiveEvents[0]?.id || '';
  const currentBulkEvent = sortedActiveEvents.find(e => e.id === currentBulkEventId);

  const monthKey = `${selectedYear}_${selectedMonth}`;

  // Stable ordered member stats: preserve the initial load order across checkbox toggles
  // Only re-sorts when the entire page refreshes
  const stableOrderedMemberStats = useMemo(() => {
    let orderMap = sessionMemberOrderMap.get(monthKey);

    if (!orderMap && memberStats.length > 0) {
      orderMap = new Map<string, number>();
      memberStats.forEach((m, idx) => {
        orderMap!.set(m.memberId, idx);
      });
      sessionMemberOrderMap.set(monthKey, orderMap);
    } else if (orderMap) {
      // Append any newly added members to the end of the order list
      memberStats.forEach(m => {
        if (!orderMap!.has(m.memberId)) {
          orderMap!.set(m.memberId, orderMap!.size);
        }
      });
    }

    if (!orderMap) return memberStats;

    return [...memberStats].sort((a, b) => {
      const orderA = orderMap!.get(a.memberId) ?? 999999;
      const orderB = orderMap!.get(b.memberId) ?? 999999;
      return orderA - orderB;
    });
  }, [memberStats, monthKey]);

  // Filter members using stable ordered stats
  const filteredStats = stableOrderedMemberStats.filter(m => {
    const matchesSearch = m.memberName.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterType === 'eligible') return m.isEligible;
    if (filterType === 'not_eligible') return !m.isEligible;
    if (filterType === 'active') return m.active;
    if (filterType === 'inactive') return !m.active;
    return true;
  });

  // Count present/absent for selected bulk event
  const bulkEventStats = useMemo(() => {
    if (!currentBulkEventId) return { present: 0, absent: 0, total: 0 };
    let present = 0;
    let absent = 0;
    filteredStats.forEach(stat => {
      if (stat.attendanceMap[currentBulkEventId]) {
        present++;
      } else {
        absent++;
      }
    });
    return { present, absent, total: filteredStats.length };
  }, [currentBulkEventId, filteredStats]);

  // CSV Export
  const handleExportCSV = () => {
    let csv = 'Member,Events Attended,Total Points,Max Points,Score %,Eligibility\n';
    stableOrderedMemberStats.forEach(m => {
      csv += `"${m.memberName}",${m.eventsAttendedCount}/${m.totalEventsCount},${m.totalPoints},${m.maxPoints},${m.scorePercentage}%,${m.isEligible ? 'Eligible' : 'Not Eligible'}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `ROG_Attendance_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bulk mark for Event Mode - Instant Optimistic update
  const handleBulkMark = async (attended: boolean) => {
    if (!isAdmin) {
      onOpenAuth();
      return;
    }

    if (isLocked) {
      setBulkFeedback({
        type: 'error',
        text: `Attendance for ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} is locked (Archived). Unlock this month to make changes.`
      });
      setTimeout(() => setBulkFeedback(null), 4000);
      return;
    }

    const targetEventId = currentBulkEventId;
    if (!targetEventId) {
      setBulkFeedback({
        type: 'error',
        text: 'Please create or select an event first.'
      });
      setTimeout(() => setBulkFeedback(null), 3000);
      return;
    }

    const updates = filteredStats.map(m => ({
      memberId: m.memberId,
      eventId: targetEventId,
      attended
    }));

    if (updates.length === 0) {
      setBulkFeedback({
        type: 'error',
        text: 'No members match the current search/filter.'
      });
      setTimeout(() => setBulkFeedback(null), 3000);
      return;
    }

    // 1. Instant optimistic update in UI (<1ms)
    if (onBatchToggleAttendance) {
      onBatchToggleAttendance(updates);
    }

    const targetEvent = events.find(e => e.id === targetEventId);
    setBulkFeedback({
      type: 'success',
      text: `✓ Marked all ${updates.length} members as ${attended ? 'PRESENT' : 'ABSENT'} for "${targetEvent?.name || 'Event'}"`
    });
    setTimeout(() => setBulkFeedback(null), 4000);

    // 2. Persist in background without blocking UI
    try {
      const summary = `Marked ${updates.length} members as ${attended ? 'PRESENT' : 'ABSENT'} for "${targetEvent?.name || 'Event'}" (${targetEvent?.date || ''})`;
      await batchSetAttendance(updates, 'admin', summary);
    } catch (err) {
      console.error('Bulk update failed in background:', err);
      setBulkFeedback({
        type: 'error',
        text: 'Network issue: Failed to save changes to database.'
      });
      setTimeout(() => setBulkFeedback(null), 5000);
    }
  };

  // Find required event type shortName
  const requiredEventType = eventTypes.find(et => et.id === settings.requiredEventTypeId);
  const requiredEventShortName = requiredEventType?.shortName || 'REQ';

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Top Header & Month Navigation */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg flex flex-col gap-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-amber-400 mb-1">
              <Calendar className="w-5 h-5" />
              <span className="text-xs uppercase font-bold tracking-widest">ROG Attendance Tracker</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </h2>
          </div>

          {/* Month / Year Navigator */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-neutral-800 rounded-xl p-1 border border-neutral-700/60">
              <button
                onClick={handlePrevMonth}
                className="p-2 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <div className="px-3 flex items-center gap-2">
                <select
                  value={selectedMonth}
                  onChange={(e) => onMonthChange(selectedYear, Number(e.target.value))}
                  className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
                >
                  {MONTH_NAMES.map((name, idx) => (
                    <option key={name} value={idx + 1} className="bg-neutral-900 text-white">{name}</option>
                  ))}
                </select>

                <select
                  value={selectedYear}
                  onChange={(e) => onMonthChange(Number(e.target.value), selectedMonth)}
                  className="bg-transparent text-white font-semibold text-xs focus:outline-none cursor-pointer"
                >
                  {[2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={y} className="bg-neutral-900 text-white">{y}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2.5 rounded-xl text-xs transition-all border border-neutral-700/60"
            >
              <Download className="w-4 h-4 text-amber-400" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Controls Bar: Search, Filters, View Modes */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-neutral-800">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search member..."
                className="w-full bg-neutral-800/80 border border-neutral-700/60 rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-neutral-800 border border-neutral-700/60 text-white text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
            >
              <option value="active">Active Members</option>
              <option value="all">All Members</option>
              <option value="eligible">Wage Eligible</option>
              <option value="not_eligible">Not Eligible</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenSchedule}
              className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-2 rounded-xl transition-colors border border-neutral-700/60 cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Manage Schedule</span>
            </button>

            <button
              onClick={() => {
                if (!isAdmin) {
                  onOpenAuth();
                  return;
                }
                if (isLocked) {
                  setBulkFeedback({
                    type: 'error',
                    text: `Cannot generate events: ${MONTH_NAMES[selectedMonth - 1]} ${selectedYear} is locked. Unlock this month first.`
                  });
                  setTimeout(() => setBulkFeedback(null), 4000);
                  return;
                }
                onOpenBulkGenerator();
              }}
              className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-3 py-2 rounded-xl transition-colors border border-neutral-700/60 cursor-pointer"
              title={isAdmin ? (isLocked ? 'Month is locked. Unlock to generate events.' : 'Bulk Generate Events') : 'Bulk generate recurring events for this month'}
            >
              {isLocked ? (
                <Lock className="w-3.5 h-3.5 text-amber-500/70" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-amber-400" />
              )}
              <span>Bulk Generate</span>
            </button>

            <div className="flex items-center bg-neutral-800 rounded-xl p-1 border border-neutral-700/60">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'grid' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
                title="Spreadsheet Grid"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'cards' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
                title="Mobile Cards"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
              <button
                onClick={() => setViewMode('event_mode')}
                className={`p-2 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === 'event_mode' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-white'
                }`}
                title="Event Bulk Mode"
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Event Mode</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Month Lock / Archive Status Banner */}
      {isLocked ? (
        <div className="bg-amber-950/20 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                  Archived Period (Read-Only)
                </h4>
                <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold">
                  Locked
                </span>
              </div>
              <p className="text-xs text-neutral-300 mt-0.5">
                Attendance records for <strong className="text-white">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong> are locked to preserve historical data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin ? (
              <button
                onClick={async () => {
                  if (onToggleUnlockMonth) {
                    setIsLockToggling(true);
                    try {
                      await onToggleUnlockMonth(selectedYear, selectedMonth);
                    } finally {
                      setIsLockToggling(false);
                    }
                  }
                }}
                disabled={isLockToggling}
                className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                {isLockToggling ? (
                  <div className="w-3.5 h-3.5 border-2 border-neutral-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Unlock className="w-3.5 h-3.5" />
                )}
                <span>{isLockToggling ? 'Unlocking...' : 'Unlock Month for Editing'}</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuth}
                className="w-full sm:w-auto bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold px-4 py-2 rounded-xl text-xs transition-colors border border-neutral-700 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>Admin Login to Unlock</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0 ml-1" />
            <div>
              <p className="text-xs text-emerald-300 font-medium">
                Editing enabled for <strong className="text-white">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong>
              </p>
            </div>
          </div>

          {isAdmin && onToggleUnlockMonth && (
            <button
              onClick={async () => {
                setIsLockToggling(true);
                try {
                  await onToggleUnlockMonth(selectedYear, selectedMonth);
                } finally {
                  setIsLockToggling(false);
                }
              }}
              disabled={isLockToggling}
              className="text-xs text-neutral-400 hover:text-amber-300 transition-colors flex items-center gap-1.5 self-end sm:self-auto cursor-pointer"
              title="Lock and archive this month to protect historical records"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{isLockToggling ? 'Locking...' : 'Lock and Archive Month'}</span>
            </button>
          )}
        </div>
      )}

      {/* VIEW MODE: SPREADSHEET GRID */}
      {viewMode === 'grid' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto max-h-[75vh]">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                {/* Event Type Header Row */}
                <tr className="bg-neutral-950 border-b border-neutral-800 text-xs font-bold text-neutral-300">
                  <th className="py-3 px-4 sticky left-0 z-20 bg-neutral-950 border-r border-neutral-800 min-w-[200px]">
                    Member Name
                  </th>
                  {eventsByType.map(group => (
                    <th 
                      key={group.eventType.id} 
                      colSpan={group.events.length}
                      className="py-3 px-3 text-center border-r border-neutral-800 uppercase tracking-wider"
                      style={{ color: group.eventType.color || '#f59e0b' }}
                    >
                      {group.eventType.icon} {group.eventType.name} — {group.eventType.points} pts
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center border-l border-neutral-800 bg-neutral-950 sticky right-[250px] z-20">
                    {requiredEventShortName}
                  </th>
                  <th className="py-3 px-4 text-center border-l border-neutral-800 bg-neutral-950 sticky right-[160px] z-20">
                    Points
                  </th>
                  <th className="py-3 px-4 text-center border-l border-neutral-800 bg-neutral-950 sticky right-[80px] z-20">
                    Score %
                  </th>
                  <th className="py-3 px-4 text-center border-l border-neutral-800 bg-neutral-950 sticky right-0 z-20">
                    Eligible
                  </th>
                </tr>

                {/* Event Date Header Row */}
                <tr className="bg-neutral-900/90 border-b border-neutral-800 text-[11px] text-neutral-400">
                  <th className="py-2 px-4 sticky left-0 z-20 bg-neutral-900 border-r border-neutral-800">
                    Schedule Dates
                  </th>
                  {eventsByType.map(group => 
                    group.events.map(ev => (
                      <th key={ev.id} className="py-2 px-2 text-center border-r border-neutral-800 whitespace-nowrap">
                        <span className="font-mono">{ev.date.substring(5)}</span>
                        {ev.time && (
                          <span className="block text-[9px] text-amber-400 font-mono font-semibold">{format12HourTime(ev.time)}</span>
                        )}
                      </th>
                    ))
                  )}
                  <th className="py-2 px-4 text-center border-l border-neutral-800 bg-neutral-900 sticky right-[250px] z-20">
                    Req
                  </th>
                  <th className="py-2 px-4 text-center border-l border-neutral-800 bg-neutral-900 sticky right-[160px] z-20">
                    Total
                  </th>
                  <th className="py-2 px-4 text-center border-l border-neutral-800 bg-neutral-900 sticky right-[80px] z-20">
                    %
                  </th>
                  <th className="py-2 px-4 text-center border-l border-neutral-800 bg-neutral-900 sticky right-0 z-20">
                    Status
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-neutral-800 text-xs">
                {filteredStats.length === 0 ? (
                  <tr>
                    <td colSpan={20} className="py-12 text-center text-neutral-500">
                      No members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredStats.map(stat => {
                    const memberAttendanceMap = stat.attendanceMap;

                    return (
                      <tr 
                        key={stat.memberId} 
                        className={`hover:bg-neutral-800/40 transition-colors ${
                          stat.isEligible ? 'bg-emerald-950/15' : ''
                        }`}
                      >
                        {/* Member Name Sticky Column */}
                        <td className="py-3 px-4 sticky left-0 z-10 bg-neutral-900 border-r border-neutral-800 font-semibold text-white">
                          <button
                            onClick={() => onOpenMemberDetails(stat.memberId)}
                            className="hover:text-amber-400 text-left transition-colors flex items-center gap-2"
                          >
                            <span>{stat.memberName}</span>
                            {!stat.active && <span className="text-[10px] text-neutral-500 font-normal">(Inactive)</span>}
                          </button>
                        </td>

                        {/* Event Attendance Checkboxes */}
                        {eventsByType.map(group => 
                          group.events.map(ev => {
                            const isAttended = memberAttendanceMap[ev.id] || false;

                            return (
                              <td key={ev.id} className="py-3 px-3 text-center border-r border-neutral-800/60">
                                <div className="flex flex-col items-center justify-center">
                                  <label 
                                    className={`relative flex items-center justify-center p-1 ${
                                      isAdmin && !isLocked ? 'cursor-pointer' : 'cursor-default'
                                    }`}
                                    onClick={(e) => {
                                      if (!isAdmin || isLocked) {
                                        e.preventDefault();
                                      }
                                    }}
                                    title={!isAdmin ? 'Read-only view (Admin sign-in required to edit)' : isLocked ? 'Month is locked' : ''}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isAttended}
                                      disabled={!isAdmin || isLocked}
                                      onChange={() => {
                                        if (isAdmin && !isLocked) {
                                          handleCheckboxChange(stat.memberId, ev.id, isAttended);
                                        }
                                      }}
                                      className="sr-only"
                                    />
                                    <div
                                      className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                                        isAttended
                                          ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                                          : 'border border-neutral-700 bg-neutral-800'
                                      }`}
                                    >
                                      {isAttended && (
                                        <Check className="w-3 h-3 text-neutral-950 stroke-[3.5]" />
                                      )}
                                    </div>
                                  </label>
                                </div>
                              </td>
                            );
                          })
                        )}

                        {/* Summary Sticky Columns */}
                        <td className="py-3 px-4 text-center border-l border-neutral-800 bg-neutral-900 sticky right-[250px] z-10 font-semibold">
                          <span className={stat.requiredEventAttendedCount >= settings.minimumRequiredAttendance ? 'text-emerald-400' : 'text-red-400'}>
                            {stat.requiredEventAttendedCount}
                          </span>
                          <span className="text-neutral-500"> / {settings.minimumRequiredAttendance}</span>
                        </td>

                        <td className="py-3 px-4 text-center border-l border-neutral-800 bg-neutral-900 sticky right-[160px] z-10 font-bold text-amber-400">
                          {stat.totalPoints} <span className="text-[10px] text-neutral-500 font-normal">/ {stat.maxPoints}</span>
                        </td>

                        <td className="py-3 px-4 text-center border-l border-neutral-800 bg-neutral-900 sticky right-[80px] z-10 font-bold">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            stat.scorePercentage >= 75 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                            stat.scorePercentage >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {stat.scorePercentage}%
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center border-l border-neutral-800 bg-neutral-900 sticky right-0 z-10 font-bold">
                          {stat.isEligible ? (
                            <span className="text-emerald-400 text-xs">✅ ELIGIBLE</span>
                          ) : (
                            <span className="text-red-400 text-xs">❌ NOT</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE: MOBILE CARDS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStats.map(stat => (
            <div key={stat.memberId} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 shadow-lg">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-neutral-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
                    {stat.memberName.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{stat.memberName}</h3>
                    <p className="text-xs text-neutral-400">{stat.totalPoints} pts total • {stat.scorePercentage}%</p>
                  </div>
                </div>
                <div>
                  {stat.isEligible ? (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      ✅ ELIGIBLE
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                      ❌ NOT ELIGIBLE
                    </span>
                  )}
                </div>
              </div>

              {/* Event checkboxes list for mobile */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {events.map(ev => {
                  const isAttended = stat.attendanceMap[ev.id] || false;
                  const et = eventTypeMap.get(ev.eventTypeId);
                  return (
                    <div key={ev.id} className="flex items-center justify-between p-2.5 bg-neutral-950/60 rounded-xl border border-neutral-800">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{et?.icon || '📅'}</span>
                        <div>
                          <p className="text-xs font-semibold text-white">{ev.name}</p>
                          <p className="text-[10px] text-neutral-400">
                            {ev.date}{ev.time ? ` • ${format12HourTime(ev.time)}` : ''} • {ev.points} pts
                          </p>
                        </div>
                      </div>
                      <label 
                        className={`relative flex items-center p-2 ${
                          isAdmin && !isLocked ? 'cursor-pointer' : 'cursor-default'
                        }`}
                        onClick={(e) => {
                          if (!isAdmin || isLocked) {
                            e.preventDefault();
                          }
                        }}
                        title={!isAdmin ? 'Read-only view (Admin sign-in required to edit)' : isLocked ? 'Month is locked' : ''}
                      >
                        <input
                          type="checkbox"
                          checked={isAttended}
                          disabled={!isAdmin || isLocked}
                          onChange={() => {
                            if (isAdmin && !isLocked) {
                              handleCheckboxChange(stat.memberId, ev.id, isAttended);
                            }
                          }}
                          className="sr-only"
                        />
                        <div
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                            isAttended
                              ? 'bg-amber-500 text-neutral-950 font-bold shadow-xs'
                              : 'border border-neutral-700 bg-neutral-800'
                          }`}
                        >
                          {isAttended && (
                            <Check className="w-3.5 h-3.5 text-neutral-950 stroke-[3.5]" />
                          )}
                        </div>
                      </label>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-800 flex justify-between items-center text-xs text-neutral-400">
                <span>{requiredEventShortName}: {stat.requiredEventAttendedCount} / {settings.minimumRequiredAttendance}</span>
                <button
                  onClick={() => onOpenMemberDetails(stat.memberId)}
                  className="text-amber-400 hover:text-amber-300 font-medium"
                >
                  View Details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODE: EVENT BULK MODE */}
      {viewMode === 'event_mode' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl">
          <div className="max-w-3xl mx-auto space-y-6">
            {sortedActiveEvents.length === 0 ? (
              <div className="text-center py-12 space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                  <Calendar className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">No Events in {MONTH_NAMES[selectedMonth - 1]} {selectedYear}</h3>
                <p className="text-sm text-neutral-400 max-w-md mx-auto">
                  Generate events for this month first to start marking attendance in Event Mode.
                </p>
                <div className="flex justify-center gap-3 pt-2">
                  <button
                    onClick={() => {
                      if (!isAdmin) {
                        onOpenAuth();
                        return;
                      }
                      onOpenBulkGenerator();
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold px-4 py-2 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {!isAdmin && <Shield className="w-3.5 h-3.5" />}
                    Bulk Generate Events
                  </button>
                  <button
                    onClick={onOpenSchedule}
                    className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition-colors border border-neutral-700 cursor-pointer"
                  >
                    Schedule Manager
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Event Selector & Info */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-neutral-400">
                      Select Target Event
                    </label>
                    {currentBulkEvent && (
                      <span className="text-xs font-mono font-bold text-amber-400">
                        {currentBulkEvent.points} Points Available
                      </span>
                    )}
                  </div>

                  <select
                    value={currentBulkEventId}
                    onChange={(e) => setSelectedEventForBulk(e.target.value)}
                    className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                  >
                    {categorizedEvents.map(group => (
                      <optgroup 
                        key={group.eventTypeId} 
                        label={group.typeName} 
                        className="bg-neutral-900 text-amber-400 font-bold py-1"
                      >
                        {group.events.map(ev => {
                          const dateObj = new Date(ev.date + 'T12:00:00Z');
                          const weekdayStr = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
                          return (
                            <option 
                              key={ev.id} 
                              value={ev.id} 
                              className="bg-neutral-800 text-white font-normal py-1.5"
                            >
                              {ev.name} — {ev.date} ({weekdayStr}){ev.time ? ` at ${format12HourTime(ev.time)}` : ''} • {ev.points} pts
                            </option>
                          );
                        })}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Status Tally Bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-neutral-950/60 border border-neutral-800 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-neutral-400 font-medium">Filtered Members</p>
                    <p className="text-xl font-bold text-white">{bulkEventStats.total}</p>
                  </div>
                  <div className="bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-emerald-400 font-medium">Marked Present</p>
                    <p className="text-xl font-bold text-emerald-400">{bulkEventStats.present}</p>
                  </div>
                  <div className="bg-red-950/20 border border-red-800/40 rounded-xl p-3 text-center">
                    <p className="text-[11px] text-red-400 font-medium">Marked Absent</p>
                    <p className="text-xl font-bold text-red-400">{bulkEventStats.absent}</p>
                  </div>
                </div>

                {/* Bulk Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => handleBulkMark(true)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Mark All Present ({filteredStats.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => handleBulkMark(false)}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs sm:text-sm transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
                  >
                    <XCircle className="w-4 h-4" /> Mark All Absent ({filteredStats.length})
                  </button>
                </div>

                {/* Feedback Notification Banner */}
                {bulkFeedback && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in duration-200 ${
                    bulkFeedback.type === 'success' 
                      ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                      : 'bg-red-500/10 border border-red-500/30 text-red-300'
                  }`}>
                    {bulkFeedback.type === 'success' ? (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <span>{bulkFeedback.text}</span>
                  </div>
                )}

                {/* Quick Individual Member Toggle Roster */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-amber-400" />
                      Individual Member Toggles for Selected Event
                    </h4>
                    <span className="text-[11px] text-neutral-500">
                      {isAdmin && !isLocked ? 'Tap any row to toggle' : 'Read-only roster'}
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    {filteredStats.map(stat => {
                      const isAttended = stat.attendanceMap[currentBulkEventId] || false;

                      return (
                        <div
                          key={stat.memberId}
                          onClick={() => {
                            if (isAdmin && !isLocked) {
                              handleCheckboxChange(stat.memberId, currentBulkEventId, isAttended);
                            }
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all select-none ${
                            isAdmin && !isLocked ? 'cursor-pointer' : 'cursor-default'
                          } ${
                            isAttended
                              ? 'bg-emerald-950/25 border-emerald-800/50 hover:bg-emerald-950/40'
                              : 'bg-neutral-950/60 border-neutral-800 hover:bg-neutral-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isAttended ? 'bg-emerald-500/20 text-emerald-400' : 'bg-neutral-800 text-neutral-400'
                            }`}>
                              {stat.memberName.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-xs font-semibold text-white">{stat.memberName}</p>
                              <p className="text-[10px] text-neutral-400">
                                Total: {stat.totalPoints} pts • Score: {stat.scorePercentage}%
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              isAttended ? 'text-emerald-400 bg-emerald-500/10' : 'text-neutral-500 bg-neutral-800'
                            }`}>
                              {isAttended ? 'PRESENT' : 'ABSENT'}
                            </span>
                            <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                              isAttended ? 'bg-emerald-500 text-neutral-950' : 'border border-neutral-700 bg-neutral-800'
                            }`}>
                              {isAttended && <Check className="w-3.5 h-3.5 stroke-[3.5]" />}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
