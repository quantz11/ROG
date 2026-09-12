import React from 'react';
import { MemberMonthlyStats, ClanEvent, EventType, Settings } from '../types';
import { Users, Calendar, CheckCircle2, XCircle, Trophy, BarChart2, ArrowRight } from 'lucide-react';
import { ActiveTab } from './Navbar';

interface DashboardViewProps {
  memberStats: MemberMonthlyStats[];
  events: ClanEvent[];
  eventTypes: EventType[];
  settings: Settings;
  selectedYear: number;
  selectedMonth: number;
  onNavigate: (tab: ActiveTab) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  memberStats,
  events,
  settings,
  selectedYear,
  selectedMonth,
  onNavigate
}) => {
  const activeMembersCount = memberStats.filter(m => m.active).length;
  const eventsThisMonthCount = events.filter(e => e.active).length;
  const eligibleCount = memberStats.filter(m => m.isEligible).length;
  const notEligibleCount = memberStats.length - eligibleCount;

  const highestScore = memberStats.length > 0 ? Math.max(...memberStats.map(m => m.scorePercentage)) : 0;
  const averageAttendance = memberStats.length > 0 
    ? Math.round(memberStats.reduce((acc, m) => acc + m.scorePercentage, 0) / memberStats.length) 
    : 0;

  const topMembers = [...memberStats].slice(0, 5);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-neutral-900 via-neutral-900 to-amber-950/40 border border-neutral-800 rounded-2xl p-6 relative overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative z-10">
          <span className="text-xs uppercase font-bold tracking-widest text-amber-400">ROG Clan Portal</span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {settings.clanName} Attendance Overview
          </h2>
          <p className="text-sm text-neutral-400 mt-1 max-w-2xl">
            Monitoring active members, events, points, and wage eligibility for <strong className="text-white">{MONTH_NAMES[selectedMonth - 1]} {selectedYear}</strong>.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <button
              onClick={() => onNavigate('attendance')}
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-4 py-2.5 rounded-xl text-sm transition-all shadow-md shadow-amber-500/20 flex items-center gap-2"
            >
              Manage Attendance <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate('ranking')}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-medium px-4 py-2.5 rounded-xl text-sm transition-all border border-neutral-700/60 flex items-center gap-2"
            >
              View Rankings <Trophy className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Active Members */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Active Members</p>
            <h3 className="text-3xl font-black text-white mt-1">{activeMembersCount}</h3>
            <p className="text-xs text-neutral-500 mt-1">Total roster strength</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Events This Month */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Events This Month</p>
            <h3 className="text-3xl font-black text-white mt-1">{eventsThisMonthCount}</h3>
            <p className="text-xs text-neutral-500 mt-1">Scheduled for {MONTH_NAMES[selectedMonth - 1]}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Wage Eligible */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Wage Eligible</p>
            <h3 className="text-3xl font-black text-emerald-400 mt-1">{eligibleCount}</h3>
            <p className="text-xs text-neutral-500 mt-1">Meeting {settings.minimumScorePercentage}% & ISW rules</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* Not Eligible */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Not Eligible</p>
            <h3 className="text-3xl font-black text-red-400 mt-1">{notEligibleCount}</h3>
            <p className="text-xs text-neutral-500 mt-1">Below eligibility criteria</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <XCircle className="w-6 h-6" />
          </div>
        </div>

        {/* Highest Score */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Highest Score</p>
            <h3 className="text-3xl font-black text-amber-400 mt-1">{highestScore}%</h3>
            <p className="text-xs text-neutral-500 mt-1">Top performer mark</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Trophy className="w-6 h-6" />
          </div>
        </div>

        {/* Average Attendance */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex items-center justify-between shadow-lg">
          <div>
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Average Attendance</p>
            <h3 className="text-3xl font-black text-white mt-1">{averageAttendance}%</h3>
            <p className="text-xs text-neutral-500 mt-1">Clan average score</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            <BarChart2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Top Performers Preview */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            Top Members This Month
          </h3>
          <button
            onClick={() => onNavigate('ranking')}
            className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
          >
            View All Rankings <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-neutral-800">
          {topMembers.length === 0 ? (
            <p className="text-sm text-neutral-500 py-4 text-center">No member statistics available for this month.</p>
          ) : (
            topMembers.map((m, idx) => (
              <div key={m.memberId} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    idx === 0 ? 'bg-amber-500 text-neutral-950' :
                    idx === 1 ? 'bg-neutral-300 text-neutral-950' :
                    idx === 2 ? 'bg-amber-700 text-white' : 'bg-neutral-800 text-neutral-400'
                  }`}>
                    {idx + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-white">{m.memberName}</p>
                    <p className="text-xs text-neutral-400">{m.totalPoints} pts total</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-sm font-bold text-amber-400">{m.scorePercentage}%</span>
                    <p className="text-[10px] text-neutral-500">Score</p>
                  </div>
                  <div>
                    {m.isEligible ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Eligible
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                        Not Eligible
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
