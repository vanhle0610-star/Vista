/**
 * Feature: Trips (BF-02, BF-03, TV4 Stitch UI)
 */
export interface TripItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  destinationSummary?: string;
}

export * from './components/TripsHubScreen';
export * from './components/CreateTripModal';
export * from './components/InviteCodeModal';
