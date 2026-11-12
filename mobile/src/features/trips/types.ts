export type TripStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type TripVisibility = 'PUBLIC' | 'FRIENDS' | 'PRIVATE';
export type TripRole = 'OWNER' | 'MEMBER';

export interface TripMember {
  userId: string;
  displayName: string;
  email?: string;
  role: TripRole | string;
  status?: 'ACTIVE' | 'INVITED' | 'LEFT' | 'REMOVED' | 'PENDING' | string;
  avatarUrl?: string | null;
  budgetShare?: number | null;
  joinedAt?: string;
}

export interface Trip {
  id: string;
  ownerId: string;
  title: string;
  startDate: string;
  endDate: string;
  destinationSummary?: string | null;
  budgetTotal?: number | null;
  budgetSpent?: number | null;
  currency?: string;
  status: TripStatus | string;
  visibility?: TripVisibility | string;
  coverImageUrl?: string | null;
  coverPhotoUrl?: string | null;
  members?: TripMember[];
  role?: TripRole | string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Invitation {
  id: string;
  tripId: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'REVOKED' | 'EXPIRED' | string;
  inviteLink?: string;
  rawToken?: string;
  token?: string;
  inviterName?: string;
  tripTitle?: string;
  destinationSummary?: string;
  expiresAt?: string | null;
  createdAt?: string;
}

export interface ItineraryItem {
  id: string;
  dayId: string;
  stopOrder: number;
  placeName: string;
  destinationName?: string;
  address?: string;
  notes?: string;
  estimatedCost?: number;
  plannedArrivalTime?: string;
  plannedDepartureTime?: string;
  durationMinutes?: number;
  version?: number;
  latitude?: number;
  longitude?: number;
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  dayNumber: number;
  tripDate: string;
  items?: ItineraryItem[];
}

