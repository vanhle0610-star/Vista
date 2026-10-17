/**
 * Feature: User Profile & Settings
 * Phụ trách: M4 (Mobile Core Engineer)
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}
