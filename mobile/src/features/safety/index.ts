/**
 * Feature: Safety & Group Location (BF-05)
 * Phụ trách: M5 (Mobile Safety/Community Engineer)
 */
export interface SosAlertItem {
  id: string;
  tripId: string;
  userId: string;
  latitude?: number;
  longitude?: number;
  message?: string;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
}

export interface LocationShareState {
  enabled: boolean;
  expiresAt?: string;
  lastLatitude?: number;
  lastLongitude?: number;
}
