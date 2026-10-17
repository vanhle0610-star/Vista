/**
 * Feature: Trips (BF-02, BF-03)
 * Phụ trách: M4 (Mobile Core Engineer)
 */
export interface TripItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'ACTIVE' | 'ENDED' | 'CANCELLED';
  destinationSummary?: string;
}
