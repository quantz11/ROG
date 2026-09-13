import React from 'react';
import { LayoutDashboard, CalendarDays, CalendarCheck, Trophy, BarChart3, History, Settings, Gift } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'calendar' | 'attendance' | 'ranking' | 'analytics' | 'history' | 'items' | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

const navItems: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
  { id: 'ranking', label: 'Ranking', icon: Trophy },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'history', label: 'History', icon: History },
  { id: 'items', label: 'Items', icon: Gift },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-neutral-900 border-r border-neutral-800 p-4 shrink-0 min-h-[calc(100vh-65px)]">
        <div className="space-y-1.5 flex-1">
          <p className="px-3 text-[10px] font-semibold tracking-wider text-neutral-500 uppercase mb-2">Navigation</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 font-semibold shadow-lg shadow-amber-500/20'
                    : 'text-neutral-400 hover:text-white hover:bg-neutral-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-neutral-950' : 'text-neutral-400'}`} />
                {item.label}
              </button>
            );
          })}
        </div>

        <div className="p-3 bg-neutral-950/60 rounded-xl border border-neutral-800 text-xs text-neutral-400 mt-auto">
          <p className="font-semibold text-neutral-300 mb-1">ROG Attendance System</p>
          <p className="text-[11px] leading-relaxed">Automatic calculation of points, scores & wage eligibility.</p>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-neutral-900/95 backdrop-blur-md border-t border-neutral-800 px-2 py-2 flex items-center justify-around shadow-2xl">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
                isActive ? 'text-amber-400 bg-amber-500/10' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
