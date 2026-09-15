import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp, 
  writeBatch,
  onSnapshot 
} from 'firebase/firestore';
import { db, auth } from './firebaseService';
import { Member, EventType, ClanEvent, AttendanceRecord, Settings, AuditLog, DroppedItem, ItemDistribution } from '../types';
import { format12HourTime } from '../utils/calculations';

// Default seeding data
export const DEFAULT_EVENT_TYPES: Omit<EventType, 'id'>[] = [
  { name: 'Inter Server War', shortName: 'ISW', points: 7, icon: '⚔', color: '#f59e0b', active: true, sortOrder: 1 },
  { name: 'Sindris', shortName: 'SIN', points: 6, icon: '🗡', color: '#3b82f6', active: true, sortOrder: 2 },
  { name: 'Clan Annihilation', shortName: 'CA', points: 3, icon: '⚔', color: '#ef4444', active: true, sortOrder: 3 },
  { name: 'Clan Sanctuary', shortName: 'CS', points: 2, icon: '🏰', color: '#8b5cf6', active: true, sortOrder: 4 },
  { name: 'World Boss', shortName: 'WB', points: 1, icon: '👹', color: '#10b981', active: true, sortOrder: 5 }
];

export const DEFAULT_SETTINGS: Settings = {
  clanName: 'ROG',
  serverName: 'ROG Clan',
  minimumScorePercentage: 75,
  requiredEventTypeId: 'isw', // Will be resolved by shortName or ID after creation
  minimumRequiredAttendance: 4,
  unlockedMonths: [],
  itemCategories: ['Weapon', 'Armor', 'Accessory', 'Material', 'Enhancement Item', 'Skill Book', 'Box', 'Currency', 'Other'],
  itemRarities: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic']
};

// Retry helper for Firestore read operations to gracefully handle transient network delays or backend cold-starts
export async function withRetry<T>(operation: () => Promise<T>, maxRetries = 3, delayMs = 600): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const isUnavailable = 
        err?.code === 'unavailable' || 
        err?.message?.includes('unavailable') || 
        err?.message?.includes('offline') ||
        err?.message?.includes('Could not reach server') ||
        err?.message?.includes('The operation could not be completed');

      if (isUnavailable && attempt < maxRetries - 1) {
        await new Promise(res => setTimeout(res, delayMs * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// --- AUDIT LOGGING ---
export interface LogAdminActionParams {
  action: string;
  details: string;
  target?: AuditLog['target'];
  adminUid?: string;
  adminEmail?: string;
  adminDisplayName?: string;
}

export async function logAdminAction(params: LogAdminActionParams): Promise<void> {
  try {
    const user = auth.currentUser;
    const adminUid = params.adminUid || user?.uid || 'admin_user';
    let adminEmail = params.adminEmail || user?.email || 'admin';
    let adminDisplayName = params.adminDisplayName || user?.displayName || adminEmail.split('@')[0] || 'Admin';

    // Mask specific admin if it matches reticentsmiles@gmail.com (Garry Dexter Bayucan) to Quantz
    const normalizedEmail = adminEmail.trim().toLowerCase();
    const normalizedName = adminDisplayName.trim().toLowerCase();
    if (
      normalizedEmail === 'reticentsmiles@gmail.com' ||
      normalizedName.includes('garry dexter bayucan') ||
      normalizedName === 'garry dexter' ||
      normalizedName === 'garry bayucan'
    ) {
      adminEmail = 'Quantz';
      adminDisplayName = 'Quantz';
    }

    await addDoc(collection(db, 'auditLogs'), {
      adminUid,
      adminEmail,
      adminDisplayName,
      action: params.action,
      details: params.details,
      target: params.target || 'general',
      timestamp: serverTimestamp()
    });
  } catch (err) {
    console.warn('Failed to record admin audit log:', err);
  }
}

export async function getAuditLogs(maxCount: number = 100): Promise<AuditLog[]> {
  try {
    const q = query(
      collection(db, 'auditLogs'),
      orderBy('timestamp', 'desc'),
      limit(maxCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as AuditLog));
  } catch (err) {
    console.error('Failed to get audit logs:', err);
    return [];
  }
}

export function subscribeAuditLogs(callback: (logs: AuditLog[]) => void, maxCount: number = 100) {
  const q = query(
    collection(db, 'auditLogs'),
    orderBy('timestamp', 'desc'),
    limit(maxCount)
  );
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    } as AuditLog));
    callback(logs);
  }, (err) => {
    console.warn('Error in audit logs subscription:', err);
  });
}

