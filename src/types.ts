export interface Member {
  id: string;
  name: string;
  active: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface EventType {
  id: string;
  name: string;
  shortName: string;
  points: number;
  icon: string;
  color: string;
  active: boolean;
  sortOrder: number;
}

export interface ClanEvent {
  id: string;
  eventTypeId: string;
  name: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm (24-hour time format, e.g. "20:00")
  year: number;
  month: number;
  points: number; // historical point protection
  active: boolean;
  createdAt: any;
}

export interface AttendanceRecord {
  id: string; // memberId_eventId
  memberId: string;
  eventId: string;
  attended: boolean;
  updatedAt: any;
  updatedBy: string;
}

export interface Settings {
  clanName: string;
  serverName: string;
  minimumScorePercentage: number;
  requiredEventTypeId: string;
  minimumRequiredAttendance: number;
  unlockedMonths: string[]; // "YYYY-MM"
}

export interface MemberMonthlyStats {
  memberId: string;
  memberName: string;
  active: boolean;
  eventsAttendedCount: number;
  totalEventsCount: number;
  requiredEventAttendedCount: number;
  requiredEventTotalCount: number;
  totalPoints: number;
  maxPoints: number;
  scorePercentage: number;
  isEligible: boolean;
  attendanceMap: Record<string, boolean>; // eventId -> boolean
}

export interface AuditLog {
  id: string;
  adminUid: string;
  adminEmail: string;
  adminDisplayName?: string;
  action: string;
  details: string;
  target: 'attendance' | 'members' | 'events' | 'settings' | 'points' | 'eligibility' | 'general';
  timestamp: any;
}

