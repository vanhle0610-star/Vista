import { useState, useEffect, useCallback } from 'react';
import {
  expenseApi,
  ApiExpense,
  TripExpenseSummaryDto,
  CreateExpensePayload,
} from '../../../services/api/expenseApi';
import { apiErrorMessage } from '../../../services/api/client';

export function useTripExpenses(tripId: string, budgetTarget: number = 5000000) {
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);
  const [summary, setSummary] = useState<TripExpenseSummaryDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadExpenses = useCallback(async () => {
    if (!tripId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [list, sum] = await Promise.all([
        expenseApi.fetchTripExpenses(tripId),
        expenseApi.fetchTripExpenseSummary(tripId, budgetTarget),
      ]);
      setExpenses(list);
      setSummary(sum);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [tripId, budgetTarget]);

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const addExpense = useCallback(
    async (payload: CreateExpensePayload) => {
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

  return {
    expenses,
    summary,
    isLoading,
    isSubmitting,
    error,
    reload: loadExpenses,
    addExpense,
    removeExpense,
  };
}
