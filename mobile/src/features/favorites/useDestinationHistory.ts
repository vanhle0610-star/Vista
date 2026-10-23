import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storage } from '../../services/api/client';
import {
  DestinationSummary,
  fetchHistory,
  recordHistoryApi,
  getGuestHistory,
  saveGuestHistory,
} from '../../services/api/destinationApi';

export function useDestinationHistory(limit = 10) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [guestHistory, setGuestHistory] = useState<DestinationSummary[]>([]);
  const [guestLoading, setGuestLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const token = await storage.getItem('vista_token');
        if (!active) return;
        const isAuth = Boolean(token);
        setHasToken(isAuth);
        if (!isAuth) {
          const list = await getGuestHistory();
          if (active) {
            setGuestHistory(list);
            setGuestLoading(false);
          }
        }
      } catch {
        if (active) {
          setHasToken(false);
          setGuestLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Server query when logged in
  const {
    data: serverHistory = [],
    isLoading: serverLoading,
    refetch: refetchServer,
  } = useQuery({
    queryKey: ['destination_history', limit],
    queryFn: () => fetchHistory(limit),
    enabled: hasToken === true,
  });

  const isGuest = hasToken === false;
  const isLoading = hasToken === null || (isGuest ? guestLoading : serverLoading);
  const history = isGuest ? guestHistory : serverHistory;

  const recordMutation = useMutation({
    mutationFn: recordHistoryApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['destination_history'] });
    },
  });

  const recordView = useCallback(
    async (destination: DestinationSummary) => {
      if (isGuest) {
        await saveGuestHistory(destination);
        setGuestHistory((prev) => [
          destination,
          ...prev.filter((item) => item.id !== destination.id),
        ]);
        return;
      }

      try {
        await recordMutation.mutateAsync(destination.id);
      } catch {
        // Fallback or ignore network error for non-critical history logging
      }
    },
    [isGuest, recordMutation]
  );

  const refetch = useCallback(async () => {
    if (isGuest) {
      const list = await getGuestHistory();
      setGuestHistory(list);
    } else {
      await refetchServer();
    }
  }, [isGuest, refetchServer]);

  return {
    history,
    recordView,
    isGuest,
    isLoading,
    refetch,
  };
}
