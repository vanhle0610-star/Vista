/**
 * Feature: Budget & Expenses (BF-04)
 * Vertical Slice: TV4 (Lê Thị Vân Ánh / Vanh)
 * Quiet Luxury & Iridescent Sky-Blue Mobile Interface
 */
export * from './components/BudgetSummaryCard';
export * from './components/SettlementDeltaRow';
export * from './components/ExpenseItem';
export * from './components/AddExpenseModal';
export * from './components/BudgetIcons';
export * from './screens/TripBudgetScreen';
export * from './hooks/useTripExpenses';

export interface TripExpense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
}
