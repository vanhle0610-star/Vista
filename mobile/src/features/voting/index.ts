/**
 * Feature: Voting & Destination Proposals (BF-03)
 * Phụ trách: M5 (Mobile Safety/Community Engineer)
 */
export interface DestinationProposal {
  id: string;
  tripId: string;
  destinationId?: string;
  proposedBy: string;
  title: string;
  status: 'OPEN' | 'ACCEPTED' | 'REJECTED';
}
