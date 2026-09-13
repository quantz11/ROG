import { Member, ClanEvent, EventType, AttendanceRecord, Settings, MemberMonthlyStats } from '../types';

export function getEventEffectivePoints(
  event: ClanEvent,
  eventTypes: EventType[],
  settings?: Settings
): number {
  if (!event) return 0;

  // 1. Check settings.eventPointConfiguration by eventTypeId
  if (settings?.eventPointConfiguration) {
    const configVal = settings.eventPointConfiguration[event.eventTypeId];
    if (typeof configVal === 'number') {
      return configVal;
    }
  }

  // 2. Check eventTypes array by eventTypeId
  const et = eventTypes.find(t => t.id === event.eventTypeId);
  if (et && typeof et.points === 'number') {
    return et.points;
  }

  // 3. Check settings.eventPointConfiguration by event shortName if available
  if (et && settings?.eventPointConfiguration) {
    const byShortName = settings.eventPointConfiguration[et.shortName];
    if (typeof byShortName === 'number') {
      return byShortName;
    }
  }

  // 4. Fallback to event.points or 0
  return typeof event.points === 'number' ? event.points : 0;
}

export function calculateMonthlyStats(
  members: Member[],
  events: ClanEvent[],
  eventTypes: EventType[],
  attendance: AttendanceRecord[],
  settings: Settings,
  showInactive: boolean = false
): {
  memberStats: MemberMonthlyStats[];
  maxPoints: number;
  totalEventsCount: number;
} {
  // Filter active members unless showInactive is true
  const filteredMembers = members.filter(m => showInactive || m.active);

  // Calculate Maximum Monthly Points: sum of effective points of all active events in that month
  let maxPoints = 0;
  const activeEvents = events.filter(e => e.active);
  activeEvents.forEach(e => {
    maxPoints += getEventEffectivePoints(e, eventTypes, settings);
  });

  // Map eventId -> ClanEvent for quick lookup
  const eventMap = new Map<string, ClanEvent>();
  events.forEach(e => eventMap.set(e.id, e));

  // Map eventTypeId -> EventType for shortName lookup
  const eventTypeMap = new Map<string, EventType>();
  eventTypes.forEach(et => eventTypeMap.set(et.id, et));

  // Build attendance lookup: `${memberId}_${eventId}` -> boolean
  const attendanceMap = new Map<string, boolean>();
  attendance.forEach(a => {
    if (a.attended) {
      attendanceMap.set(`${a.memberId}_${a.eventId}`, true);
    }
  });

  // Find required event type ID (e.g. ISW)
  const requiredTypeId = settings.requiredEventTypeId;

  const memberStats: MemberMonthlyStats[] = filteredMembers.map(member => {
    let totalPoints = 0;
    let eventsAttendedCount = 0;
    let requiredEventAttendedCount = 0;
    let requiredEventTotalCount = 0;
    const memberAttMap: Record<string, boolean> = {};

    activeEvents.forEach(event => {
      const isAttended = attendanceMap.get(`${member.id}_${event.id}`) || false;
      memberAttMap[event.id] = isAttended;

      if (isAttended) {
        eventsAttendedCount++;
        totalPoints += getEventEffectivePoints(event, eventTypes, settings);
      }

      // Check if this event matches required event type
      if (event.eventTypeId === requiredTypeId) {
        requiredEventTotalCount++;
        if (isAttended) {
          requiredEventAttendedCount++;
        }
      }
    });

    const scorePercentage = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 0;

    const isEligible = 
      scorePercentage >= (settings.minimumScorePercentage || 75) &&
      requiredEventAttendedCount >= (settings.minimumRequiredAttendance || 4);

    return {
      memberId: member.id,
      memberName: member.name,
      active: member.active,
      eventsAttendedCount,
      totalEventsCount: activeEvents.length,
      requiredEventAttendedCount,
      requiredEventTotalCount,
      totalPoints,
      maxPoints,
      scorePercentage,
      isEligible,
      attendanceMap: memberAttMap
    };
  });

  // Sort by:
  // 1. scorePercentage desc
  // 2. totalPoints desc
  // 3. requiredEventAttendedCount desc
  // 4. memberName asc
  memberStats.sort((a, b) => {
    if (b.scorePercentage !== a.scorePercentage) {
      return b.scorePercentage - a.scorePercentage;
    }
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (b.requiredEventAttendedCount !== a.requiredEventAttendedCount) {
      return b.requiredEventAttendedCount - a.requiredEventAttendedCount;
    }
    return a.memberName.localeCompare(b.memberName);
  });

  return {
    memberStats,
    maxPoints,
    totalEventsCount: activeEvents.length
  };
}

