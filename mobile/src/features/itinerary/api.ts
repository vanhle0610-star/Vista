import { api } from '@/services/api/client';
import {
  ItineraryDay,
  ItineraryItem,
  ItineraryValidationWarning,
  CreateItemPayload,
  UpdateItemPayload,
} from './types';

export const itineraryApi = {
  /**
   * Lấy danh sách ngày lịch trình kèm các điểm dừng
   * GET /trips/{tripId}/itinerary/days
   */
  async fetchDays(tripId: string): Promise<ItineraryDay[]> {
    const res = await api.get<ItineraryDay[]>(`/trips/${tripId}/itinerary/days`);
    return res.data;
  },

  /**
   * Thêm một ngày mới vào lịch trình
   * POST /trips/{tripId}/itinerary/days
   */
  async createDay(tripId: string, dayNumber: number, tripDate: string): Promise<ItineraryDay> {
    const res = await api.post<ItineraryDay>(`/trips/${tripId}/itinerary/days`, {
      dayNumber,
      tripDate,
    });
    return res.data;
  },

  /**
   * Thêm một điểm dừng vào ngày lịch trình
   * POST /itinerary/days/{dayId}/items
   */
  async createItem(dayId: string, payload: CreateItemPayload): Promise<ItineraryItem> {
    const res = await api.post<ItineraryItem>(`/itinerary/days/${dayId}/items`, payload);
    return res.data;
  },

  /**
   * Cập nhật điểm dừng — hỗ trợ optimistic concurrency qua expected_updated_at
   * PATCH /itinerary/items/{itemId}
   */
  async updateItem(itemId: string, payload: UpdateItemPayload): Promise<ItineraryItem> {
    const res = await api.patch<ItineraryItem>(`/itinerary/items/${itemId}`, payload);
    return res.data;
  },

  /**
   * Xóa một điểm dừng
   * DELETE /itinerary/items/{itemId}
   */
  async deleteItem(itemId: string): Promise<void> {
    await api.delete(`/itinerary/items/${itemId}`);
  },

  /**
   * Sắp xếp lại thứ tự điểm dừng trong 1 ngày
   * PUT /itinerary/days/{dayId}/items/reorder
   */
  async reorderItems(dayId: string, orderedItemIds: string[]): Promise<ItineraryItem[]> {
    const res = await api.put<ItineraryItem[]>(`/itinerary/days/${dayId}/items/reorder`, {
      orderedItemIds,
    });
    return res.data;
  },

  /**
   * Validate toàn bộ lịch trình chuyến đi (phát hiện trùng giờ hoặc ngoài khoảng ngày)
   * GET /trips/{tripId}/itinerary/validate
   */
  async validateItinerary(tripId: string): Promise<ItineraryValidationWarning[]> {
    const res = await api.get<ItineraryValidationWarning[]>(`/trips/${tripId}/itinerary/validate`);
    return res.data;
  },
};

