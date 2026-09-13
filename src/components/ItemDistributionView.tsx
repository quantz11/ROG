import React, { useState, useEffect, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Gift, Archive, Check } from 'lucide-react';
import { DroppedItem, ItemDistribution, Member, Settings, ClanEvent, MemberMonthlyStats } from '../types';
import { getDroppedItemsForMonth, getItemDistributionsForMonth, updateDroppedItem } from '../services/dataService';
import { formatMonthKey } from '../utils/calculations';
import { DistributeItemModal } from './DistributeItemModal';

interface ItemDistributionViewProps {
  selectedYear: number;
  selectedMonth: number;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  members: Member[];
  memberStats: MemberMonthlyStats[];
  events: ClanEvent[];
  settings: Settings;
  isAdmin: boolean;
  adminUid: string;
  onOpenAuth: () => void;
  onOpenMemberDetails: (id: string) => void;
}

export const ItemDistributionView: React.FC<ItemDistributionViewProps> = ({
  selectedYear,
  selectedMonth,
  onPrevMonth,
  onNextMonth,
  members,
  memberStats,
  events,
  settings,
  isAdmin,
  adminUid,
  onOpenAuth,
  onOpenMemberDetails
}) => {
  const [drops, setDrops] = useState<DroppedItem[]>([]);
  const [distributions, setDistributions] = useState<ItemDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  const [distributeDrop, setDistributeDrop] = useState<DroppedItem | null>(null);

  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [filterRarity, setFilterRarity] = useState<string>('All');

  const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });

  const loadData = async () => {
    setLoading(true);
    try {
      const fetchedDrops = await getDroppedItemsForMonth(selectedYear, selectedMonth);
      const fetchedDists = await getItemDistributionsForMonth(selectedYear, selectedMonth);
      setDrops(fetchedDrops);
      setDistributions(fetchedDists);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  const handleArchive = async (drop: DroppedItem) => {
    if (!isAdmin) { onOpenAuth(); return; }
    if (confirm(`Archive item "${drop.itemName}"? It will be removed from available inventory.`)) {
      try {
        await updateDroppedItem(drop.id, { status: 'RESERVED' }, adminUid);
        loadData();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredDrops = useMemo(() => {
    return drops.filter(d => {
      if (filterStatus !== 'All' && d.status !== filterStatus) return false;
      if (filterCategory !== 'All' && d.itemCategory !== filterCategory) return false;
      if (filterRarity !== 'All' && d.rarity !== filterRarity) return false;
      return true;
    }).sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  }, [drops, filterStatus, filterCategory, filterRarity]);

  // Summaries
  const totalDrops = drops.length;
  const totalQuantity = drops.reduce((sum, d) => sum + d.quantity, 0);
  const availableQuantity = drops.reduce((sum, d) => sum + (d.quantity - d.distributedQuantity), 0);
  const distributedQuantity = drops.reduce((sum, d) => sum + d.distributedQuantity, 0);
  const reservedQuantity = drops.filter(d => d.status === 'RESERVED').reduce((sum, d) => sum + (d.quantity - d.distributedQuantity), 0);
  const uniqueMembersReceived = new Set(distributions.map(d => d.memberId)).size;

  // Member distribution summary
  const memberDistSummary = useMemo(() => {
    const summary: Record<string, { member: Member | undefined, itemsCount: number, totalQuantity: number }> = {};
    distributions.forEach(dist => {
      if (!summary[dist.memberId]) {
        summary[dist.memberId] = {
          member: members.find(m => m.id === dist.memberId),
          itemsCount: 0,
          totalQuantity: 0
        };
      }
      summary[dist.memberId].itemsCount += 1;
      summary[dist.memberId].totalQuantity += dist.quantity;
    });
    return Object.values(summary).sort((a, b) => b.totalQuantity - a.totalQuantity);
  }, [distributions, members]);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <Gift className="w-5 h-5" />
          <span className="text-xs uppercase font-bold tracking-widest">ROG Monthly Item Distribution</span>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
          <h2 className="text-2xl font-black text-white">
            {monthName} {selectedYear}
          </h2>
          
          <div className="flex items-center gap-2 bg-neutral-950 p-1.5 rounded-xl border border-neutral-800 w-fit">
            <button
              onClick={onPrevMonth}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-1 text-sm font-bold text-white min-w-[140px] text-center">
              {monthName} {selectedYear}
            </div>
            <button
              onClick={onNextMonth}
              className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Drops', value: totalDrops },
          { label: 'Total Item Qty', value: totalQuantity },
          { label: 'Available Qty', value: availableQuantity - reservedQuantity },
          { label: 'Distributed Qty', value: distributedQuantity },
          { label: 'Reserved Qty', value: reservedQuantity },
          { label: 'Members Received', value: uniqueMembersReceived }
        ].map(stat => (
          <div key={stat.label} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-4 shadow-lg text-center">
            <div className="text-xs text-neutral-500 font-medium mb-1">{stat.label}</div>
            <div className="text-2xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-lg font-bold text-white">Monthly Drop Inventory</h3>
          
          <div className="flex flex-wrap gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="PARTIALLY_DISTRIBUTED">Partial</option>
              <option value="DISTRIBUTED">Distributed</option>
              <option value="RESERVED">Reserved</option>
            </select>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Categories</option>
              {settings.itemCategories?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={filterRarity}
              onChange={(e) => setFilterRarity(e.target.value)}
              className="bg-neutral-800 border border-neutral-700 text-neutral-300 text-xs rounded-lg px-3 py-1.5 focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Rarities</option>
              {settings.itemRarities?.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-neutral-500">Loading...</div>
        ) : filteredDrops.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">No dropped items found for this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="p-3 font-medium">Date</th>
                  <th className="p-3 font-medium">Item</th>
                  <th className="p-3 font-medium">Category / Rarity</th>
                  <th className="p-3 font-medium text-center">Qty</th>
                  <th className="p-3 font-medium text-center">Dist</th>
                  <th className="p-3 font-medium text-center">Rem</th>
                  <th className="p-3 font-medium text-center">Status</th>
                  <th className="p-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/50">
                {filteredDrops.map(drop => {
                  const remaining = drop.quantity - drop.distributedQuantity;
                  const event = events.find(e => e.id === drop.eventId);
                  return (
                    <tr key={drop.id} className="hover:bg-neutral-800/30 transition-colors">
                      <td className="p-3 text-sm text-neutral-400">
                        {new Date(drop.eventDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="p-3">
                        <div className="font-medium text-white">{drop.itemName}</div>
                        <div className="text-xs text-neutral-500">Event: {event ? event.name : drop.eventTypeId}</div>
                      </td>
                      <td className="p-3 text-sm text-neutral-400">
                        <div>{drop.itemCategory}</div>
                        <div className="text-xs">{drop.rarity}</div>
                      </td>
                      <td className="p-3 text-sm text-center text-neutral-300 font-medium">{drop.quantity}</td>
                      <td className="p-3 text-sm text-center text-amber-500 font-medium">{drop.distributedQuantity}</td>
                      <td className="p-3 text-sm text-center text-white font-bold">{remaining}</td>
                      <td className="p-3 text-center">
                        <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                          drop.status === 'AVAILABLE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          drop.status === 'PARTIALLY_DISTRIBUTED' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                          drop.status === 'DISTRIBUTED' ? 'bg-neutral-500/10 text-neutral-400 border border-neutral-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {drop.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end gap-2">
                          {remaining > 0 && drop.status !== 'RESERVED' && (
                            <button
                              onClick={() => {
                                if (!isAdmin) { onOpenAuth(); return; }
                                setDistributeDrop(drop);
                              }}
                              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <Gift className="w-3 h-3" /> Distribute
                            </button>
                          )}
                          {drop.status !== 'RESERVED' && drop.status !== 'DISTRIBUTED' && (
                            <button
                              onClick={() => handleArchive(drop)}
                              className="p-1.5 text-neutral-500 hover:text-white hover:bg-neutral-700 rounded-lg transition-colors"
                              title="Archive / Reserve"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
        <h3 className="text-lg font-bold text-white mb-4">Member Distribution Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {memberDistSummary.length === 0 ? (
            <div className="col-span-full text-center py-6 text-neutral-500">No items distributed this month.</div>
          ) : (
            memberDistSummary.map(summary => (
              <div key={summary.member?.id || Math.random()} className="bg-neutral-800/50 border border-neutral-700 rounded-xl p-4 flex items-center justify-between">
                <div>
                  <button 
                    onClick={() => summary.member && onOpenMemberDetails(summary.member.id)}
                    className="font-bold text-white hover:text-amber-400 transition-colors text-left focus:outline-none"
                  >
                    {summary.member?.name || 'Unknown'}
                  </button>
                  <div className="text-xs text-neutral-400 mt-0.5">{summary.itemsCount} Drop{summary.itemsCount !== 1 ? 's' : ''} Received</div>
                </div>
                <div className="bg-amber-500/10 text-amber-500 font-black text-xl px-3 py-1 rounded-lg border border-amber-500/20">
                  x{summary.totalQuantity}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {distributeDrop && (
        <DistributeItemModal
          isOpen={true}
          onClose={() => setDistributeDrop(null)}
          drop={distributeDrop}
          members={members}
          memberStats={memberStats}
          adminUid={adminUid}
          onSuccess={loadData}
        />
      )}
    </div>
  );
};
