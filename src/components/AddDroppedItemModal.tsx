import React, { useState } from 'react';
import { ClanEvent, Settings } from '../types';
import { addDroppedItem } from '../services/dataService';
import { X, Save, AlertCircle } from 'lucide-react';

interface AddDroppedItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: ClanEvent;
  settings: Settings;
  adminUid: string;
  onSuccess: () => void;
}

export const AddDroppedItemModal: React.FC<AddDroppedItemModalProps> = ({
  isOpen, onClose, event, settings, adminUid, onSuccess
}) => {
  const [itemName, setItemName] = useState('');
  const [itemCategory, setItemCategory] = useState(settings.itemCategories?.[0] || 'Other');
  const [rarity, setRarity] = useState(settings.itemRarities?.[0] || 'Common');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || quantity < 1) {
      setError('Item Name and Quantity (>= 1) are required.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await addDroppedItem({
        eventId: event.id,
        eventTypeId: event.eventTypeId,
        eventDate: event.date,
        itemName: itemName.trim(),
        itemCategory,
        rarity,
        quantity,
        notes: notes.trim(),
        year: event.year,
        month: event.month
      }, adminUid);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError('Failed to add item drop');
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

        <h3 className="text-xl font-bold mb-4">Add Dropped Item</h3>
        <div className="mb-4 text-xs text-neutral-400 border-b border-neutral-800 pb-3">
          Event: <span className="text-amber-400 font-semibold">{event.name}</span> ({event.date})
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Item Name *</label>
            <input
              type="text"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="e.g. Kari Bracelet"
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Category</label>
              <select
                value={itemCategory}
                onChange={(e) => setItemCategory(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {settings.itemCategories?.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Rarity</label>
              <select
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {settings.itemRarities?.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1">Quantity *</label>
            <input
              type="number"
              min="1"
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
              {loading ? 'Adding...' : <><Save className="w-4 h-4" /> Add Item</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
