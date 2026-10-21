import { api } from './client';
import { ExpenseCategoryKey } from '../../features/budget/components/ExpenseItem';

export interface ApiExpenseSplit {
  id: string;
  userId: string;
  shareAmount: number;
  settledStatus: string;
}

export interface ApiExpense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  category: ExpenseCategoryKey | string;
  occurredAt: string;
  status: string;
  createdAt: string;
  splits: ApiExpenseSplit[];
}

export interface CreateExpensePayload {
  title: string;
  amount: number;
  currency?: string;
  paidBy?: string;
  category?: string;
  occurredAt?: string;
  splitType?: string;
  participantIds?: string[];
  exactShares?: Record<string, number>;
}

export interface SettlementTransferDto {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface TripExpenseSummaryDto {
  tripId: string;
  totalSpent: number;
  budgetTotal: number | null;
  remainingBudget: number | null;
  spentPercentage: number | null;
  currency: string;
  settlementDeltas: Record<string, number>;
  suggestedTransfers: SettlementTransferDto[];
}

export interface AiItineraryRequest {
  destinationProvince: string;
  totalDays: number;
  budgetLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  interests?: string[];
}

export interface AiItineraryResponse {
  destinationProvince: string;
  totalDays: number;
  budgetLevel: string;
  estimatedTotalCost: number;
  isMockData: boolean;
  days: Array<{
    dayNumber: number;
    dateLabel: string;
    activities: Array<{
      destinationId?: string | null;
      timeSlot: string;
      destinationName: string;
      estimatedCost: number;
      category: string;
      note?: string | null;
    }>;
  }>;
}

export const expenseApi = {
  async fetchTripExpenses(tripId: string): Promise<ApiExpense[]> {
    const res = await api.get<ApiExpense[]>(`/trips/${tripId}/expenses`);
    return res.data;
  },

  async createTripExpense(tripId: string, payload: CreateExpensePayload): Promise<ApiExpense> {
    const res = await api.post<ApiExpense>(`/trips/${tripId}/expenses`, payload);
    return res.data;
  },

  async deleteTripExpense(tripId: string, expenseId: string): Promise<void> {
    await api.delete(`/trips/${tripId}/expenses/${expenseId}`);
  },

  async fetchTripExpenseSummary(
    tripId: string,
    budgetTarget?: number,
  ): Promise<TripExpenseSummaryDto> {
    const res = await api.get<TripExpenseSummaryDto>(`/trips/${tripId}/expenses/summary`, {
      params: budgetTarget ? { budgetTarget } : undefined,
    });
    return res.data;
  },

  async fetchAiItinerarySuggestions(
    tripId: string,
    request: AiItineraryRequest,
  ): Promise<AiItineraryResponse> {
    const res = await api.post<AiItineraryResponse>(
      `/trips/${tripId}/ai/itinerary-suggestions`,
      request,
    );
    return res.data;
  },
};
