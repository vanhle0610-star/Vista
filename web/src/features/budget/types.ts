export interface TripDetail {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  destinationSummary?: string;
  budgetTotal: number;
  currency: string;
  status: string;
  ownerId: string;
}

export interface TripMember {
  userId: string;
  displayName: string;
  email: string;
  role: 'OWNER' | 'MEMBER';
  budgetShare?: number;
}

export interface ExpenseSplit {
  id: string;
  userId: string;
  shareAmount: number;
  settledStatus: string;
}

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  category: 'FOOD' | 'TRANSPORT' | 'ACCOMMODATION' | 'ACTIVITIES' | 'OTHER';
  occurredAt: string;
  status: string;
  createdAt: string;
  splits: ExpenseSplit[];
  version?: number;
}

export interface SuggestedTransfer {
  fromUserId: string;
  toUserId: string;
  amount: number;
}

export interface TripExpenseSummary {
  tripId: string;
  totalSpent: number;
  budgetTotal?: number;
  remainingBudget?: number;
  spentPercentage?: number;
  currency: string;
  settlementDeltas: Record<string, number>;
  suggestedTransfers: SuggestedTransfer[];
}

export interface CreateExpensePayload {
  title: string;
  amount: number;
  currency?: string;
  paidBy?: string;
  category: 'FOOD' | 'TRANSPORT' | 'ACCOMMODATION' | 'ACTIVITIES' | 'OTHER';
  occurredAt?: string;
  splitType: 'EQUAL' | 'EXACT';
  participantIds?: string[];
  exactShares?: Record<string, number>;
}
