/**
 * Feature: Group Trip Management & Invitations (BF-03)
 * Phụ trách: M4 (Mobile Core Engineer)
 */
export interface TripMember {
  userId: string;
  tripId: string;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  displayName?: string;
}
