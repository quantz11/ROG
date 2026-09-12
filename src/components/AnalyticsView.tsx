import React from 'react';
import { MemberMonthlyStats, ClanEvent, EventType, AttendanceRecord, Settings } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BarChart3, PieChart as PieIcon, CheckCircle2, XCircle } from 'lucide-react';

interface AnalyticsViewProps {
  memberStats: MemberMonthlyStats[];
  events: ClanEvent[];
  eventTypes: EventType[];
  attendance: AttendanceRecord[];
  settings: Settings;
  selectedYear: number;
  selectedMonth: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  memberStats,
  events,
  eventTypes,
  attendance,
  settings,
  selectedYear,
  selectedMonth
}) => {
  // 1. Attendance Rate by Event Type
  const eventTypeMap = new Map<string, EventType>();
  eventTypes.forEach(et => eventTypeMap.set(et.id, et));

  const eventTypeStats: Record<string, { name: string; totalAttended: number; totalPossible: number }> = {};
  eventTypes.forEach(et => {
    eventTypeStats[et.id] = { name: et.shortName || et.name, totalAttended: 0, totalPossible: 0 };
  });

  const activeMembersCount = memberStats.filter(m => m.active).length;
  events.filter(e => e.active).forEach(event => {
    const et = eventTypeMap.get(event.eventTypeId);
    const key = event.eventTypeId;
    if (et && eventTypeStats[key]) {
      eventTypeStats[key].totalPossible += activeMembersCount;
    }
  });

  attendance.forEach(att => {
    if (att.attended) {
      // Find event
      const ev = events.find(e => e.id === att.eventId);
      if (ev && eventTypeStats[ev.eventTypeId]) {
        eventTypeStats[ev.eventTypeId].totalAttended += 1;
      }
    }
  });

  const eventTypeChartData = Object.values(eventTypeStats).map(item => ({
    name: item.name,
    rate: item.totalPossible > 0 ? Math.round((item.totalAttended / item.totalPossible) * 100) : 0
  }));

  // 2. Monthly Eligibility Breakdown
  const eligibleCount = memberStats.filter(m => m.isEligible).length;
  const notEligibleCount = memberStats.length - eligibleCount;

  const eligibilityPieData = [
    { name: 'Eligible', value: eligibleCount, color: '#10b981' },
    { name: 'Not Eligible', value: notEligibleCount, color: '#ef4444' }
  ];

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <BarChart3 className="w-5 h-5" />
          <span className="text-xs uppercase font-bold tracking-widest">Analytics & Insights</span>
        </div>
        <h2 className="text-2xl font-black text-white">Attendance Analytics</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Performance metrics for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Rate by Event Type */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-amber-400" />
            Attendance Rate by Event Type (%)
          </h3>
          <div className="h-72 w-full">
            {eventTypeChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-neutral-500 text-sm">
                No event data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventTypeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#737373" fontSize={12} />
                  <YAxis stroke="#737373" fontSize={12} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', color: '#fff' }} 
                    formatter={(value: any) => [`${value}%`, 'Attendance Rate']}
                  />
                  <Bar dataKey="rate" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Monthly Eligibility Breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <PieIcon className="w-5 h-5 text-amber-400" />
            Monthly Wage Eligibility Breakdown
          </h3>
          <div className="h-72 w-full flex items-center justify-center">
            {memberStats.length === 0 ? (
              <div className="text-neutral-500 text-sm">No member statistics available.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eligibilityPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`}
                  >
                    {eligibilityPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#171717', borderColor: '#262626', borderRadius: '12px', color: '#fff' }} 
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