// --- MEMBERS ---
export async function getMembers(): Promise<Member[]> {
  return withRetry(async () => {
    const q = query(collection(db, 'members'), orderBy('name', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Member));
  });
}

export async function addMember(name: string): Promise<string> {
  const trimmedName = name.trim();
  const docRef = await addDoc(collection(db, 'members'), {
    name: trimmedName,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await logAdminAction({
    action: 'Added Member',
    details: `Added new clan member "${trimmedName}"`,
    target: 'members'
  });
  return docRef.id;
}

export async function updateMember(id: string, data: Partial<Member>): Promise<void> {
  const ref = doc(db, 'members', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp()
  });
  const changeDescription = data.name 
    ? `Renamed member to "${data.name}"` 
    : (data.active !== undefined 
        ? `${data.active ? 'Activated' : 'Deactivated'} member` 
        : `Updated member information`);
  await logAdminAction({
    action: 'Updated Member',
    details: changeDescription,
    target: 'members'
  });
}

export async function deleteMemberRecord(id: string, memberName?: string): Promise<void> {
  const ref = doc(db, 'members', id);
  await deleteDoc(ref);
  await logAdminAction({
    action: 'Deleted Member',
    details: `Deleted member "${memberName || id}"`,
    target: 'members'
  });
}

// --- EVENT TYPES ---
export async function getEventTypes(): Promise<EventType[]> {
  return withRetry(async () => {
    const q = query(collection(db, 'eventTypes'), orderBy('sortOrder', 'asc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as EventType));
  });
}

export async function saveEventType(eventTypeId: string | null, data: Omit<EventType, 'id'>): Promise<string> {
  if (eventTypeId) {
    const ref = doc(db, 'eventTypes', eventTypeId);
    await updateDoc(ref, { ...data });

    // Sync all existing events of this eventTypeId to new points
    if (typeof data.points === 'number') {
      try {
        const eventsSnap = await getDocs(query(collection(db, 'events'), where('eventTypeId', '==', eventTypeId)));
        const evUpdates = eventsSnap.docs
          .filter(d => d.data().points !== data.points)
          .map(d => updateDoc(doc(db, 'events', d.id), { points: data.points }));
        if (evUpdates.length > 0) {
          await Promise.all(evUpdates);
        }
      } catch (e) {
        console.warn('Failed to update events points for event type', e);
      }
    }

    await logAdminAction({
      action: 'Updated Event Type',
      details: `Updated event type "${data.name}" (${data.shortName}, ${data.points} pts)`,
      target: 'events'
    });
    return eventTypeId;
  } else {
    const ref = await addDoc(collection(db, 'eventTypes'), data);
    await logAdminAction({
      action: 'Created Event Type',
      details: `Created new event type "${data.name}" (${data.shortName}, ${data.points} pts)`,
      target: 'events'
    });
    return ref.id;
  }
}

export async function deleteEventType(id: string, typeName?: string): Promise<void> {
  const ref = doc(db, 'eventTypes', id);
  await deleteDoc(ref);
  await logAdminAction({
    action: 'Deleted Event Type',
    details: `Deleted event type "${typeName || id}"`,
    target: 'events'
  });
}

// --- EVENT POINT CONFIGURATION ---
export async function savePointsConfiguration(
  pointsMap: Record<string, number>,
  eventTypes: EventType[]
): Promise<void> {
  const pointsByShortName: Record<string, number> = {};
  const pointsByEventId: Record<string, number> = {};
  const detailedList: any[] = [];
  const updates: Promise<any>[] = [];

  for (const et of eventTypes) {
    const { id, ...rest } = et;
    const cleanRest = Object.fromEntries(
      Object.entries(rest).filter(([_, v]) => v !== undefined)
    );
    const newPoints = pointsMap[id] !== undefined ? Number(pointsMap[id]) : Number(et.points);

    pointsByShortName[et.shortName] = newPoints;
    pointsByEventId[id] = newPoints;
    detailedList.push({
      id,
      name: et.name,
      shortName: et.shortName,
      points: newPoints
    });

    // Save to eventTypes collection
    const etRef = doc(db, 'eventTypes', id);
    updates.push(setDoc(etRef, { ...cleanRest, points: newPoints }, { merge: true }));
  }

  // 1. Update all eventTypes docs
  await Promise.all(updates);

  // 2. Save entry into 'settings/config' under eventPointConfiguration
  const settingsRef = doc(db, 'settings', 'config');
  await setDoc(settingsRef, {
    eventPointConfiguration: {
      ...pointsByEventId,
      ...pointsByShortName,
    },
    eventPointsByShortName: pointsByShortName,
    eventPointsById: pointsByEventId,
  }, { merge: true });

  // 3. Save entry into dedicated collection 'eventPointConfiguration', document 'config'
  const epcRef = doc(db, 'eventPointConfiguration', 'config');
  await setDoc(epcRef, {
    pointsByShortName,
    pointsByEventId,
    eventTypes: detailedList,
    updatedAt: serverTimestamp()
  }, { merge: true });

  // 4. Synchronize points for all existing events in 'events' collection
  try {
    const eventsSnap = await getDocs(collection(db, 'events'));
    const eventUpdates: Promise<any>[] = [];
    for (const evDoc of eventsSnap.docs) {
      const evData = evDoc.data();
      const updatedPts = pointsByEventId[evData.eventTypeId];
      if (typeof updatedPts === 'number' && evData.points !== updatedPts) {
        eventUpdates.push(updateDoc(doc(db, 'events', evDoc.id), { points: updatedPts }));
      }
    }
    if (eventUpdates.length > 0) {
      await Promise.all(eventUpdates);
    }
  } catch (err) {
    console.warn('Failed to sync existing events points:', err);
  }

  // 5. Log admin audit action
  await logAdminAction({
    action: 'Updated Points Configuration',
    details: `Updated default points configuration for ${eventTypes.length} event types (${Object.entries(pointsByShortName).map(([k, v]) => `${k}: ${v}pts`).join(', ')})`,
    target: 'settings'
  });
}

// --- EVENTS (SCHEDULED) ---
export async function getEventsForMonth(year: number, month: number): Promise<ClanEvent[]> {
  return withRetry(async () => {
    const q = query(
      collection(db, 'events'), 
      where('year', '==', year), 
      where('month', '==', month)
    );
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ClanEvent));
    // Sort by date asc, then by time asc
    return list.sort((a, b) => {
      const dComp = a.date.localeCompare(b.date);
      if (dComp !== 0) return dComp;
      return (a.time || '').localeCompare(b.time || '');
    });
  });
}

export async function createEvent(eventData: Omit<ClanEvent, 'id' | 'createdAt'>): Promise<string> {
  const cleanData: Record<string, any> = { ...eventData };
  if (!cleanData.time) {
    delete cleanData.time;
  }
  const ref = await addDoc(collection(db, 'events'), {
    ...cleanData,
    createdAt: serverTimestamp()
  });
  await logAdminAction({
    action: 'Scheduled Event',
    details: `Scheduled "${eventData.name}" on ${eventData.date}${eventData.time ? ' at ' + format12HourTime(eventData.time) : ''} (${eventData.points} pts)`,
    target: 'events'
  });
  return ref.id;
}

export async function batchCreateEvents(
  eventsData: Omit<ClanEvent, 'id' | 'createdAt'>[],
  summary?: string
): Promise<void> {
  const batch = writeBatch(db);
  const timestamp = serverTimestamp();
  for (const ev of eventsData) {
    const cleanData: Record<string, any> = { ...ev };
    if (!cleanData.time) {
      delete cleanData.time;
    }
    const ref = doc(collection(db, 'events'));
    batch.set(ref, {
      ...cleanData,
      createdAt: timestamp
    });
  }
  await batch.commit();

  await logAdminAction({
    action: 'Bulk Scheduled Events',
    details: summary || `Bulk generated ${eventsData.length} events`,
    target: 'events'
  });
}

export async function updateEvent(eventId: string, data: Partial<ClanEvent>): Promise<void> {
  const ref = doc(db, 'events', eventId);
  const cleanData: Record<string, any> = { ...data };
  if (!cleanData.time) {
    cleanData.time = '';
  }
  await updateDoc(ref, cleanData);
  await logAdminAction({
    action: 'Updated Event',
    details: `Updated schedule for "${data.name || eventId}" (${data.date || ''}${data.time ? ' at ' + format12HourTime(data.time) : ''})`,
    target: 'events'
  });
}

export async function deleteEvent(eventId: string, eventName?: string): Promise<void> {
  const ref = doc(db, 'events', eventId);
  await deleteDoc(ref);
  await logAdminAction({
    action: 'Deleted Event',
    details: `Deleted scheduled event "${eventName || eventId}"`,
    target: 'events'
  });
}

// --- ATTENDANCE ---
export async function getAttendanceForMonth(eventIds: string[]): Promise<AttendanceRecord[]> {
  if (eventIds.length === 0) return [];
  return withRetry(async () => {
    const allRecords: AttendanceRecord[] = [];
    for (let i = 0; i < eventIds.length; i += 30) {
      const chunk = eventIds.slice(i, i + 30);
      const q = query(collection(db, 'attendance'), where('eventId', 'in', chunk));
      const snapshot = await getDocs(q);
      allRecords.push(...snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AttendanceRecord)));
    }
    return allRecords;
  });
}

