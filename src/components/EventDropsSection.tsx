import React, { useEffect, useState } from 'react';
import { ClanEvent, DroppedItem, Settings } from '../types';
import { getDroppedItemsForEvent } from '../services/dataService';
import { Plus } from 'lucide-react';
import { AddDroppedItemModal } from './AddDroppedItemModal';

interface EventDropsSectionProps {
  event: ClanEvent;
  settings: Settings;
  isAdmin: boolean;
  adminUid: string;
  onOpenAuth: () => void;
}

export const EventDropsSection: React.FC<EventDropsSectionProps> = ({
  event, settings, isAdmin, adminUid, onOpenAuth
}) => {
  const [drops, setDrops] = useState<DroppedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);

  const loadDrops = async () => {
    setLoading(true);
    try {
      const fetchedDrops = await getDroppedItemsForEvent(event.id);
      setDrops(fetchedDrops);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDrops();
  }, [event.id]);

  return (
    <div className="mt-4 pt-4 border-t border-neutral-800/60">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider text-amber-500">Event Drops</h4>
        <button
          onClick={() => {
            if (!isAdmin) { onOpenAuth(); return; }
            setIsAddOpen(true);
          }}
          className="flex items-center gap-1 text-xs font-bold text-amber-500 hover:text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-1 rounded transition-colors"
        >
          <Plus className="w-3 h-3" /> Add Dropped Item
        </button>
      </div>

      {loading ? (
        <div className="text-xs text-neutral-500 italic py-2">Loading drops...</div>
      ) : drops.length === 0 ? (
        <div className="text-xs text-neutral-500 italic py-2">No items recorded for this event.</div>
      ) : (
        <div className="space-y-2">
          {drops.map(drop => (
            <div key={drop.id} className="flex items-center justify-between bg-neutral-800/40 p-2 rounded-lg border border-neutral-700/50">
              <div>
                <div className="font-semibold text-sm text-white">{drop.itemName}</div>
                <div className="text-[10px] text-neutral-400">{drop.itemCategory} • {drop.rarity}</div>
              </div>
              <div className="font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded text-xs border border-amber-500/20">
                x{drop.quantity}
              </div>
            </div>
          ))}
        </div>
      )}

      {isAddOpen && (
        <AddDroppedItemModal
          isOpen={true}
          onClose={() => setIsAddOpen(false)}
          event={event}
          settings={settings}
          adminUid={adminUid}
          onSuccess={loadDrops}
        />
      )}
    </div>
  );
};
