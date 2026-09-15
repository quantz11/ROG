import React, { useState } from 'react';
import { Member, EventType, ClanEvent, Settings } from '../types';
import { 
  Users, Calendar, Shield, Award, Settings as SettingsIcon, 
  Plus, Trash2, Edit2, Save, AlertTriangle, Check, X, Sparkles, Clock, ScrollText,
  CheckCircle, Loader2, FileText 
} from 'lucide-react';
import { 
  addMember, updateMember, deleteMemberRecord, 
  saveEventType, deleteEventType, createEvent, updateEvent, deleteEvent, saveSettings,
  savePointsConfiguration 
} from '../services/dataService';
import { AuditLogsTab } from './AuditLogsTab';
import { format12HourTime, getEventEffectivePoints } from '../utils/calculations';
import { getEventTypeColorTheme, EVENT_COLOR_PALETTE } from '../utils/eventColors';

interface SettingsViewProps {
  members: Member[];
  eventTypes: EventType[];
  events: ClanEvent[];
  settings: Settings;
  selectedYear: number;
  selectedMonth: number;
  onRefreshData: () => void;
  isAdmin: boolean;
  onOpenAuth: () => void;
  initialTab?: 'members' | 'events' | 'schedule' | 'points' | 'eligibility' | 'clan' | 'logs';
  onOpenMemberDetails?: (memberId: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  members,
  eventTypes,
  events,
  settings,
  selectedYear,
  selectedMonth,
  onRefreshData,
  isAdmin,
  onOpenAuth,
  initialTab = 'members',
  onOpenMemberDetails
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'events' | 'schedule' | 'points' | 'eligibility' | 'clan' | 'logs'>(initialTab);

  // Members state
  const [memberSearch, setMemberSearch] = useState('');
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [editingMember, setEditingMember] = useState<Member | null>(null);

  // Event Types state
  const [isAddEventTypeOpen, setIsAddEventTypeOpen] = useState(false);
  const [editingEventType, setEditingEventType] = useState<EventType | null>(null);
  const [etName, setEtName] = useState('');
  const [etShortName, setEtShortName] = useState('');
  const [etPoints, setEtPoints] = useState(7);
  const [etIcon, setEtIcon] = useState('⚔');
  const [etColor, setEtColor] = useState('#f59e0b');

  // Schedule state
  const [schedDate, setSchedDate] = useState(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`);
  const [schedTime, setSchedTime] = useState(settings.defaultEventTime || '');
  const [schedEventTypeId, setSchedEventTypeId] = useState(settings.defaultEventTypeId || eventTypes[0]?.id || '');
  const [schedPoints, setSchedPoints] = useState(eventTypes.find(et => et.id === (settings.defaultEventTypeId || eventTypes[0]?.id))?.points || 7);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  // Points state (temporary points state for points config tab)
  const [pointsForm, setPointsForm] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    eventTypes.forEach(et => map[et.id] = et.points);
    return map;
  });

  React.useEffect(() => {
    setPointsForm(prev => {
      const map = { ...prev };
      let changed = false;
      eventTypes.forEach(et => {
        if (map[et.id] === undefined) {
          map[et.id] = et.points;
          changed = true;
        }
      });
      return changed ? map : prev;
    });
  }, [eventTypes]);

  // Eligibility state
  const [eligibilityForm, setEligibilityForm] = useState({
    minimumScorePercentage: settings.minimumScorePercentage,
    requiredEventTypeId: settings.requiredEventTypeId,
    minimumRequiredAttendance: settings.minimumRequiredAttendance
  });

  // Clan state
  const [clanForm, setClanForm] = useState({
    clanName: settings.clanName,
    serverName: settings.serverName
  });

  // In-app Alert / Status Notification
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSavingPoints, setIsSavingPoints] = useState(false);
  const [pointsSavedRecently, setPointsSavedRecently] = useState(false);

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    if (type === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
  };

  // --- MEMBER ACTIONS ---
  const handleCreateOrUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { onOpenAuth(); return; }
    if (!newMemberName.trim()) return;

    try {
      if (editingMember) {
        await updateMember(editingMember.id, { name: newMemberName.trim() });
      } else {
        await addMember(newMemberName.trim());
      }
      setNewMemberName('');
      setEditingMember(null);
      setIsAddMemberOpen(false);
      showAlert(editingMember ? 'Member updated successfully!' : 'Member added successfully!', 'success');
      onRefreshData();
    } catch (err) {
      console.error('Member action failed', err);
      showAlert('Failed to save member.', 'error');
    }
  };

  const handleToggleMemberActive = async (member: Member) => {
    if (!isAdmin) { onOpenAuth(); return; }
    try {
      await updateMember(member.id, { active: !member.active });
      onRefreshData();
    } catch (err) {
      console.error('Toggle active failed', err);
    }
  };

  // Confirmation Modal state for deletions
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: 'member' | 'eventType' | 'event';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  const handleDeleteMember = (member: Member) => {
    if (!isAdmin) { onOpenAuth(); return; }
    setDeleteConfirm({
      type: 'member',
      id: member.id,
      title: 'Delete Member',
      message: `Are you sure you want to delete member "${member.name}"? Historical attendance associated with this member will be preserved.`
    });
  };

  // --- EVENT TYPE ACTIONS ---
  const handleSaveEventType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { onOpenAuth(); return; }

    try {
      await saveEventType(editingEventType ? editingEventType.id : null, {
        name: etName,
        shortName: etShortName,
        points: Number(etPoints),
        icon: etIcon,
        color: etColor,
        active: true,
        sortOrder: eventTypes.length + 1
      });
      setIsAddEventTypeOpen(false);
      setEditingEventType(null);
      showAlert(editingEventType ? 'Event type updated successfully!' : 'Event type added successfully!', 'success');
      onRefreshData();
    } catch (err) {
      console.error('Save event type failed', err);
      showAlert('Failed to save event type.', 'error');
    }
  };

  const handleDeleteEventType = (et: EventType) => {
    if (!isAdmin) { onOpenAuth(); return; }
    setDeleteConfirm({
      type: 'eventType',
      id: et.id,
      title: 'Delete Event Type',
      message: `Are you sure you want to delete event type "${et.name}"?`
    });
  };

  const handleDeleteEvent = (ev: ClanEvent) => {
    if (!isAdmin) { onOpenAuth(); return; }
    setDeleteConfirm({
      type: 'event',
      id: ev.id,
      title: 'Remove Scheduled Event',
      message: `Are you sure you want to remove event "${ev.name}" on ${ev.date}${ev.time ? ` at ${ev.time}` : ''}?`
    });
  };

  const executeDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === 'member') {
        const targetMember = members.find(m => m.id === deleteConfirm.id);
        await deleteMemberRecord(deleteConfirm.id, targetMember?.name);
      } else if (deleteConfirm.type === 'eventType') {
        const targetET = eventTypes.find(et => et.id === deleteConfirm.id);
        await deleteEventType(deleteConfirm.id, targetET?.name);
      } else if (deleteConfirm.type === 'event') {
        const targetEv = events.find(ev => ev.id === deleteConfirm.id);
        await deleteEvent(deleteConfirm.id, targetEv?.name);
      }
      setDeleteConfirm(null);
      showAlert('Deletion completed successfully.', 'success');
      onRefreshData();
    } catch (err) {
      console.error('Delete action failed', err);
      showAlert('Failed to complete deletion.', 'error');
      setDeleteConfirm(null);
    }
  };

  // --- SCHEDULE ACTIONS ---
  const handleStartEditEvent = (ev: ClanEvent) => {
    setEditingEventId(ev.id);
    setSchedDate(ev.date);
    setSchedTime(ev.time || '');
    setSchedEventTypeId(ev.eventTypeId);
    setSchedPoints(ev.points);
  };

  const handleCancelEditEvent = () => {
    setEditingEventId(null);
    setSchedDate(`${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`);
    setSchedTime('');
    setSchedEventTypeId(eventTypes[0]?.id || '');
    setSchedPoints(eventTypes[0]?.points || 7);
  };

  const handleAddScheduleEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { onOpenAuth(); return; }

    const [y, m, d] = schedDate.split('-').map(Number);
    const selectedET = eventTypes.find(et => et.id === schedEventTypeId);

    try {
      if (editingEventId) {
        await updateEvent(editingEventId, {
          eventTypeId: schedEventTypeId,
          name: selectedET?.name || 'Clan Event',
          date: schedDate,
          time: schedTime.trim() ? schedTime.trim() : '',
          year: y,
          month: m,
          points: Number(schedPoints)
        });
        showAlert('Event updated successfully in!', 'success');
        handleCancelEditEvent();
      } else {
        await createEvent({
          eventTypeId: schedEventTypeId,
          name: selectedET?.name || 'Clan Event',
          date: schedDate,
          ...(schedTime.trim() ? { time: schedTime.trim() } : {}),
          year: y,
          month: m,
          points: Number(schedPoints),
          active: true
        });
        showAlert('Event scheduled successfully in!', 'success');
        setSchedTime('');
      }
      onRefreshData();
    } catch (err) {
      console.error('Schedule event failed', err);
      showAlert(editingEventId ? 'Failed to update event.' : 'Failed to schedule event.', 'error');
    }
  };

  // --- POINTS CONFIG SAVE ---
  const handleSavePointsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { onOpenAuth(); return; }

    setIsSavingPoints(true);
    try {
      await savePointsConfiguration(pointsForm, eventTypes);
      setPointsSavedRecently(true);
      showAlert('Event Point Configuration successfully saved!', 'success');
      onRefreshData();
    } catch (err: any) {
      console.error('Save points failed', err);
      showAlert('Failed to save points: ' + (err?.message || 'Unknown error'), 'error');
    } finally {
      setIsSavingPoints(false);
    }
  };

  // --- ELIGIBILITY SAVE ---
  const handleSaveEligibility = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { onOpenAuth(); return; }

    try {
      await saveSettings(
        {
          ...settings,
          ...eligibilityForm
        },
        `Updated eligibility criteria (Min Score: ${eligibilityForm.minimumScorePercentage}%, Required Events: ${eligibilityForm.minimumRequiredAttendance})`
      );
      showAlert('Eligibility settings saved successfully!', 'success');
      onRefreshData();
    } catch (err: any) {
      console.error('Save eligibility failed', err);
      showAlert('Failed to save eligibility settings: ' + (err?.message || 'Unknown error'), 'error');
    }
  };

  // --- CLAN SAVE ---
  const handleSaveClan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { onOpenAuth(); return; }

    try {
      await saveSettings(
        {
          ...settings,
          ...clanForm
        },
        `Updated clan details (Clan: "${clanForm.clanName}", Server: "${clanForm.serverName}")`
      );
      showAlert('Clan settings saved successfully!', 'success');
      onRefreshData();
    } catch (err: any) {
      console.error('Save clan failed', err);
      showAlert('Failed to save clan settings: ' + (err?.message || 'Unknown error'), 'error');
    }
  };

  // --- ITEMS CONFIG SAVE ---
  const [itemsForm, setItemsForm] = useState({
    itemCategories: (settings.itemCategories || ['Weapon', 'Armor', 'Accessory', 'Material', 'Enhancement Item', 'Skill Book', 'Box', 'Currency', 'Other']).join('\n'),
    itemRarities: (settings.itemRarities || ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic']).join('\n')
  });

  const handleSaveItemsConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) { onOpenAuth(); return; }

    const categories = itemsForm.itemCategories.split('\n').map(c => c.trim()).filter(c => c);
    const rarities = itemsForm.itemRarities.split('\n').map(r => r.trim()).filter(r => r);

    try {
      await saveSettings(
        {
          ...settings,
          itemCategories: categories,
          itemRarities: rarities
        },
        `Updated item configurations`
      );
      showAlert('Item configuration saved successfully!', 'success');
      onRefreshData();
    } catch (err: any) {
      console.error('Save items failed', err);
      showAlert('Failed to save item configuration: ' + (err?.message || 'Unknown error'), 'error');
    }
  };

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(memberSearch.toLowerCase()));

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Settings Header */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-lg">
        <div className="flex items-center gap-2 text-amber-400 mb-1">
          <SettingsIcon className="w-5 h-5" />
          <span className="text-xs uppercase font-bold tracking-widest">Configuration Center</span>
        </div>
        <h2 className="text-2xl font-black text-white">Administrator Settings</h2>
        <p className="text-xs text-neutral-400 mt-1">
          Manage members, event types, event schedules, points, eligibility rules, items config, and clan branding.
        </p>

        {/* Settings Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-neutral-800">
          {[
            { id: 'members', label: 'Members', icon: Users },
            { id: 'events', label: 'Events', icon: Calendar },
            { id: 'schedule', label: 'Event Schedule', icon: Calendar },
            { id: 'points', label: 'Points', icon: Award },
            { id: 'eligibility', label: 'Eligibility', icon: Shield },
            { id: 'clan', label: 'Clan Settings', icon: SettingsIcon },
            { id: 'items', label: 'Items Config', icon: Sparkles },
            { id: 'logs', label: 'Admin Logs', icon: ScrollText },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                    : 'bg-neutral-800/80 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* In-app Notification Alert Banner */}
      {notification && (
        <div className={`p-4 rounded-xl flex items-center justify-between border shadow-lg transition-all animate-fadeIn ${
          notification.type === 'success' 
            ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200' 
            : 'bg-red-950/90 border-red-500/50 text-red-200'
        }`}>
          <div className="flex items-center gap-3 text-sm font-medium">
            {notification.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-xs text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* TAB 1: MEMBERS */}
      {activeTab === 'members' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white">Member Management</h3>
              <p className="text-xs text-neutral-400">Add, edit, or deactivate clan members. Click a member's name to view their monthly report.</p>
            </div>

            <button
              onClick={() => {
                if (!isAdmin) { onOpenAuth(); return; }
                setEditingMember(null);
                setNewMemberName('');
                setIsAddMemberOpen(true);
              }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" /> Add Member
            </button>
          </div>

          <div className="relative">
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/40">
            {filteredMembers.length === 0 ? (
              <p className="py-8 text-center text-xs text-neutral-500">No members found.</p>
            ) : (
              filteredMembers.map(member => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => onOpenMemberDetails?.(member.id)}
                      className="w-9 h-9 rounded-lg bg-neutral-800 hover:bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-transparent hover:border-amber-500/30 transition-colors cursor-pointer focus:outline-none shrink-0"
                      title={`View monthly report for ${member.name}`}
                    >
                      {member.name.substring(0, 2).toUpperCase()}
                    </button>
                    <div>
                      <button
                        type="button"
                        onClick={() => onOpenMemberDetails?.(member.id)}
                        className="text-sm font-semibold text-white hover:text-amber-400 transition-colors text-left flex items-center gap-1.5 group cursor-pointer focus:outline-none"
                        title={`View monthly report for ${member.name}`}
                      >
                        <span className="group-hover:underline underline-offset-2">{member.name}</span>
                      </button>
                      <p className="text-[10px] text-neutral-400">Status: {member.active ? 'Active' : 'Inactive'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenMemberDetails?.(member.id)}
                      className="px-2.5 py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-amber-400 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-neutral-700/60"
                      title={`View monthly report for ${member.name}`}
                    >
                      <FileText className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Report</span>
                    </button>
                    <button
                      onClick={() => handleToggleMemberActive(member)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        member.active ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {member.active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => {
                        if (!isAdmin) { onOpenAuth(); return; }
                        setEditingMember(member);
                        setNewMemberName(member.name);
                        setIsAddMemberOpen(true);
                      }}
                      className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition-colors"
                      title="Edit Member"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteMember(member)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                      title="Delete Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: EVENTS */}
      {activeTab === 'events' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-white">Event Types Configuration</h3>
              <p className="text-xs text-neutral-400">Manage event categories, short names, icons, and default points.</p>
            </div>

            <button
              onClick={() => {
                if (!isAdmin) { onOpenAuth(); return; }
                setEditingEventType(null);
                setEtName('');
                setEtShortName('');
                setEtPoints(5);
                setEtIcon('⚔');
                setEtColor('#f59e0b');
                setIsAddEventTypeOpen(true);
              }}
              className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-4 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20"
            >
              <Plus className="w-4 h-4" /> Add Event Type
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {eventTypes.map(et => {
              const theme = getEventTypeColorTheme(et);
              return (
                <div 
                  key={et.id} 
                  className="bg-neutral-950/60 border rounded-2xl p-5 flex flex-col justify-between shadow-lg transition-all"
                  style={{
                    borderColor: `rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.35)`,
                    borderLeftColor: theme.hex,
                    borderLeftWidth: '4px'
                  }}
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div 
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-sm"
                        style={{
                          backgroundColor: `rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.18)`,
                          border: `1px solid rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.35)`
                        }}
                      >
                        {et.icon}
                      </div>
                      <span 
                        className="px-2.5 py-1 rounded-full text-xs font-bold font-mono"
                        style={{
                          backgroundColor: `rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.2)`,
                          color: theme.lightHex,
                          border: `1px solid rgba(${theme.rgb.r}, ${theme.rgb.g}, ${theme.rgb.b}, 0.4)`
                        }}
                      >
                        {et.points} pts
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: theme.hex, boxShadow: `0 0 6px ${theme.hex}` }}
                      />
                      <h4 className="text-base font-bold text-white">{et.name}</h4>
                    </div>
                    <p className="text-xs text-neutral-400 mt-1">Short Name: <strong className="text-white">{et.shortName}</strong></p>
                  </div>

                  <div className="flex items-center justify-end gap-2 mt-6 pt-3 border-t border-neutral-800">
                    <button
                      onClick={() => {
                        if (!isAdmin) { onOpenAuth(); return; }
                        setEditingEventType(et);
                        setEtName(et.name);
                        setEtShortName(et.shortName);
                        setEtPoints(et.points);
                        setEtIcon(et.icon);
                        setEtColor(et.color || '#f59e0b');
                        setIsAddEventTypeOpen(true);
                      }}
                      className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteEventType(et)}
                      className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
                      title="Delete Event Type"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: SCHEDULE */}
      {activeTab === 'schedule' && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Monthly Event Schedule</h3>
            <p className="text-xs text-neutral-400">Schedule clan events for {selectedMonth}/{selectedYear}.</p>
          </div>

          <form onSubmit={handleAddScheduleEvent} className="bg-neutral-950/60 border border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-400">
                {editingEventId ? 'Edit Scheduled Event' : 'Schedule New Event'}
              </h4>
              {editingEventId && (
                <button
                  type="button"
                  onClick={handleCancelEditEvent}
                  className="text-xs text-neutral-400 hover:text-white underline"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Date</label>
                <input
                  type="date"
                  value={schedDate}
                  onChange={(e) => setSchedDate(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-medium text-neutral-400 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Time (Optional)
                  </label>
                  {schedTime && (
                    <button
                      type="button"
                      onClick={() => setSchedTime('')}
                      className="text-[10px] text-neutral-400 hover:text-amber-400"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  type="time"
                  value={schedTime}
                  onChange={(e) => setSchedTime(e.target.value)}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="text-[10px] text-neutral-500">Presets:</span>
                  {['13:00', '19:00', '20:00', '20:30'].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSchedTime(preset)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        schedTime === preset
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold'
                          : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                      }`}
                    >
                      {format12HourTime(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Event Type</label>
                <select
                  value={schedEventTypeId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setSchedEventTypeId(id);
                    const found = eventTypes.find(et => et.id === id);
                    if (found) {
                      const eff = settings?.eventPointConfiguration?.[found.id] ?? found.points;
                      setSchedPoints(eff);
                    }
                  }}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  {eventTypes.map(et => (
                    <option key={et.id} value={et.id}>
                      {et.icon} {et.name} ({settings?.eventPointConfiguration?.[et.id] ?? et.points} pts)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Points (Historical)</label>
                <input
                  type="number"
                  min="0"
                  value={schedPoints}
                  onChange={(e) => setSchedPoints(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              {editingEventId && (
                <button
                  type="button"
                  onClick={handleCancelEditEvent}
                  className="bg-neutral-800 hover:bg-neutral-700 text-neutral-300 px-4 py-2 rounded-xl text-xs font-medium transition-all"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-5 py-2.5 rounded-xl text-xs transition-all shadow-md shadow-amber-500/20 flex items-center gap-1.5"
              >
                {editingEventId ? <Save className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingEventId ? 'Update Scheduled Event' : 'Add Scheduled Event'}
              </button>
            </div>
          </form>

          {/* Events list for this month */}
          <div>
            <h4 className="text-sm font-bold text-white mb-3">Scheduled Events for {selectedMonth}/{selectedYear} ({events.length})</h4>
            <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl bg-neutral-950/40">
              {events.length === 0 ? (
                <p className="py-6 text-center text-xs text-neutral-500">No events scheduled for this month.</p>
              ) : (
                events.map(ev => {
                  const et = eventTypes.find(e => e.id === ev.eventTypeId);
                  return (
                    <div key={ev.id} className="p-3.5 flex items-center justify-between hover:bg-neutral-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{et?.icon || '📅'}</span>
                        <div>
                          <p className="text-xs font-semibold text-white flex items-center gap-2">
                            <span>{ev.name}</span>
                            {ev.time && (
                              <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold">
                                <Clock className="w-2.5 h-2.5 text-amber-400" />
                                {format12HourTime(ev.time)}
                              </span>
                            )}
                          </p>
                          <p className="text-[10px] text-neutral-400 mt-0.5">
                            Date: <span className="text-neutral-300 font-mono">{ev.date}</span>
                            {ev.time && <span> at <strong className="text-amber-300 font-mono">{format12HourTime(ev.time)}</strong></span>}
                            {' '}• {getEventEffectivePoints(ev, eventTypes, settings)} pts
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleStartEditEvent(ev)}
                          className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg text-xs transition-colors"
                          title="Edit Scheduled Event"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEvent(ev)}
                          className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-xs transition-colors"
                          title="Delete Scheduled Event"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: POINTS */}
      {activeTab === 'points' && (
        <form onSubmit={handleSavePointsConfig} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div>
            <h3 className="text-lg font-bold text-white">Event Point Configuration</h3>
            <p className="text-xs text-neutral-400">Configure default point values for events and update all scheduled events.</p>
          </div>

          {pointsSavedRecently && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong>Points configuration saved:</strong> Default event points and scheduled events have been updated and saved successfully.
                </span>
              </div>
              <button 
                type="button" 
                onClick={() => setPointsSavedRecently(false)}
                className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-1 rounded"
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="space-y-4 max-w-xl">
            {eventTypes.map(et => (
              <div key={et.id} className="flex items-center justify-between p-4 bg-neutral-950/60 border border-neutral-800 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{et.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{et.name}</p>
                    <p className="text-xs text-neutral-400">Short Name: {et.shortName}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    value={pointsForm[et.id] ?? et.points}
                    onChange={(e) => setPointsForm({ ...pointsForm, [et.id]: Number(e.target.value) })}
                    className="w-20 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-sm text-center font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                  <span className="text-xs text-neutral-400">pts</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSavingPoints}
              className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-neutral-950 font-semibold px-6 py-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              {isSavingPoints ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" /> Save Points Configuration
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* TAB 5: ELIGIBILITY */}
      {activeTab === 'eligibility' && (
        <form onSubmit={handleSaveEligibility} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6 max-w-xl">
          <div>
            <h3 className="text-lg font-bold text-white">Wage Eligibility Rules</h3>
            <p className="text-xs text-neutral-400">Configure score percentage and mandatory attendance requirements.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Minimum Score Percentage (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={eligibilityForm.minimumScorePercentage}
                onChange={(e) => setEligibilityForm({ ...eligibilityForm, minimumScorePercentage: Number(e.target.value) })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Required Event Type</label>
              <select
                value={eligibilityForm.requiredEventTypeId}
                onChange={(e) => setEligibilityForm({ ...eligibilityForm, requiredEventTypeId: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {eventTypes.map(et => (
                  <option key={et.id} value={et.id}>{et.icon} {et.name} ({et.shortName})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Minimum Required Attendance Count</label>
              <input
                type="number"
                min="0"
                value={eligibilityForm.minimumRequiredAttendance}
                onChange={(e) => setEligibilityForm({ ...eligibilityForm, minimumRequiredAttendance: Number(e.target.value) })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-6 py-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Eligibility Rules
            </button>
          </div>
        </form>
      )}

      {/* TAB 6: CLAN */}
      {activeTab === 'clan' && (
        <form onSubmit={handleSaveClan} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6 max-w-xl">
          <div>
            <h3 className="text-lg font-bold text-white">Clan Settings</h3>
            <p className="text-xs text-neutral-400">Configure clan and server name displayed across the application.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Clan Name</label>
              <input
                type="text"
                value={clanForm.clanName}
                onChange={(e) => setClanForm({ ...clanForm, clanName: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Server Name / Subtitle</label>
              <input
                type="text"
                value={clanForm.serverName}
                onChange={(e) => setClanForm({ ...clanForm, serverName: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-6 py-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Clan Settings
            </button>
          </div>
        </form>
      )}

      {/* TAB 7: ITEMS CONFIG */}
      {activeTab === 'items' as any && (
        <form onSubmit={handleSaveItemsConfig} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6 max-w-xl">
          <div>
            <h3 className="text-lg font-bold text-white">Item Drop Configuration</h3>
            <p className="text-xs text-neutral-400">Configure item categories and rarities for drops. Put each entry on a new line.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Item Categories</label>
              <textarea
                value={itemsForm.itemCategories}
                onChange={(e) => setItemsForm({ ...itemsForm, itemCategories: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 min-h-[150px]"
                placeholder="Weapon&#10;Armor&#10;Accessory..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1">Item Rarities</label>
              <textarea
                value={itemsForm.itemRarities}
                onChange={(e) => setItemsForm({ ...itemsForm, itemRarities: e.target.value })}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 min-h-[150px]"
                placeholder="Common&#10;Uncommon&#10;Rare..."
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-neutral-950 font-semibold px-6 py-3 rounded-xl text-xs transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Save Items Config
            </button>
          </div>
        </form>
      )}

      {/* TAB 8: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <AuditLogsTab isAdmin={isAdmin} onOpenAuth={onOpenAuth} />
      )}

      {/* ADD/EDIT MEMBER MODAL */}
      {isAddMemberOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white">
            <button 
              onClick={() => setIsAddMemberOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-4">{editingMember ? 'Edit Member' : 'Add New Member'}</h3>
            <form onSubmit={handleCreateOrUpdateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Member Name (Supports Unicode)</label>
                <input
                  type="text"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g., Player1 / 玩家 / プレイヤー"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-semibold"
                >
                  {editingMember ? 'Save Changes' : 'Add Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD/EDIT EVENT TYPE MODAL */}
      {isAddEventTypeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white">
            <button 
              onClick={() => setIsAddEventTypeOpen(false)}
              className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold mb-4">{editingEventType ? 'Edit Event Type' : 'Add Event Type'}</h3>
            <form onSubmit={handleSaveEventType} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Event Name</label>
                <input
                  type="text"
                  value={etName}
                  onChange={(e) => setEtName(e.target.value)}
                  placeholder="Inter Server War"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Short Name</label>
                <input
                  type="text"
                  value={etShortName}
                  onChange={(e) => setEtShortName(e.target.value)}
                  placeholder="ISW"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Default Points</label>
                <input
                  type="number"
                  min="0"
                  value={etPoints}
                  onChange={(e) => setEtPoints(Number(e.target.value))}
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1">Icon (Emoji)</label>
                <input
                  type="text"
                  value={etIcon}
                  onChange={(e) => setEtIcon(e.target.value)}
                  placeholder="⚔"
                  className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Event Color Theme</label>
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  {EVENT_COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEtColor(c)}
                      className={`w-7 h-7 rounded-lg transition-transform ${
                        etColor === c ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-neutral-900' : 'hover:scale-105'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={etColor}
                    onChange={(e) => setEtColor(e.target.value)}
                    className="w-8 h-8 rounded-lg bg-neutral-800 border border-neutral-700 cursor-pointer p-0.5"
                  />
                  <input
                    type="text"
                    value={etColor}
                    onChange={(e) => setEtColor(e.target.value)}
                    placeholder="#f59e0b"
                    className="flex-1 bg-neutral-800 border border-neutral-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddEventTypeOpen(false)}
                  className="px-4 py-2 rounded-xl bg-neutral-800 text-neutral-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 text-neutral-950 text-xs font-semibold"
                >
                  Save Event Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl text-white space-y-4">
            <div className="flex items-center gap-3 text-red-400 mb-2">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-lg font-bold">{deleteConfirm.title}</h3>
            </div>
            <p className="text-xs text-neutral-300 leading-relaxed">
              {deleteConfirm.message}
            </p>
            <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors shadow-lg shadow-red-600/20"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
