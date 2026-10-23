import { api } from '@/services/api/client';

export interface TripItem {
  id: string;
  ownerId: string;
  title: string;
  startDate: string;
  endDate: string;
  destinationSummary?: string;
  budgetTotal?: number;
  currency: string;
  status: 'PLANNING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  visibility: 'PUBLIC' | 'PRIVATE';
  createdAt: string;
  updatedAt: string;
  role?: 'OWNER' | 'MEMBER';
}

export interface TripMember {
  userId: string;
  displayName: string;
  email?: string;
  avatarUrl?: string | null;
  role: 'OWNER' | 'MEMBER';
  status: 'ACTIVE' | 'INVITED' | 'LEFT' | 'REMOVED' | 'PENDING';
  joinedAt?: string;
  budgetShare?: number;
}

export interface CreateTripInput {
  title: string;
  startDate: string;
  endDate: string;
  destinationSummary?: string;
  budgetTotal?: number;
  currency?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
}

export interface UpdateTripInput {
  title?: string;
  startDate?: string;
  endDate?: string;
  destinationSummary?: string;
  budgetTotal?: number;
  currency?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  status?: 'PLANNING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
}

export interface TransferOwnerInput {
  newOwnerId: string;
}

export const tripApi = {
  async getMyTrips(): Promise<TripItem[]> {
    const res = await api.get<TripItem[]>('/trips');
    return res.data;
  },

  async getTripById(id: string): Promise<TripItem> {
    const res = await api.get<TripItem>(`/trips/${id}`);
    return res.data;
  },

  async createTrip(input: CreateTripInput): Promise<TripItem> {
    const res = await api.post<TripItem>('/trips', input);
    return res.data;
  },

  async patchTrip(id: string, input: UpdateTripInput): Promise<TripItem> {
    const res = await api.patch<TripItem>(`/trips/${id}`, input);
    return res.data;
  },

  async getTripMembers(id: string): Promise<TripMember[]> {
    const res = await api.get<TripMember[]>(`/trips/${id}/members`);
    return res.data;
  },

  async leaveTrip(tripId: string): Promise<void> {
    await api.post<void>(`/trips/${tripId}/leave`);
  },

  async removeMember(tripId: string, userId: string): Promise<void> {
    await api.delete<void>(`/trips/${tripId}/members/${userId}`);
  },

  async transferOwner(tripId: string, newOwnerId: string): Promise<TripItem> {
    const res = await api.post<TripItem>(`/trips/${tripId}/transfer-owner`, {
      newOwnerId,
    });
    return res.data;
  },
};
