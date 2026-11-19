import { useState, useEffect, useCallback } from 'react';
import {
  expenseApi,
  ApiExpense,
  TripExpenseSummaryDto,
  SettlementAccountDto,
  CreateExpensePayload,
  UpdateExpensePayload,
} from '../../../services/api/expenseApi';
import { apiErrorMessage } from '../../../services/api/client';

export function useTripExpenses(
  tripId?: string,
  budgetTarget: number = 5000000,
) {
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [summary, setSummary] = useState<TripExpenseSummaryDto | null>(null);
  const [settlementAccounts, setSettlementAccounts] = useState<SettlementAccountDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!tripId) {
      setExpenses([]);
      setSummary(null);
      setSettlementAccounts([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const [list, sum, accounts] = await Promise.all([
        expenseApi.fetchTripExpenses(tripId),
        expenseApi.fetchTripExpenseSummary(tripId, budgetTarget),
        expenseApi.fetchSettlementAccounts(tripId).catch(() => []),
      ]);
      setExpenses(list);
      setSummary(sum);
      setSettlementAccounts(accounts);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [tripId, budgetTarget]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadExpenses();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadExpenses]);

  const addExpense = useCallback(
    async (payload: CreateExpensePayload) => {
      if (!tripId) throw new Error('Chưa chọn chuyến đi');
      setIsSubmitting(true);
      setError(null);
      try {
        const created = await expenseApi.createTripExpense(tripId, payload);
        // Optimistically update list
        setExpenses((prev) => [created, ...prev]);
        // Refresh summary
        await loadExpenses();
        return created;
      } catch (err) {
        setError(apiErrorMessage(err));
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [tripId, loadExpenses],
  );

  const removeExpense = useCallback(
    async (expenseId: string) => {
      if (!tripId) throw new Error('Chưa chọn chuyến đi');
      try {
        await expenseApi.deleteTripExpense(tripId, expenseId);
        setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
        await loadExpenses();
      } catch (err) {
        setError(apiErrorMessage(err));
        throw err;
      }
    },
    [tripId, loadExpenses],
  );

  const updateExpense = useCallback(
    async (expenseId: string, payload: UpdateExpensePayload) => {
      if (!tripId) throw new Error('Chưa chọn chuyến đi');
      setIsSubmitting(true);
      setError(null);
      try {
        const updated = await expenseApi.updateTripExpense(
          tripId,
          expenseId,
          payload,
        );
        setExpenses((prev) =>
          prev.map((expense) => (expense.id === expenseId ? updated : expense)),
        );
        await loadExpenses();
        return updated;
      } catch (err) {
        setError(apiErrorMessage(err));
        throw err;
      } finally {
        setIsSubmitting(false);
      }
    },
    [tripId, loadExpenses],
  );

  return {
    expenses,
    summary,
    settlementAccounts,
    isLoading,
    isSubmitting,
    error,
    reload: loadExpenses,
    addExpense,
    updateExpense,
    removeExpense,
  };
}
