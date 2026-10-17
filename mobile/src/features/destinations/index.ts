/**
 * Feature: Destinations (BF-01)
 * Phụ trách: M4 (Mobile Core) / M5 (Mobile Safety/Community - Detail Screen W3)
 */
export interface DestinationItem {
  id: string;
  name: string;
  province: string;
  category: string;
  imageUrl?: string | null;
  priceMin?: number;
  priceMax?: number;
}
