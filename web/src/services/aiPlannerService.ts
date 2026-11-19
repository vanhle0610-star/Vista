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
  priorityInterests?: string[];
  mustVisitPlaces?: string[];
  avoidPlaces?: string[];
  customNotes?: string;
  enableLlmRerank?: boolean;
  enableLlmNarration?: boolean;
  rejectedDestinationIds?: string[];
  rejectedSubtypes?: string[];
  includeInternalDiagnostics?: boolean;
}

export interface AiSuggestedActivity {
  destinationId: string;
  timeSlot: string;
  destinationName: string;
  estimatedCost: number;
  category: string;
  note: string;
  tip?: string;
  rationale?: string;
  timeSlotReason?: string;
  whyVisitReason?: string;
  startTime?: string;
  endTime?: string;
  visitDurationMinutes?: number;
  travelDurationFromPreviousMinutes?: number;
  bufferMinutes?: number;
  costStatus?: 'FREE' | 'PAID' | 'ESTIMATED' | 'UNVERIFIED';
  costLabel?: string;
  dataConfidence?: 'VERIFIED' | 'UNVERIFIED_HOURS';
  warning?: string;
}

export interface AiSuggestedDay {
  dayNumber: number;
  dateLabel: string;
  title?: string;
  dayRationale?: string;
  subtotalCostVnd?: number;
  activities: AiSuggestedActivity[];
}

export interface AiItinerarySuggestionResponse {
  destinationProvince: string;
  totalDays: number;
  budgetLevel: string;
  estimatedTotalCost: number;
  minFluctuationVnd?: number;
  maxFluctuationVnd?: number;
  warnings?: string[];
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
  scheduleStatus?: string;
  conflicts?: Record<string, any>[];
  breakdown?: Record<string, any>;
  internalDiagnostics?: Record<string, any>;
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
  // 1. Primary: Direct Next.js AI Route Handler
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (request.includeInternalDiagnostics) {
      headers['X-Admin-Inspect'] = 'true';
    }
    const res = await fetch('/api/ai/quick-plan', {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (res.ok) {
      const liveData = (await res.json()) as AiItinerarySuggestionResponse;
      if (liveData && liveData.days && liveData.days.length > 0) {
        liveData.provider = liveData.provider === 'claude' ? 'claude' : 'gemini';
        liveData.fallbackUsed = false;
        liveData.isMockData = false;
        return liveData;
      }
    }
  } catch (routeErr) {
    console.warn('Next.js direct route call error, attempting Spring Boot backend:', routeErr);
  }

  // 2. Secondary: Spring Boot Backend API
  const isBackend = isBackendTripId(tripId);
  const path = isBackend
    ? `/trips/${tripId}/ai/itinerary-suggestions`
    : '/ai/quick-plan';

  const backendData = await apiRequest<AiItinerarySuggestionResponse>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (backendData && backendData.days && backendData.days.length > 0) {
    backendData.provider = backendData.provider === 'claude' ? 'claude' : 'gemini';
    backendData.fallbackUsed = false;
    backendData.isMockData = false;
  }

  return backendData;
}

