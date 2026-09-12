import React, { useState } from 'react';
import { MemberMonthlyStats, Settings } from '../types';
import { Trophy, Award, Medal, Filter } from 'lucide-react';

interface RankingViewProps {
  memberStats: MemberMonthlyStats[];
  settings: Settings;
  selectedYear: number;
  selectedMonth: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June', 
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const RankingView: React.FC<RankingViewProps> = ({
  memberStats,
  settings,
  selectedYear,
  selectedMonth
}) => {
  const [limitCount, setLimitCount] = useState<number>(10);
  const [filterType, setFilterType] = useState<'all' | 'eligible' | 'not_eligible'>('all');

  const filtered = memberStats.filter(m => {
    if (filterType === 'eligible') return m.isEligible;
    if (filterType === 'not_eligible') return !m.isEligible;
    return true;
  });

  const displayedMembers = limitCount === -1 ? filtered : filtered.slice(0, limitCount);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
        <div>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <Trophy className="w-5 h-5" />
            <span className="text-xs uppercase font-bold tracking-widest">Monthly Standings</span>
          </div>
          <h2 className="text-2xl font-black text-white">Clan Member Rankings</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Ranked for {MONTH_NAMES[selectedMonth - 1]} {selectedYear} by Score %, Total Points, and Required Attendance.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-neutral-800 rounded-xl p-1 border border-neutral-700/60 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'all' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterType('eligible')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'eligible' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Eligible
            </button>
            <button
              onClick={() => setFilterType('not_eligible')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === 'not_eligible' ? 'bg-amber-500 text-neutral-950 font-semibold' : 'text-neutral-400 hover:text-white'
              }`}
            >
              Not Eligible
            </button>
          </div>

          <select
            value={limitCount}
            onChange={(e) => setLimitCount(Number(e.target.value))}
            className="bg-neutral-800 border border-neutral-700/60 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-500"
          >
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={-1}>All Members</option>
          </select>
        </div>
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-neutral-950/60 border-b border-neutral-800 text-neutral-400 text-xs uppercase tracking-wider">
                <th className="py-4 px-6 font-semibold">Rank</th>
                <th className="py-4 px-6 font-semibold">Member Name</th>
                <th className="py-4 px-6 font-semibold text-center">Events Attended</th>
                <th className="py-4 px-6 font-semibold text-center">Required Att.</th>
                <th className="py-4 px-6 font-semibold text-center">Total Points</th>
                <th className="py-4 px-6 font-semibold text-center">Score %</th>
                <th className="py-4 px-6 font-semibold text-center">Wage Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800 text-sm">
              {displayedMembers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-neutral-500">
                    No members match the selected filter.
                  </td>
                </tr>
              ) : (
                displayedMembers.map((m, idx) => {
                  const rank = idx + 1;
                  return (
                    <tr 
                      key={m.memberId} 
                      className={`hover:bg-neutral-800/40 transition-colors ${
                        m.isEligible ? 'bg-emerald-950/10' : ''
                      }`}
                    >
                      <td className="py-4 px-6 font-bold">
                        <div className="flex items-center gap-2">
                          {rank === 1 ? (
                            <span className="w-8 h-8 rounded-xl bg-amber-500 text-neutral-950 flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                              🥇 1
                            </span>
                          ) : rank === 2 ? (
                            <span className="w-8 h-8 rounded-xl bg-neutral-300 text-neutral-950 flex items-center justify-center font-black shadow-md">
                              🥈 2
                            </span>
                          ) : rank === 3 ? (
                            <span className="w-8 h-8 rounded-xl bg-amber-700 text-white flex items-center justify-center font-black shadow-md">
                              🥉 3
                            </span>
                          ) : (
                            <span className="w-8 h-8 rounded-xl bg-neutral-800 text-neutral-400 flex items-center justify-center font-bold">
                              {rank}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-semibold text-white">
                        {m.memberName}
                        {!m.active && <span className="ml-2 text-[10px] bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded">Inactive</span>}
                      </td>
                      <td className="py-4 px-6 text-center text-neutral-300">
                        {m.eventsAttendedCount} / {m.totalEventsCount}
                      </td>
                      <td className="py-4 px-6 text-center text-neutral-300">
                        <span className={m.requiredEventAttendedCount >= settings.minimumRequiredAttendance ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                          {m.requiredEventAttendedCount}
                        </span>
                        <span className="text-neutral-500"> / {settings.minimumRequiredAttendance}</span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-amber-400">
                        {m.totalPoints} <span className="text-xs text-neutral-500 font-normal">/ {m.maxPoints}</span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-lg font-bold text-xs ${
                          m.scorePercentage >= 75 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          m.scorePercentage >= 50 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {m.scorePercentage}%
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        {m.isEligible ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            ✅ ELIGIBLE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/30">
                            ❌ NOT ELIGIBLE
                          </span>
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
    </div>
  );
};
