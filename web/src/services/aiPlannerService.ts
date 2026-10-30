import { apiRequest } from '@/lib/api';

export type AiProvider = 'local' | 'gemini' | 'claude' | 'deterministic' | 'unknown';

export interface AiItinerarySuggestionRequest {
  destinationProvince: string;
  totalDays: number;
  budgetLevel: string;
  interests: string[];
  startDate?: string;
  peopleCount?: number;
  travelWith?: string;
  specialRequests?: string;
  arrivalTime?: string;
  departureTime?: string;
  pace?: string;
  travelMode?: string;
  mustVisitPlaces?: string[];
  avoidPlaces?: string[];
}

export interface AiSuggestedActivity {
  destinationId: string;
  timeSlot: string;
  destinationName: string;
  estimatedCost: number;
  category: string;
  note: string;
  rationale?: string;
  timeSlotReason?: string;
  whyVisitReason?: string;
  startTime?: string;
  endTime?: string;
  visitDurationMinutes?: number;
  travelDurationFromPreviousMinutes?: number;
  bufferMinutes?: number;
  costStatus?: 'FREE' | 'PAID' | 'ESTIMATED' | 'UNVERIFIED';
  warning?: string;
}

export interface AiSuggestedDay {
  dayNumber: number;
  dateLabel: string;
  activities: AiSuggestedActivity[];
}

export interface AiItinerarySuggestionResponse {
  destinationProvince: string;
  totalDays: number;
  budgetLevel: string;
  estimatedTotalCost: number;
  isMockData: boolean;
  days: AiSuggestedDay[];
  provider: AiProvider;
  fallbackUsed: boolean;
  citations: AiCitation[];
  weatherSummary?: string;
  pacingSummary?: string;
  localAdviceSummary?: string;
  strategicRationale?: string;
  companionFitRationale?: string;
  budgetOptimizationRationale?: string;
  totalSightseeingCost?: number;
  totalDiningCost?: number;
  totalTransitCost?: number;
  isBudgetFeasible?: boolean;
  unverifiedCostCount?: number;
}

export interface AiCitation {
  sourceType: string;
  sourceId: string;
  title: string;
  chunkId: string;
  retrievalMethod: string;
  score: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isBackendTripId(value?: string | null): value is string {
  return Boolean(value && UUID_PATTERN.test(value));
}

export async function requestAiItinerary(
  request: AiItinerarySuggestionRequest,
  tripId?: string | null,
): Promise<AiItinerarySuggestionResponse> {
  const path = isBackendTripId(tripId)
    ? `/trips/${tripId}/ai/itinerary-suggestions`
    : '/ai/quick-plan';

  return apiRequest<AiItinerarySuggestionResponse>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
}

