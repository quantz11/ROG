import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import { subscribeAuditLogs } from '../services/dataService';
import { auth } from '../services/firebaseService';
import { 
  ScrollText, Search, RefreshCw, User, Calendar, 
  CheckCircle2, Settings as SettingsIcon, Award, Shield, 
  Clock 
} from 'lucide-react';

interface AuditLogsTabProps {
  isAdmin: boolean;
  onOpenAuth: () => void;
}

export function getMaskedAdminInfo(email: string, displayName?: string, viewerEmail?: string | null) {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const normalizedName = (displayName || '').trim().toLowerCase();
  const normalizedViewer = (viewerEmail || '').trim().toLowerCase();

  const isTargetAdmin = 
    normalizedEmail === 'reticentsmiles@gmail.com' ||
    normalizedEmail === 'quantz' ||
    normalizedName.includes('garry dexter bayucan') ||
    normalizedName === 'garry dexter' ||
    normalizedName === 'garry bayucan' ||
    normalizedName === 'quantz';

  // For reticentsmiles@gmail.com (Garry Dexter Bayucan):
  // Never show the email reticentsmiles@gmail.com under any circumstance.
  // Show the normalized identity "Quantz".
  if (isTargetAdmin) {
    return {
      displayName: 'Quantz',
      email: null,
      isTargetAdmin: true
    };
  }

  // For other admins that is not reticentsmiles@gmail.com:
  // Show emails on the audit logs.
  const displayEmail = email && email.includes('@') 
    ? email.trim() 
    : (displayName?.includes('@') ? displayName.trim() : (email || 'Admin'));

  const cleanDisplayName = displayName && displayName !== displayEmail && !displayName.includes('@')
    ? displayName.trim()
    : null;

  return {
    displayName: cleanDisplayName || displayEmail,
    email: displayEmail,
    isTargetAdmin: false
  };
}

export const AuditLogsTab: React.FC<AuditLogsTabProps> = ({ isAdmin, onOpenAuth }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [targetFilter, setTargetFilter] = useState<string>('all');
  const [currentViewerEmail, setCurrentViewerEmail] = useState<string | null>(
    () => auth.currentUser?.email || null
  );

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      setCurrentViewerEmail(user?.email || null);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    setLoading(true);
    const unsubscribe = subscribeAuditLogs((fetchedLogs) => {
      setLogs(fetchedLogs);
      setLoading(false);
    }, 150);

    return () => unsubscribe();
  }, []);

  const formatTimestamp = (ts: any) => {
    if (!ts) return 'Just now';
    try {
      const date = ts.toDate ? ts.toDate() : new Date(ts);
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      }).format(date);
    } catch {
      return 'Recent';
    }
  };

  const getTargetBadge = (target: string) => {
    switch (target) {
      case 'attendance':
        return {
          label: 'Attendance',
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2
        };
      case 'members':
        return {
          label: 'Members',
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          icon: User
        };
      case 'events':
        return {
          label: 'Events',
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          icon: Calendar
        };
      case 'settings':
      case 'clan':
        return {
          label: 'Settings',
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: SettingsIcon
        };
      case 'points':
        return {
          label: 'Points',
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          icon: Award
        };
      case 'eligibility':
        return {
          label: 'Eligibility',
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: Shield
        };
      default:
        return {
          label: 'General',
          bg: 'bg-neutral-800 text-neutral-300 border-neutral-700',
          icon: ScrollText
        };
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesTarget = targetFilter === 'all' || log.target === targetFilter;
    const query = searchQuery.toLowerCase().trim();
    if (!query) return matchesTarget;

    const masked = getMaskedAdminInfo(log.adminEmail, log.adminDisplayName, currentViewerEmail);

    const matchesSearch = 
      log.action.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query) ||
      masked.displayName.toLowerCase().includes(query) ||
      (masked.email && masked.email.toLowerCase().includes(query));

    return matchesTarget && matchesSearch;
  });

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 mb-1">
            <ScrollText className="w-5 h-5" />
            <h3 className="text-lg font-bold text-white">Administrator Audit Logs</h3>
          </div>
          <p className="text-xs text-neutral-400">
            Track all administrative actions, changes, and updates with administrator identity and timestamps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-neutral-800 text-neutral-300 border border-neutral-700/60">
            {logs.length} Total Logs
          </span>
          {!isAdmin && (
            <button
              onClick={onOpenAuth}
              className="text-xs px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold transition-colors"
            >
              Sign in as Admin
            </button>
          )}
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-neutral-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs by admin, action name, or details..."
            className="w-full bg-neutral-800/80 border border-neutral-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'all', label: 'All' },
            { id: 'attendance', label: 'Attendance' },
            { id: 'members', label: 'Members' },
            { id: 'events', label: 'Events' },
            { id: 'settings', label: 'Settings' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTargetFilter(f.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${
                targetFilter === f.id
                  ? 'bg-amber-500 text-neutral-950 font-semibold'
                  : 'bg-neutral-800/60 text-neutral-400 hover:text-white hover:bg-neutral-800'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table / List */}
      <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
        {loading ? (
          <div className="py-16 text-center text-neutral-500 space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-500" />
            <p className="text-xs">Loading audit logs...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-3 px-4">
            <ScrollText className="w-8 h-8 text-neutral-600 mx-auto" />
            <p className="text-sm font-semibold text-neutral-400">No logs found</p>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {searchQuery || targetFilter !== 'all' 
                ? 'Try adjusting your search terms or category filter.' 
                : 'All administrator activities (such as updating attendance, editing members, or scheduling events) will be logged here automatically.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-800/80">
            {filteredLogs.map(log => {
              const badge = getTargetBadge(log.target);
              const BadgeIcon = badge.icon;
              const masked = getMaskedAdminInfo(log.adminEmail, log.adminDisplayName, currentViewerEmail);

              return (
                <div 
                  key={log.id} 
                  className="p-4 hover:bg-neutral-800/30 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700/60 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
                      <User className="w-4 h-4 text-neutral-300" />
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white tracking-wide">
                          {log.action}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}>
                          <BadgeIcon className="w-3 h-3" />
                          {badge.label}
                        </span>
                      </div>

                      <p className="text-xs text-neutral-300 break-words leading-relaxed">
                        {log.details}
                      </p>

                      <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 flex-wrap pt-0.5">
                        <span className="text-neutral-400">by</span>
                        {masked.isTargetAdmin ? (
                          <span className="font-medium text-amber-400 font-semibold underline decoration-dotted underline-offset-2">
                            Quantz
                          </span>
                        ) : (
                          <>
                            {masked.displayName && masked.email && masked.displayName !== masked.email ? (
                              <>
                                <span className="font-medium text-neutral-200">
                                  {masked.displayName}
                                </span>
                                <span className="text-neutral-400 font-mono text-[10px]">
                                  ({masked.email})
                                </span>
                              </>
                            ) : (
                              <span className="font-medium text-neutral-200 font-mono text-[11px]">
                                {masked.email || masked.displayName || 'Admin'}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-neutral-400 text-[11px] shrink-0 sm:self-center pl-11 sm:pl-0">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    <span>{formatTimestamp(log.timestamp)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
