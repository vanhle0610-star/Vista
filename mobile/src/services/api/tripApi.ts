import { api } from './client';

export interface TripMemberDto {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  budgetShare?: number | null;
}

export interface TripDto {
  id: string;
  ownerId: string;
  title: string;
  startDate: string;
  endDate: string;
  destinationSummary?: string | null;
  budgetTotal?: number | null;
  currency?: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | string;
  visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | string;
  members: TripMemberDto[];
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateTripPayload {
  title: string;
  startDate: string;
  endDate: string;
  destinationSummary?: string;
  budgetTotal?: number;
  currency?: string;
  visibility?: 'PUBLIC' | 'FRIENDS' | 'PRIVATE' | string;
}

export interface InvitationPreviewDto {
  tripId: string;
  tripTitle: string;
  destinationSummary?: string | null;
  inviterName?: string;
  role?: string;
  status?: string;
  expiresAt?: string | null;
}

export interface InvitationDto {
  id: string;
  tripId: string;
  role: string;
  status: string;
  rawToken?: string;
  inviteLink?: string;
}

export const tripApi = {
  async fetchMyTrips(): Promise<TripDto[]> {
    const res = await api.get<TripDto[]>('/trips');
    return res.data;
  },

  async fetchTrip(tripId: string): Promise<TripDto> {
    const res = await api.get<TripDto>(`/trips/${tripId}`);
    return res.data;
  },

  async createTrip(payload: CreateTripPayload): Promise<TripDto> {
    const res = await api.post<TripDto>('/trips', {
      currency: 'VND',
      ...payload,
    });
    return res.data;
  },

  async updateTrip(tripId: string, payload: Partial<CreateTripPayload>): Promise<TripDto> {
    const res = await api.patch<TripDto>(`/trips/${tripId}`, payload);
    return res.data;
  },

  async deleteTrip(tripId: string): Promise<void> {
    await api.delete(`/trips/${tripId}`);
  },

  async previewInvitation(token: string): Promise<InvitationPreviewDto> {
    const res = await api.get<InvitationPreviewDto>(`/invitations/${token}/preview`);
    return res.data;
  },

  async acceptInvitation(token: string): Promise<InvitationDto> {
    const res = await api.post<InvitationDto>(`/invitations/${token}/accept`);
    return res.data;
  },

  async createInvitation(tripId: string, role = 'MEMBER'): Promise<InvitationDto> {
    const res = await api.post<InvitationDto>(`/trips/${tripId}/invitations`, { role });
    return res.data;
  },

  async fetchItineraryDays(tripId: string): Promise<any[]> {
    const res = await api.get<any[]>(`/trips/${tripId}/itinerary/days`);
    return res.data;
  },

  async createItineraryDay(tripId: string, dayNumber: number, tripDate: string): Promise<any> {
    const res = await api.post<any>(`/trips/${tripId}/itinerary/days`, {
      dayNumber,
      tripDate,
    });
    return res.data;
  },

  async createItineraryItem(
    dayId: string,
    payload: {
      customStopName?: string;
      destinationId?: string;
      startTime?: string | null;
      endTime?: string | null;
      sortOrder?: number;
      note?: string;
    }
  ): Promise<any> {
    const res = await api.post<any>(`/itinerary/days/${dayId}/items`, payload);
    return res.data;
  },
};

