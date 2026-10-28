export interface MemberLocationShare {
  id: string;
  tripId: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null;
  latitude: number;
  longitude: number;
  startedAt: string;
  expiresAt: string;
  lastUpdatedAt: string;
  enabled: boolean;
}

export interface MeetupPoint {
  id: string;
  tripId: string;
  createdBy: string;
  creatorName?: string;
  label: string;
  latitude: number;
  longitude: number;
  targetTime?: string | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TripCheckIn {
  id: string;
  tripId: string;
  itineraryItemId?: string | null;
  userId: string;
  userDisplayName?: string;
  userAvatarUrl?: string | null;
  latitude: number;
  longitude: number;
  checkedInAt: string;
}

export interface StartLocationSharePayload {
  consent: boolean;
  expiresAt: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateLocationSharePayload {
  sessionStartedAt: string;
  latitude: number;
  longitude: number;
}

export interface CreateMeetupPointPayload {
  label: string;
  latitude: number;
  longitude: number;
  targetTime?: string;
  description?: string;
}

export interface CreateCheckInPayload {
  itineraryItemId?: string;
  latitude: number;
  longitude: number;
}
