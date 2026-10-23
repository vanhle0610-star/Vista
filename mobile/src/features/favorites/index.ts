/**
 * Feature: Favorites & History
 * Phụ trách: TV1 (Destination Discovery & Mobile Lead)
 */
export interface FavoriteItem {
  userId: string;
  destinationId: string;
  createdAt: string;
}

export * from '../../services/api/destinationApi';
export * from './useFavorites';
export * from './useDestinationHistory';