export async function setAttendance(
  memberId: string, 
  eventId: string, 
  attended: boolean, 
  adminUid: string,
  extra?: { memberName?: string; eventName?: string; eventDate?: string }
): Promise<void> {
  const attendanceId = `${memberId}_${eventId}`;
  const ref = doc(db, 'attendance', attendanceId);
  await setDoc(ref, {
    memberId,
    eventId,
    attended,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid || 'admin'
  }, { merge: true });

  await logAdminAction({
    action: attended ? 'Marked Attended' : 'Unmarked Attendance',
    details: `${attended ? 'Marked' : 'Unmarked'} attendance for ${extra?.memberName || 'Member'} on ${extra?.eventName || 'Event'}${extra?.eventDate ? ` (${extra.eventDate})` : ''}`,
    target: 'attendance',
    adminUid
  });
}

export async function batchSetAttendance(
  updates: { memberId: string; eventId: string; attended: boolean }[], 
  adminUid: string,
  summary?: string
): Promise<void> {
  const batch = writeBatch(db);
  const timestamp = serverTimestamp();
  for (const u of updates) {
    const attendanceId = `${u.memberId}_${u.eventId}`;
    const ref = doc(db, 'attendance', attendanceId);
    batch.set(ref, {
      memberId: u.memberId,
      eventId: u.eventId,
      attended: u.attended,
      updatedAt: timestamp,
      updatedBy: adminUid || 'admin'
    }, { merge: true });
  }
  await batch.commit();

  await logAdminAction({
    action: 'Batch Attendance Update',
    details: summary || `Batch updated attendance for ${updates.length} records`,
    target: 'attendance',
    adminUid
  });
}

