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
  itemCategories?: string[];
  itemRarities?: string[];
  // Event Config
  defaultEventWeekdays?: number[];
  defaultEventTime?: string;
  defaultEventTypeId?: string;
  eventPointConfiguration?: Record<string, number>;
  eventPointsByShortName?: Record<string, number>;
  eventPointsById?: Record<string, number>;
}

export type ItemDropStatus = 'AVAILABLE' | 'PARTIALLY_DISTRIBUTED' | 'DISTRIBUTED' | 'RESERVED';

export interface DroppedItem {
  id: string;
  eventId: string;
  eventTypeId: string;
  eventDate: string; // YYYY-MM-DD
  itemName: string;
  itemCategory: string;
  rarity: string;
  quantity: number;
  status: ItemDropStatus;
  distributedQuantity: number;
  notes: string;
  createdAt: any;
  createdBy: string;
  updatedAt: any;
  updatedBy: string;
  year: number; // For easy querying
  month: number; // For easy querying
}

export interface ItemDistribution {
  id: string;
  dropId: string;
  eventId: string;
  itemName: string;
  memberId: string;
  quantity: number;
  distributedAt: any;
  distributedBy: string;
  notes: string;
  year: number; // For easy querying
  month: number; // For easy querying
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

