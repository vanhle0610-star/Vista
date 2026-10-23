import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { storage } from '../../services/api/client';
import {
  DestinationSummary,
  fetchFavorites,
  addFavoriteApi,
  removeFavoriteApi,
  getGuestFavorites,
  saveGuestFavorite,
  removeGuestFavorite,
} from '../../services/api/destinationApi';

export function useFavorites() {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [guestFavorites, setGuestFavorites] = useState<DestinationSummary[]>([]);
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
          const list = await getGuestFavorites();
          if (active) {
            setGuestFavorites(list);
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
    data: serverFavorites = [],
    isLoading: serverLoading,
    refetch: refetchServer,
  } = useQuery({
    queryKey: ['favorites'],
    queryFn: fetchFavorites,
    enabled: hasToken === true,
  });

  const isGuest = hasToken === false;
  const isLoading = hasToken === null || (isGuest ? guestLoading : serverLoading);
  const favorites = isGuest ? guestFavorites : serverFavorites;

  const favoriteIds = useMemo(() => {
    return new Set(favorites.map((f) => f.id));
  }, [favorites]);

  const isFavorite = useCallback(
    (destinationId: string) => favoriteIds.has(destinationId),
    [favoriteIds]
  );

  // Server toggle mutations
  const addMutation = useMutation({
    mutationFn: addFavoriteApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeFavoriteApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
    },
  });

  const toggleFavorite = useCallback(
    async (destination: DestinationSummary) => {
      const currentlyFav = favoriteIds.has(destination.id);

      if (isGuest) {
        if (currentlyFav) {
          await removeGuestFavorite(destination.id);
          setGuestFavorites((prev) => prev.filter((item) => item.id !== destination.id));
        } else {
          await saveGuestFavorite(destination);
          setGuestFavorites((prev) => [destination, ...prev.filter((item) => item.id !== destination.id)]);
        }
        return !currentlyFav;
      }

      // Authenticated server call
      if (currentlyFav) {
        await removeMutation.mutateAsync(destination.id);
      } else {
        await addMutation.mutateAsync(destination.id);
      }
      return !currentlyFav;
    },
    [favoriteIds, isGuest, addMutation, removeMutation]
  );

  const refetch = useCallback(async () => {
    if (isGuest) {
      const list = await getGuestFavorites();
      setGuestFavorites(list);
    } else {
      await refetchServer();
    }
  }, [isGuest, refetchServer]);

  return {
    favorites,
    favoriteIds,
    isFavorite,
    toggleFavorite,
    isGuest,
    isLoading,
    refetch,
  };
}
