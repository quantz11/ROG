import React, { useState, useEffect } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { auth, logout } from './services/firebaseService';
import { Shield } from 'lucide-react';
import { 
  getMembers, getEventTypes, getEventsForMonth, 
  getAttendanceForMonth, getSettings, initializeDefaultData, createEvent,
  batchCreateEvents, saveSettings
} from './services/dataService';
import { calculateMonthlyStats, getNextUnlockedMonths, isMonthUnlocked, formatMonthKey, format12HourTime } from './utils/calculations';
import { Member, EventType, ClanEvent, AttendanceRecord, Settings } from './types';

import { Header } from './components/Header';
import { Navbar, ActiveTab } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { AttendanceView } from './components/AttendanceView';
import { RankingView } from './components/RankingView';
import { AnalyticsView } from './components/AnalyticsView';
import { HistoryView } from './components/HistoryView';
import { ItemDistributionView } from './components/ItemDistributionView';
import { SettingsView } from './components/SettingsView';
import { CalendarView } from './components/CalendarView';
import { AuthModal } from './components/AuthModal';
import { InitSetupModal } from './components/InitSetupModal';
import { EventBulkGeneratorModal } from './components/EventBulkGeneratorModal';
import { MemberDetailsModal } from './components/MemberDetailsModal';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Current selected year & month (default Sept 2026 as requested in prompt examples)
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(9);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'members' | 'events' | 'schedule' | 'points' | 'eligibility' | 'clan' | 'items' | 'logs'>('members');

  // Data states
  const [members, setMembers] = useState<Member[]>([]);
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [events, setEvents] = useState<ClanEvent[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [settings, setSettings] = useState<Settings>({
    clanName: 'ROG',
    serverName: 'ROG Clan',
    minimumScorePercentage: 75,
    requiredEventTypeId: '',
    minimumRequiredAttendance: 4,
    unlockedMonths: []
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isInitOpen, setIsInitOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [selectedMemberDetailsId, setSelectedMemberDetailsId] = useState<string | null>(null);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  // Fetch data
  const loadData = async () => {
    setLoading(true);
    try {
      const [fetchedMembers, fetchedEventTypes, fetchedSettings] = await Promise.all([
        getMembers(),
        getEventTypes(),
        getSettings()
      ]);

      setMembers(fetchedMembers);
      setEventTypes(fetchedEventTypes);
      setSettings(fetchedSettings);
      setError(null);

      // If no data exists, suggest initialization
      if (fetchedMembers.length === 0 && fetchedEventTypes.length === 0) {
        setIsInitOpen(true);
      }

      // Fetch events for selected month
      const fetchedEvents = await getEventsForMonth(selectedYear, selectedMonth);
      setEvents(fetchedEvents);

      // Fetch attendance for these events
      const eventIds = fetchedEvents.map(e => e.id);
      const fetchedAttendance = await getAttendanceForMonth(eventIds);
      setAttendance(fetchedAttendance);
      setError(null);

    } catch (err: any) {
      console.warn('Notice loading data from Firebase:', err);
      const isOfflineOrUnavailable = 
        err?.message?.includes('unavailable') || 
        err?.message?.includes('offline') || 
        err?.message?.includes('Could not reach Cloud Firestore') ||
        err?.code === 'unavailable';

      if (isOfflineOrUnavailable) {
        // Auto-retry connection gracefully if initial data is still loading
        setTimeout(() => {
          loadData();
        }, 1500);
      } else {
        setError('Unable to load data. Please check your connection.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleOnline = () => {
      console.log('Network restored, refreshing data...');
      loadData();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [selectedYear, selectedMonth]);

  // Handle initialization of default data
  const handleInitializeDefaults = async () => {
    try {
      await initializeDefaultData();
      await loadData();
      alert('Default ROG settings and members initialized successfully!');
    } catch (err) {
      console.error('Initialization failed', err);
      alert('Failed to initialize defaults.');
    }
  };

  // Handle bulk event generation
  const handleGenerateBulkEvents = async (eventTypeId: string, weekdays: number[], points: number, time?: string) => {
    if (!isAdmin) {
      setIsAuthOpen(true);
      return;
    }
    try {
      const selectedET = eventTypes.find(et => et.id === eventTypeId);
      if (!selectedET) {
        console.error('Event type not found for id:', eventTypeId);
        return;
      }

      // Save defaults to settings in firestore
      const updatedSettings = {
        ...settings,
        defaultEventWeekdays: weekdays,
        defaultEventTime: time || '',
        defaultEventTypeId: eventTypeId
      };
      setSettings(updatedSettings);
      await saveSettings(updatedSettings, 'Updated default event bulk generator configurations');

      // Find all dates in selectedYear/selectedMonth matching weekdays
      const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
      const generatedDates: string[] = [];

      for (let day = 1; day <= daysInMonth; day++) {
        const dateObj = new Date(selectedYear, selectedMonth - 1, day);
        const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon ...
        if (weekdays.includes(dayOfWeek)) {
          const formattedDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          generatedDates.push(formattedDate);
        }
      }

      if (generatedDates.length === 0) {
        console.warn('No matching dates for bulk generation');
        return;
      }

      const newEventsData = generatedDates.map(dateStr => ({
        eventTypeId,
        name: selectedET.name,
        date: dateStr,
        ...(time ? { time } : {}),
        year: selectedYear,
        month: selectedMonth,
        points,
        active: true
      }));

      // Instant optimistic UI update
      const tempEvents: ClanEvent[] = newEventsData.map((ev, i) => ({
        id: `temp_${Date.now()}_${i}`,
        ...ev,
        createdAt: new Date().toISOString()
      }));

      setEvents(prev => [...prev, ...tempEvents]);

      // Persist in background via atomic batch write
      const summary = `Bulk generated ${newEventsData.length} events for ${selectedET.name} in ${selectedMonth}/${selectedYear}${time ? ' at ' + format12HourTime(time) : ''}`;
      await batchCreateEvents(newEventsData, summary);
      
      // Reload fresh events from database
      await loadData();
    } catch (err) {
      console.error('Bulk generation failed:', err);
      await loadData();
    }
  };

  // Calculate stats for current month
  const { memberStats } = calculateMonthlyStats(
    members,
    events,
    eventTypes,
    attendance,
    settings,
    true
  );

  // Optimistic attendance update for instant UI feedback
  const handleToggleAttendance = (memberId: string, eventId: string, attended: boolean) => {
    setAttendance(prev => {
      const idx = prev.findIndex(a => a.memberId === memberId && a.eventId === eventId);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], attended, updatedAt: new Date().toISOString() };
        return next;
      } else {
        return [
          ...prev,
          {
            id: `${memberId}_${eventId}`,
            memberId,
            eventId,
            attended,
            updatedBy: user?.email || 'admin',
            updatedAt: new Date().toISOString()
          }
        ];
      }
    });
  };

  const handleBatchToggleAttendance = (updates: { memberId: string; eventId: string; attended: boolean }[]) => {
    setAttendance(prev => {
      const map = new Map<string, AttendanceRecord>();
      prev.forEach(a => map.set(`${a.memberId}_${a.eventId}`, a));

      updates.forEach(u => {
        const key = `${u.memberId}_${u.eventId}`;
        const existing = map.get(key);
        if (existing) {
          map.set(key, { ...existing, attended: u.attended, updatedAt: new Date().toISOString() });
        } else {
          map.set(key, {
            id: key,
            memberId: u.memberId,
            eventId: u.eventId,
            attended: u.attended,
            updatedBy: user?.email || 'admin',
            updatedAt: new Date().toISOString()
          });
        }
      });

      return Array.from(map.values());
    });
  };

  let selectedMemberStats = memberStats.find(m => m.memberId === selectedMemberDetailsId) || null;
  if (!selectedMemberStats && selectedMemberDetailsId) {
    const foundMem = members.find(m => m.id === selectedMemberDetailsId);
    if (foundMem) {
      selectedMemberStats = {
        memberId: foundMem.id,
        memberName: foundMem.name,
        active: foundMem.active,
        eventsAttendedCount: 0,
        totalEventsCount: events.length,
        requiredEventAttendedCount: 0,
        requiredEventTotalCount: 0,
        totalPoints: 0,
        maxPoints: 0,
        scorePercentage: 0,
        isEligible: false,
        attendanceMap: {}
      };
    }
  }
  const isAdmin = Boolean(user);

  const handleToggleUnlockMonth = async (year: number, month: number) => {
    if (!isAdmin) {
      setIsAuthOpen(true);
      return;
    }

    const { nextUnlockedMonths, willBeUnlocked } = getNextUnlockedMonths(
      year, 
      month, 
      settings.unlockedMonths || []
    );

    const updatedSettings: Settings = {
      ...settings,
      unlockedMonths: nextUnlockedMonths
    };

    // Instant optimistic local update
    setSettings(updatedSettings);

    const monthKey = formatMonthKey(year, month);
    try {
      await saveSettings(
        updatedSettings,
        `${willBeUnlocked ? 'Unlocked' : 'Locked'} attendance records for ${monthKey}`
      );
    } catch (err) {
      console.error('Failed to save unlock/lock month state to Firestore:', err);
      setSettings(settings);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans antialiased selection:bg-amber-500 selection:text-neutral-950">
      <Header
        clanName={settings.clanName}
        serverName={settings.serverName}
        user={user}
        isAdmin={isAdmin}
        onOpenAuth={() => setIsAuthOpen(true)}
        onLogout={logout}
        onOpenInit={() => setIsInitOpen(true)}
      />

      <div className="flex">
        <Navbar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            if (tab === 'settings') {
              if (!isAdmin) {
                setIsAuthOpen(true);
                return;
              }
              setSettingsInitialTab('members');
            }
            setActiveTab(tab);
          }} 
        />

        <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto overflow-x-hidden">
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={loadData} className="underline font-semibold">Retry</button>
            </div>
          )}

          {loading && members.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-sm text-neutral-400">Loading ROG Attendance...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  memberStats={memberStats}
                  events={events}
                  eventTypes={eventTypes}
                  settings={settings}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onNavigate={setActiveTab}
                  onOpenMemberDetails={(id) => setSelectedMemberDetailsId(id)}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarView
                  events={events}
                  eventTypes={eventTypes}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onSelectYearMonth={(y, m) => {
                    setSelectedYear(y);
                    setSelectedMonth(m);
                  }}
                  onNavigate={setActiveTab}
                  onNavigateSettingsSchedule={() => {
                    if (!isAdmin) {
                      setIsAuthOpen(true);
                      return;
                    }
                    setSettingsInitialTab('schedule');
                    setActiveTab('settings');
                  }}
                  settings={settings}
                  isAdmin={isAdmin}
                  adminUid={user?.uid || ''}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
              )}

                {activeTab === 'attendance' && (
                <AttendanceView
                  members={members}
                  events={events}
                  eventTypes={eventTypes}
                  attendance={attendance}
                  settings={settings}
                  memberStats={memberStats}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onMonthChange={(y, m) => {
                    setSelectedYear(y);
                    setSelectedMonth(m);
                  }}
                  isAdmin={isAdmin}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onOpenMemberDetails={(id) => setSelectedMemberDetailsId(id)}
                  onOpenBulkGenerator={() => {
                    if (!isAdmin) {
                      setIsAuthOpen(true);
                      return;
                    }
                    setIsBulkOpen(true);
                  }}
                  onOpenSchedule={() => {
                    if (!isAdmin) {
                      setIsAuthOpen(true);
                      return;
                    }
                    setSettingsInitialTab('schedule');
                    setActiveTab('settings');
                  }}
                  onRefreshData={loadData}
                  onToggleAttendance={handleToggleAttendance}
                  onBatchToggleAttendance={handleBatchToggleAttendance}
                  onToggleUnlockMonth={handleToggleUnlockMonth}
                />
              )}

              {activeTab === 'ranking' && (
                <RankingView
                  memberStats={memberStats}
                  settings={settings}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onOpenMemberDetails={(id) => setSelectedMemberDetailsId(id)}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  memberStats={memberStats}
                  events={events}
                  eventTypes={eventTypes}
                  attendance={attendance}
                  settings={settings}
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                />
              )}

              {activeTab === 'history' && (
                <HistoryView
                  currentYear={selectedYear}
                  currentMonth={selectedMonth}
                  onSelectMonthYear={(y, m) => {
                    setSelectedYear(y);
                    setSelectedMonth(m);
                    setActiveTab('attendance');
                  }}
                  settings={settings}
                  onToggleUnlockMonth={handleToggleUnlockMonth}
                  isAdmin={isAdmin}
                  onOpenAuth={() => setIsAuthOpen(true)}
                />
              )}

              {activeTab === 'items' && (
                <ItemDistributionView
                  selectedYear={selectedYear}
                  selectedMonth={selectedMonth}
                  onPrevMonth={() => {
                    if (selectedMonth === 1) {
                      setSelectedMonth(12);
                      setSelectedYear(prev => prev - 1);
                    } else {
                      setSelectedMonth(prev => prev - 1);
                    }
                  }}
                  onNextMonth={() => {
                    if (selectedMonth === 12) {
                      setSelectedMonth(1);
                      setSelectedYear(prev => prev + 1);
                    } else {
                      setSelectedMonth(prev => prev + 1);
                    }
                  }}
                  members={members}
                  memberStats={memberStats}
                  events={events}
                  settings={settings}
                  isAdmin={isAdmin}
                  adminUid={user?.uid || ''}
                  onOpenAuth={() => setIsAuthOpen(true)}
                  onOpenMemberDetails={(id) => setSelectedMemberDetailsId(id)}
                />
              )}

              {activeTab === 'settings' && (
                isAdmin ? (
                  <SettingsView
                    members={members}
                    eventTypes={eventTypes}
                    events={events}
                    settings={settings}
                    selectedYear={selectedYear}
                    selectedMonth={selectedMonth}
                    onRefreshData={loadData}
                    isAdmin={isAdmin}
                    onOpenAuth={() => setIsAuthOpen(true)}
                    initialTab={settingsInitialTab}
                    onOpenMemberDetails={(id) => setSelectedMemberDetailsId(id)}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-6 bg-neutral-900 border border-neutral-800 rounded-2xl max-w-md mx-auto my-12 shadow-2xl">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
                      <Shield className="w-8 h-8" />
                    </div>
                    <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
                    <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                      The Settings page and its contents are strictly restricted to authenticated administrators. Please sign in as an administrator to access system configuration.
                    </p>
                    <button
                      onClick={() => setIsAuthOpen(true)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-neutral-950 font-bold py-3 px-4 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20"
                    >
                      Sign In as Administrator
                    </button>
                  </div>
                )
              )}
            </>
          )}
        </main>
      </div>

      {/* Modals */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onSuccess={loadData}
      />

      <InitSetupModal
        isOpen={isInitOpen}
        onClose={() => setIsInitOpen(false)}
        onInitialize={handleInitializeDefaults}
      />

      <EventBulkGeneratorModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        eventTypes={eventTypes}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
        onGenerate={handleGenerateBulkEvents}
        settings={settings}
      />

      <MemberDetailsModal
        memberStats={selectedMemberStats}
        events={events}
        eventTypes={eventTypes}
        attendance={attendance}
        settings={settings}
        onClose={() => setSelectedMemberDetailsId(null)}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />
    </div>
  );
}
