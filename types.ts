// Event related types
export interface Event {
  summary: string;
  start: string;
  end: string;
  description: string;
  location: string;
  Ansvarig?: string;
  Nykter?: string[];
  attendance?: {
    maybe?: Record<string, string>;
    yes?: Record<string, string>;
    no?: Record<string, string>;
  };
}

// User related types
export interface UserInfo {
  firstName: string;
  lastName: string;
  userId: string;
  units: number;
  unitTakenTimestamps?: Record<string, number>;
  safeArrival?: string | null;
  admin: boolean;
  lastPurchaseTimestamp?: number;
  lastPurchase?: {
    timestamp: number;
    units: number;
  };
  godMode?: boolean;
  email?: string;
  phoneNumber?: string;
  platform?: string;
  profile?: string;
  pushToken?: string;
  muted?: boolean;
}

export interface ResponsiblePhadder {
  role: string;
  name: string;
  userId: string;
}

// Drink related types
export interface DrinkEntry {
  timestamp: number;
  units: number;
}

// Unit log related types
export interface UnitLogEvent {
  userId: string;
  oldUnits: number;
  newUnits: number;
  change: number;
  timestamp: number;
}

// List item type for admin screen
export type ListItem = UserInfo | { type: "header"; title: string } | { type: "tools"; title?: string };