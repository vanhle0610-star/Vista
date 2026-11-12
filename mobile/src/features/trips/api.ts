import { api } from '@/services/api/client';
import { Trip, TripMember, Invitation } from './types';

export const tripFeatureApi = {
  /**
   * Lấy chi tiết chuyến đi
   * GET /trips/{tripId}
   */
  async fetchTrip(tripId: string): Promise<Trip> {
    const res = await api.get<Trip>(`/trips/${tripId}`);
    return res.data;
  },

  /**
   * Xóa chuyến đi (Chỉ OWNER)
   * DELETE /trips/{tripId}
   */
  async deleteTrip(tripId: string): Promise<void> {
    await api.delete(`/trips/${tripId}`);
  },

  /**
   * Lấy danh sách thành viên chuyến đi
   * GET /trips/{tripId}/members
   */
  async fetchTripMembers(tripId: string): Promise<TripMember[]> {
    const res = await api.get<TripMember[]>(`/trips/${tripId}/members`);
    return res.data;
  },

  /**
   * Thành viên tự rời nhóm (TV3)
   * DELETE /trips/{tripId}/members/me
   */
  async leaveTrip(tripId: string): Promise<void> {
    await api.delete(`/trips/${tripId}/members/me`);
  },

  /**
   * Chuyển quyền trưởng nhóm (TV3)
   * POST /trips/{tripId}/transfer-ownership
   */
  async transferOwnership(tripId: string, newOwnerId: string): Promise<{ success: boolean; message?: string }> {
    const res = await api.post(`/trips/${tripId}/transfer-ownership`, { newOwnerId });
    return res.data;
  },

  /**
   * Tạo lời mời chuyến đi (TV3)
   * POST /trips/{tripId}/invitations
   */
  async createInvitation(tripId: string, payload?: { role?: string; expireDays?: number }): Promise<Invitation> {
    const res = await api.post<Invitation>(`/trips/${tripId}/invitations`, payload ?? {});
    return res.data;
  },

  /**
   * Thu hồi lời mời (Chỉ OWNER)
   * DELETE /trips/{tripId}/invitations/{invitationId}
   */
  async revokeInvitation(tripId: string, invitationId: string): Promise<void> {
    await api.delete(`/trips/${tripId}/invitations/${invitationId}`);
  },

  /**
   * Xem danh sách lời mời
   * GET /trips/{tripId}/invitations
   */
  async fetchInvitations(tripId: string): Promise<Invitation[]> {
    const res = await api.get<Invitation[]>(`/trips/${tripId}/invitations`);
    return res.data;
  },
};