export function formatMonthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`;
}

export function isMonthUnlocked(year: number, month: number, unlockedMonths: string[] = []): boolean {
  const now = new Date();
  const isCurrentCalendarMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;
  
  const paddedKey = formatMonthKey(year, month);
  const unpaddedKey = `${year}-${month}`;
  const underscoreKey = `${year}_${month}`;

  // If explicitly unlocked in unlockedMonths array
  if (
    unlockedMonths.includes(paddedKey) || 
    unlockedMonths.includes(unpaddedKey) || 
    unlockedMonths.includes(underscoreKey)
  ) {
    return true;
  }

  // Current calendar month is unlocked by default unless explicitly locked via locked prefix
  if (isCurrentCalendarMonth) {
    const isExplicitlyLocked = 
      unlockedMonths.includes(`!${paddedKey}`) || 
      unlockedMonths.includes(`locked_${paddedKey}`);
    return !isExplicitlyLocked;
  }

  // Historical or future months are locked by default
  return false;
}

export function getNextUnlockedMonths(
  year: number, 
  month: number, 
  currentUnlocked: string[] = []
): { nextUnlockedMonths: string[]; willBeUnlocked: boolean } {
  const paddedKey = formatMonthKey(year, month);
  const isCurrentlyUnlocked = isMonthUnlocked(year, month, currentUnlocked);
  const now = new Date();
  const isCurrentCalendarMonth = now.getFullYear() === year && (now.getMonth() + 1) === month;

  // Clean out any legacy variant of this month from the array
  const unpaddedKey = `${year}-${month}`;
  const underscoreKey = `${year}_${month}`;
  const lockPaddedKey = `!${paddedKey}`;
  const lockKey = `locked_${paddedKey}`;

  let cleaned = currentUnlocked.filter(
    k => k !== paddedKey && k !== unpaddedKey && k !== underscoreKey && k !== lockPaddedKey && k !== lockKey
  );

  if (isCurrentlyUnlocked) {
    // We want to lock it
    if (isCurrentCalendarMonth) {
      cleaned.push(lockPaddedKey);
    }
    return {
      nextUnlockedMonths: cleaned,
      willBeUnlocked: false
    };
  } else {
    // We want to unlock it
    cleaned.push(paddedKey);
    return {
      nextUnlockedMonths: cleaned,
      willBeUnlocked: true
    };
  }
}

/**
 * Formats a 24-hour time string (e.g., "20:00", "08:30", "13:00:00") or any valid time
 * into a clean 12-hour format with AM/PM (e.g., "8:00 PM", "8:30 AM", "1:00 PM").
 */
export function format12HourTime(timeStr?: string | null): string {
  if (!timeStr) return '';
  const trimmed = timeStr.trim();
  if (!trimmed) return '';

  // If already formatted with AM/PM
  if (/am|pm/i.test(trimmed)) {
    return trimmed;
  }

  // Handle standard HH:mm or HH:mm:ss
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (match) {
    let hours = parseInt(match[1], 10);
    const minutes = match[2];
    if (isNaN(hours)) return trimmed;

    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 becomes 12
    return `${hours}:${minutes} ${ampm}`;
  }

  return trimmed;
}

