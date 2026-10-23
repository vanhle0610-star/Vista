import { api } from './client';

export interface ItineraryItemDto {
  id: string;
  dayId: string;
  destinationId?: string | null;
  customStopName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  sortOrder: number;
  note?: string | null;
  source?: string | null;
  version?: number;
}

export interface ItineraryDayDto {
  id: string;
  tripId: string;
  dayNumber: number;
  tripDate: string;
  items: ItineraryItemDto[];
  version?: number;
}

export interface ProposalVoteDto {
  id: string;
  proposalId: string;
  userId: string;
  vote: 'UP' | 'DOWN';
  createdAt: string;
}

export interface ProposalDto {
  id: string;
  tripId: string;
  destinationId?: string | null;
  proposedBy: string;
  title: string;
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED';
  closesAt?: string | null;
  createdAt: string;
  votes: ProposalVoteDto[];
  upVotes: number;
  downVotes: number;
}

export const collaborationApi = {
  // ── Itinerary Days & Items ──────────────────────────────────────────────────
  async fetchItineraryDays(tripId: string): Promise<ItineraryDayDto[]> {
    const res = await api.get<ItineraryDayDto[]>(`/trips/${tripId}/itinerary/days`);
    return res.data;
  },

  async createItineraryDay(tripId: string, dayNumber: number, tripDate: string): Promise<ItineraryDayDto> {
    const res = await api.post<ItineraryDayDto>(`/trips/${tripId}/itinerary/days`, {
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
  ): Promise<ItineraryItemDto> {
    const res = await api.post<ItineraryItemDto>(`/itinerary/days/${dayId}/items`, payload);
    return res.data;
  },

  async deleteItineraryItem(itemId: string): Promise<void> {
    await api.delete(`/itinerary/items/${itemId}`);
  },

  // ── Proposals & Voting ──────────────────────────────────────────────────────
  async fetchProposals(tripId: string): Promise<ProposalDto[]> {
    const res = await api.get<ProposalDto[]>(`/trips/${tripId}/proposals`);
    return res.data;
  },

  async createProposal(
    tripId: string,
    payload: { title: string; destinationId?: string; closesAt?: string }
  ): Promise<ProposalDto> {
    const res = await api.post<ProposalDto>(`/trips/${tripId}/proposals`, payload);
    return res.data;
  },

  async castVote(proposalId: string, vote: 'UP' | 'DOWN'): Promise<ProposalDto> {
    const res = await api.post<ProposalDto>(`/proposals/${proposalId}/votes`, { vote });
    return res.data;
  },

  async removeVote(proposalId: string): Promise<ProposalDto> {
    const res = await api.delete<ProposalDto>(`/proposals/${proposalId}/votes`);
    return res.data;
  },

  // ── Invitations ─────────────────────────────────────────────────────────────
  async createInvitation(tripId: string, role = 'MEMBER'): Promise<any> {
    const res = await api.post(`/trips/${tripId}/invitations`, { role });
    return res.data;
  },

  async acceptInvitation(token: string): Promise<any> {
    const res = await api.post(`/invitations/${token}/accept`);
    return res.data;
  },
};
