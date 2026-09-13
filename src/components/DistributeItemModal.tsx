import React, { useState, useEffect, useMemo } from 'react';
import { DroppedItem, Member, MemberMonthlyStats } from '../types';
import { distributeItem } from '../services/dataService';
import { X, Check, AlertCircle, Filter, SlidersHorizontal } from 'lucide-react';

interface DistributeItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  drop: DroppedItem;
  members: Member[];
  memberStats: MemberMonthlyStats[];
  adminUid: string;
  onSuccess: () => void;
}

export const DistributeItemModal: React.FC<DistributeItemModalProps> = ({
  isOpen, onClose, drop, members, memberStats, adminUid, onSuccess
}) => {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const availableQty = drop.quantity - drop.distributedQuantity;
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  
  // Advanced View
  const [isAdvancedView, setIsAdvancedView] = useState<boolean>(() => {
    const saved = localStorage.getItem('distributeAdvancedView');
    return saved === 'true';
  });
  
  const [minScoreFilter, setMinScoreFilter] = useState<number>(() => {
    const saved = localStorage.getItem('distributeMinScore');
    return saved ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    localStorage.setItem('distributeAdvancedView', isAdvancedView.toString());
  }, [isAdvancedView]);

  useEffect(() => {
    localStorage.setItem('distributeMinScore', minScoreFilter.toString());
  }, [minScoreFilter]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const filteredMembers = useMemo(() => {
    let result = members.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));
    
    if (isAdvancedView) {
      result = result.filter(m => {
        const stats = memberStats.find(s => s.memberId === m.id);
        const scorePct = stats ? stats.scorePercentage : 0;
        return scorePct >= minScoreFilter;
      });
      // Sort by score desc when in advanced view
      result.sort((a, b) => {
        const scoreA = memberStats.find(s => s.memberId === a.id)?.scorePercentage || 0;
        const scoreB = memberStats.find(s => s.memberId === b.id)?.scorePercentage || 0;
        return scoreB - scoreA;
      });
    }

    return result;
  }, [members, search, isAdvancedView, minScoreFilter, memberStats]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      setError('Please select a member.');
      return;
    }
    if (quantity < 1 || quantity > availableQty) {
      setError(`Quantity must be between 1 and ${availableQty}.`);
      return;
    }
    
    setError('');
    setLoading(true);
    try {
      await distributeItem(drop, selectedMemberId, quantity, notes.trim(), adminUid);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Failed to distribute item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold uppercase tracking-widest text-amber-500 text-sm">Distribute Item</h3>
          <button
            type="button"
            onClick={() => setIsAdvancedView(!isAdvancedView)}
            className={`flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold uppercase rounded border transition-colors ${
              isAdvancedView 
                ? 'bg-amber-500/20 text-amber-500 border-amber-500/30 hover:bg-amber-500/30' 
                : 'bg-neutral-800 text-neutral-400 border-neutral-700 hover:bg-neutral-700 hover:text-neutral-300'
            }`}
          >
            <SlidersHorizontal className="w-3 h-3" /> Advanced
          </button>
        </div>
        
        <div className="mb-4 bg-neutral-800 p-3 rounded-xl border border-neutral-700">
          <div className="text-xs text-neutral-400">Item:</div>
          <div className="font-semibold text-lg">{drop.itemName}</div>
          <div className="text-xs text-neutral-400 mt-2 flex justify-between">
            <span>Available: <strong className="text-white">{availableQty}</strong></span>
            <span>Total Dropped: {drop.quantity}</span>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Member *</label>
            
            {isAdvancedView && (
              <div className="mb-3 bg-neutral-950 p-3 rounded-xl border border-neutral-800 flex items-center gap-3">
                <Filter className="w-4 h-4 text-amber-500" />
                <div className="flex-1">
                  <div className="flex justify-between text-[10px] uppercase font-bold text-neutral-500 mb-2">
                    <span>Min Score %</span>
                    <span className="text-amber-500">{minScoreFilter}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={minScoreFilter}
                    onChange={(e) => setMinScoreFilter(parseInt(e.target.value))}
                    className="w-full accent-amber-500 h-1.5 bg-neutral-700 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>
            )}

            <input
              type="text"
              placeholder="Search member..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500 mb-2"
            />
            
            <div className="max-h-40 overflow-y-auto bg-neutral-800 border border-neutral-700 rounded-xl custom-scrollbar">
              {filteredMembers.length === 0 && (
                <div className="p-3 text-xs text-neutral-500 text-center">No members found</div>
              )}
              {filteredMembers.map(m => {
                const stats = memberStats.find(s => s.memberId === m.id);
                const scorePct = stats ? stats.scorePercentage : 0;
                
                return (
                  <label key={m.id} className="flex items-center justify-between p-3 hover:bg-neutral-700 cursor-pointer border-b border-neutral-700/50 last:border-0 transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="memberSelection"
                        checked={selectedMemberId === m.id}
                        onChange={() => setSelectedMemberId(m.id)}
                        className="accent-amber-500"
                      />
                      <span className={`text-sm ${!m.active ? 'line-through text-neutral-500' : 'text-neutral-200'}`}>{m.name}</span>
                    </div>
                    {isAdvancedView && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        scorePct >= 75 ? 'bg-emerald-500/20 text-emerald-400' : 
                        scorePct >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {scorePct}%
                      </span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
              max={availableQty}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 text-xs font-semibold flex items-center gap-2 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Confirming...' : <><Check className="w-4 h-4" /> Confirm Distribution</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