// --- SETTINGS ---
export async function getSettings(): Promise<Settings> {
  return withRetry(async () => {
    const ref = doc(db, 'settings', 'config');
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      return { ...DEFAULT_SETTINGS, ...snapshot.data() } as Settings;
    } else {
      return DEFAULT_SETTINGS;
    }
  });
}

export async function saveSettings(settings: Settings, summary?: string): Promise<void> {
  const ref = doc(db, 'settings', 'config');
  await setDoc(ref, settings, { merge: true });
  await logAdminAction({
    action: 'Updated Settings',
    details: summary || `Saved clan configuration (Clan: "${settings.clanName}", Server: "${settings.serverName}", Min Score: ${settings.minimumScorePercentage}%, Min Attendance: ${settings.minimumRequiredAttendance})`,
    target: 'settings'
  });
}

// --- INITIALIZATION ---
export async function initializeDefaultData(): Promise<void> {
  const etSnapshot = await getDocs(collection(db, 'eventTypes'));
  let iswId = '';
  if (etSnapshot.empty) {
    for (const et of DEFAULT_EVENT_TYPES) {
      const ref = await addDoc(collection(db, 'eventTypes'), et);
      if (et.shortName === 'ISW') {
        iswId = ref.id;
      }
    }
  } else {
    const found = etSnapshot.docs.find(d => d.data().shortName === 'ISW');
    if (found) iswId = found.id;
    else iswId = etSnapshot.docs[0].id;
  }

  const settingsRef = doc(db, 'settings', 'config');
  const settingsSnap = await getDoc(settingsRef);
  if (!settingsSnap.exists()) {
    await setDoc(settingsRef, {
      ...DEFAULT_SETTINGS,
      requiredEventTypeId: iswId
    });
  }

  const membersSnap = await getDocs(collection(db, 'members'));
  if (membersSnap.empty) {
    const demoMembers = [
      'Player1', 'Player2', 'kimeaa', 'ShadowBlade', 'DragonSlayer', 
      'Phoenix', 'Valkyrie', 'TitanX', 'Mystic', 'GhostRider'
    ];
    for (const name of demoMembers) {
      await addDoc(collection(db, 'members'), {
        name,
        active: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
  }

  await logAdminAction({
    action: 'Initialized Defaults',
    details: 'Initialized default ROG clan settings, event types, and roster',
    target: 'general'
  });
}

// --- ITEM DROPS ---
export async function getDroppedItemsForMonth(year: number, month: number): Promise<DroppedItem[]> {
  return withRetry(async () => {
    const q = query(
      collection(db, 'droppedItems'),
      where('year', '==', year),
      where('month', '==', month)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DroppedItem));
  });
}

export async function getDroppedItemsForEvent(eventId: string): Promise<DroppedItem[]> {
  return withRetry(async () => {
    const q = query(collection(db, 'droppedItems'), where('eventId', '==', eventId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as DroppedItem));
  });
}

export async function addDroppedItem(item: Omit<DroppedItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'distributedQuantity' | 'createdBy' | 'updatedBy'>, adminUid: string): Promise<string> {
  const docRef = await addDoc(collection(db, 'droppedItems'), {
    ...item,
    status: 'AVAILABLE',
    distributedQuantity: 0,
    createdAt: serverTimestamp(),
    createdBy: adminUid || 'admin',
    updatedAt: serverTimestamp(),
    updatedBy: adminUid || 'admin'
  });
  await logAdminAction({
    action: 'Added Dropped Item',
    details: `Added dropped item "${item.quantity}x ${item.itemName}"`,
    target: 'general'
  });
  return docRef.id;
}

export async function updateDroppedItem(id: string, data: Partial<DroppedItem>, adminUid: string): Promise<void> {
  const ref = doc(db, 'droppedItems', id);
  await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid || 'admin'
  });
  await logAdminAction({
    action: 'Updated Dropped Item',
    details: `Updated dropped item record`,
    target: 'general'
  });
}

