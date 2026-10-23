import { api, storage } from './client';

export interface DestinationSummary {
  id: string;
  name: string;
  province: string;
  category: string;
  imageUrl?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status?: string;
}

const GUEST_FAVORITES_KEY = 'vista_guest_favorites';
const GUEST_HISTORY_KEY = 'vista_guest_history';

// --- AUTHENTICATED SERVER API ---

export async function fetchFavorites(): Promise<DestinationSummary[]> {
  const response = await api.get<DestinationSummary[]>('/destinations/favorites');
  return response.data;
}

export async function addFavoriteApi(destinationId: string): Promise<void> {
  await api.put(`/destinations/${destinationId}/favorite`);
}

export async function removeFavoriteApi(destinationId: string): Promise<void> {
  await api.delete(`/destinations/${destinationId}/favorite`);
}

export async function recordHistoryApi(destinationId: string): Promise<void> {
  await api.post(`/destinations/${destinationId}/history`);
}

export async function fetchHistory(limit = 10): Promise<DestinationSummary[]> {
  const response = await api.get<DestinationSummary[]>('/destinations/history', {
    params: { limit },
  });
  return response.data;
}

// --- GUEST LOCAL FALLBACK STORAGE ---

export async function getGuestFavorites(): Promise<DestinationSummary[]> {
  try {
    const raw = await storage.getItem(GUEST_FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveGuestFavorite(destination: DestinationSummary): Promise<void> {
  try {
    const list = await getGuestFavorites();
    const filtered = list.filter((item) => item.id !== destination.id);
    filtered.unshift(destination);
    await storage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(filtered));
  } catch {}
}

export async function removeGuestFavorite(destinationId: string): Promise<void> {
  try {
    const list = await getGuestFavorites();
    const filtered = list.filter((item) => item.id !== destinationId);
    await storage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(filtered));
  } catch {}
}

export async function getGuestHistory(): Promise<DestinationSummary[]> {
  try {
    const raw = await storage.getItem(GUEST_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveGuestHistory(destination: DestinationSummary): Promise<void> {
  try {
    const list = await getGuestHistory();
    const filtered = list.filter((item) => item.id !== destination.id);
    filtered.unshift(destination);
    const trimmed = filtered.slice(0, 30);
    await storage.setItem(GUEST_HISTORY_KEY, JSON.stringify(trimmed));
  } catch {}
}
