import React from 'react';
import { Shield, User, LogOut, Timer, ExternalLink } from 'lucide-react';
import { User as FirebaseUser } from 'firebase/auth';

interface HeaderProps {
  clanName: string;
  serverName: string;
  user: FirebaseUser | null;
  isAdmin: boolean;
  onOpenAuth: () => void;
  onLogout: () => void;
  onOpenInit?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  clanName,
  serverName,
  user,
  isAdmin,
  onOpenAuth,
  onLogout,
  onOpenInit
}) => {
  return (
    <header className="bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-40 px-4 lg:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-neutral-950 font-black text-xl shadow-lg shadow-amber-500/20">
          {clanName ? clanName.substring(0, 2).toUpperCase() : 'RO'}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-wider text-white uppercase">{clanName || 'ROG'}</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 font-medium">
              Attendance
            </span>
          </div>
          <p className="text-xs text-neutral-400">{serverName || 'ROG Clan'}</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://quantz11.github.io/loy-rog-boss-watch/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white px-3 py-2 rounded-xl transition-colors border border-neutral-700/60 font-medium shadow-sm"
          title="Open Boss Timers in a new tab"
        >
          <Timer className="w-3.5 h-3.5 text-amber-400" />
          <span>Timers</span>
          <ExternalLink className="w-3 h-3 text-neutral-400" />
        </a>

        {user ? (
          <div className="flex items-center gap-3 bg-neutral-800/80 border border-neutral-700/60 pl-3 pr-2 py-1.5 rounded-xl">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden md:block">
                <p className="text-xs font-medium text-white leading-none">
                  {(user.email || '').trim().toLowerCase() === 'reticentsmiles@gmail.com' ? 'Quantz' : (user.email || 'Admin')}
                </p>
                <p className="text-[10px] text-emerald-400 mt-0.5 font-semibold">Admin Access</p>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-1.5 text-neutral-400 hover:text-red-400 transition-colors rounded-lg hover:bg-neutral-700/50"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-4 py-2 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
          >
            <User className="w-3.5 h-3.5" />
            Admin Login
          </button>
        )}
      </div>
    </header>
  );
};