export async function deleteDroppedItem(id: string, itemName?: string): Promise<void> {
  const ref = doc(db, 'droppedItems', id);
  await deleteDoc(ref);
  await logAdminAction({
    action: 'Deleted Dropped Item',
    details: `Deleted dropped item "${itemName || id}"`,
    target: 'general'
  });
}

// --- ITEM DISTRIBUTIONS ---
export async function getItemDistributionsForMonth(year: number, month: number): Promise<ItemDistribution[]> {
  return withRetry(async () => {
    const q = query(
      collection(db, 'itemDistributions'),
      where('year', '==', year),
      where('month', '==', month)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ItemDistribution));
  });
}

export async function getItemDistributionsByMember(memberId: string): Promise<ItemDistribution[]> {
  return withRetry(async () => {
    const q = query(collection(db, 'itemDistributions'), where('memberId', '==', memberId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ItemDistribution));
  });
}

export async function distributeItem(drop: DroppedItem, memberId: string, quantity: number, notes: string, adminUid: string): Promise<void> {
  const batch = writeBatch(db);
  
  // 1. Create distribution record
  const distRef = doc(collection(db, 'itemDistributions'));
  batch.set(distRef, {
    dropId: drop.id,
    eventId: drop.eventId,
    itemName: drop.itemName,
    memberId,
    quantity,
    distributedAt: serverTimestamp(),
    distributedBy: adminUid || 'admin',
    notes,
    year: drop.year,
    month: drop.month
  });

  // 2. Update drop status and quantities
  const newDistributedQty = drop.distributedQuantity + quantity;
  let newStatus = drop.status;
  if (newDistributedQty >= drop.quantity) {
    newStatus = 'DISTRIBUTED';
  } else if (newDistributedQty > 0) {
    newStatus = 'PARTIALLY_DISTRIBUTED';
  }

  const dropRef = doc(db, 'droppedItems', drop.id);
  batch.update(dropRef, {
    distributedQuantity: newDistributedQty,
    status: newStatus,
    updatedAt: serverTimestamp(),
    updatedBy: adminUid || 'admin'
  });

  await batch.commit();

  await logAdminAction({
    action: 'Distributed Item',
    details: `Distributed ${quantity}x ${drop.itemName} to member ${memberId}`,
    target: 'general'
  });
}