/**
 * Feature: Budget & Expenses (BF-04)
 * Phụ trách: M4 (Mobile Core Engineer)
 */
export interface TripExpense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
}
