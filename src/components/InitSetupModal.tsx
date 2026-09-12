import React from 'react';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';

interface InitSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInitialize: () => void;
}

export const InitSetupModal: React.FC<InitSetupModalProps> = ({ isOpen, onClose, onInitialize }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-neutral-900 border border-amber-500/30 rounded-2xl p-6 shadow-2xl text-white">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold">Welcome to ROG Attendance</h2>
          <p className="text-xs text-neutral-400 mt-1">
            Initialize your clan attendance system with standard event types (ISW, Sindris, Clan Annihilation, Clan Sanctuary, World Boss), demo members, and default wage eligibility rules.
          </p>
        </div>

        <div className="space-y-3 mb-6 bg-neutral-950/60 p-4 rounded-xl border border-neutral-800 text-xs text-neutral-300">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Default Event Types & Points Configuration</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Initial Roster of Clan Members</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-amber-400" />
            <span>Wage Eligibility Rules (75% score & 4 ISW)</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-medium py-3 px-4 rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onInitialize();
              onClose();
            }}
            className="flex-1 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold py-3 px-4 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
          >
            Initialize Defaults
          </button>
        </div>
      </div>
    </div>
  );
};
