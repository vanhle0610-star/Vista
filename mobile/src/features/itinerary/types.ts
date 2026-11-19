export interface ItineraryItem {
  id: string;
  dayId: string;
  destinationId?: string | null;
  customStopName?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  sortOrder: number;
  note?: string | null;
  source?: string | null;
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
}

export interface ItineraryDay {
  id: string;
  tripId: string;
  dayNumber: number;
  tripDate: string;
  items: ItineraryItem[];
  version?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ItineraryValidationWarning {
  code: 'TIME_OVERLAP' | 'OUT_OF_TRIP_DATE' | 'INVALID_TIME_RANGE' | string;
  dayId?: string | null;
  itemId?: string | null;
  message: string;
}

export interface CreateItemPayload {
  customStopName?: string;
  destinationId?: string;
  startTime?: string | null;
  endTime?: string | null;
  sortOrder?: number;
  note?: string;
}

export interface UpdateItemPayload {
  customStopName?: string;
  destinationId?: string;
  startTime?: string | null;
  endTime?: string | null;
  sortOrder?: number;
  note?: string;
  expected_updated_at?: string;
}

