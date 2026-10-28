import { apiRequest } from '@/lib/api';

export interface MergeItineraryItem {
  destinationId?: string;
  customStopName?: string;
  startTime?: string;
  endTime?: string;
  sortOrder: number;
  note?: string;
  source: 'AI_LOCAL' | 'AI_GEMINI' | 'AI_OFFLINE' | 'MANUAL';
}

export interface MergeItineraryDay {
  dayNumber: number;
  activities: MergeItineraryItem[];
}

export interface ItineraryResponse {
  tripId: string;
  days: Array<{
    id: string;
    dayNumber: number;
    tripDate: string;
    version: number;
    activities: Array<{
      id: string;
      destinationId?: string;
      destinationName?: string;
      customStopName?: string;
      startTime?: string;
      endTime?: string;
      sortOrder: number;
      note?: string;
      source: string;
      version: number;
    }>;
  }>;
}

export function mergeTripItinerary(
  tripId: string,
  days: MergeItineraryDay[],
): Promise<ItineraryResponse> {
  return apiRequest<ItineraryResponse>(`/trips/${tripId}/itinerary/merge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ days }),
  });
}

export function getTripItinerary(tripId: string): Promise<ItineraryResponse> {
  return apiRequest<ItineraryResponse>(`/trips/${tripId}/itinerary`);
}

