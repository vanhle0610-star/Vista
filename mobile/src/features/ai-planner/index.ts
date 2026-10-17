/**
 * Feature: AI-Assisted Trip Planning (BF-02)
 * Phụ trách: M4 (Mobile Core Engineer)
 */
export interface AiPlanRequest {
  destinationProvince: string;
  durationDays: number;
  budgetPreference: 'LOW' | 'MEDIUM' | 'HIGH';
  interests: string[];
}
