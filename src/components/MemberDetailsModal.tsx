import React, { useEffect, useState } from 'react';
import { MemberMonthlyStats, ClanEvent, EventType, AttendanceRecord, Settings, ItemDistribution, DroppedItem } from '../types';
import { X, Trophy, CheckCircle2, XCircle, Calendar, ShieldCheck, Gift } from 'lucide-react';
import { format12HourTime, getEventEffectivePoints } from '../utils/calculations';
import { getEventColorTheme } from '../utils/eventColors';
import { getItemDistributionsByMember, getDroppedItemsForMonth } from '../services/dataService';

interface MemberDetailsModalProps {
  memberStats: MemberMonthlyStats | null;
  events: ClanEvent[];
  eventTypes: EventType[];
  attendance: AttendanceRecord[];
  settings: Settings;
  onClose: () => void;
  selectedYear: number;
  selectedMonth: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MemberDetailsModal: React.FC<MemberDetailsModalProps> = ({
  memberStats,
  events,
  eventTypes,
  attendance,
  settings,
  onClose,
  selectedYear,
  selectedMonth
}) => {
  const [distributions, setDistributions] = useState<ItemDistribution[]>([]);
  const [loadingDrops, setLoadingDrops] = useState(true);

  useEffect(() => {
    if (!memberStats) return;
    const fetchDistributions = async () => {
      setLoadingDrops(true);
      try {
        const dists = await getItemDistributionsByMember(memberStats.memberId);
        // Filter by month
        const currentMonthDists = dists.filter(d => d.year === selectedYear && d.month === selectedMonth);
        setDistributions(currentMonthDists);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingDrops(false);
      }
    };
    fetchDistributions();
  }, [memberStats, selectedYear, selectedMonth]);

  if (!memberStats) return null;

  const eventTypeMap = new Map<string, EventType>();
  eventTypes.forEach(et => eventTypeMap.set(et.id, et));

  // Build attendance lookup for this member
  const memberAttendance = new Map<string, boolean>();
  attendance.forEach(a => {
    if (a.memberId === memberStats.memberId) {
      memberAttendance.set(a.eventId, a.attended);
    }
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
            {memberStats.memberName.substring(0, 2).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold">{memberStats.memberName}</h2>
            <p className="text-xs text-neutral-400">
              Monthly Report • {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3 text-center">
            <p className="text-[10px] text-neutral-400 uppercase font-semibold">Total Points</p>
            <p className="text-xl font-black text-amber-400 mt-1">{memberStats.totalPoints} <span className="text-xs text-neutral-500 font-normal">/ {memberStats.maxPoints}</span></p>
          </div>

          <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3 text-center">
            <p className="text-[10px] text-neutral-400 uppercase font-semibold">Score %</p>
            <p className="text-xl font-black text-white mt-1">{memberStats.scorePercentage}%</p>
          </div>

          <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3 text-center">
            <p className="text-[10px] text-neutral-400 uppercase font-semibold">Events Attended</p>
            <p className="text-xl font-black text-white mt-1">{memberStats.eventsAttendedCount} / {memberStats.totalEventsCount}</p>
          </div>

          <div className="bg-neutral-800/60 border border-neutral-700/60 rounded-xl p-3 text-center">
            <p className="text-[10px] text-neutral-400 uppercase font-semibold">Eligibility</p>
            <p className={`text-sm font-bold mt-1 ${memberStats.isEligible ? 'text-emerald-400' : 'text-red-400'}`}>
              {memberStats.isEligible ? '✅ ELIGIBLE' : '❌ NOT ELIGIBLE'}
            </p>
          </div>
        </div>

        {/* Items Distributed List */}
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3 mt-6 flex items-center gap-2">
          <Gift className="w-4 h-4 text-amber-500" /> Items Received
        </h3>
        <div className="divide-y divide-neutral-800 bg-neutral-950/40 rounded-xl border border-neutral-800 overflow-hidden mb-6">
          {loadingDrops ? (
            <p className="text-xs text-neutral-500 p-4 text-center">Loading items...</p>
          ) : distributions.length === 0 ? (
            <p className="text-xs text-neutral-500 p-4 text-center">No items received this month.</p>
          ) : (
            distributions.map(dist => (
              <div key={dist.id} className="p-3.5 flex items-center justify-between hover:bg-neutral-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                    <Gift className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{dist.itemName || 'Unknown Item'}</p>
                    <p className="text-[10px] text-neutral-400">
                      {new Date(dist.distributedAt?.seconds ? dist.distributedAt.toDate() : dist.distributedAt).toLocaleDateString()} {dist.notes ? ` • ${dist.notes}` : ''}
                    </p>
                  </div>
                </div>
                <div className="text-lg font-black text-amber-500">
                  x{dist.quantity}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Event History List */}
        <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-400 mb-3">Event Attendance History</h3>
        <div className="divide-y divide-neutral-800 bg-neutral-950/40 rounded-xl border border-neutral-800 overflow-hidden">
          {events.length === 0 ? (
            <p className="text-xs text-neutral-500 p-4 text-center">No events scheduled for this month.</p>
          ) : (
            events.map(event => {
              const theme = getEventColorTheme(event, eventTypes);
              const attended = memberAttendance.get(event.id) || false;

              return (
                <div 
                  key={event.id} 
                  className="p-3.5 flex items-center justify-between hover:bg-neutral-800/30 transition-colors"
                  style={{
                    borderLeft: `3px solid ${theme.hex}`
                  }}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{theme.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: theme.hex }}
                        />
                        <p className="text-xs font-semibold text-white">{event.name}</p>
                      </div>
                      <p className="text-[10px] text-neutral-400 mt-0.5">
                        {event.date}{event.time ? ` • ${format12HourTime(event.time)}` : ''} • {getEventEffectivePoints(event, eventTypes, settings)} pts
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {attended ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Present (+{getEventEffectivePoints(event, eventTypes, settings)})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                        <XCircle className="w-3.5 h-3.5" /> Absent (+0)
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
