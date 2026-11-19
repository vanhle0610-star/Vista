import { api } from './client';

export interface UserProfileResponse {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  status: string;
  roles: string[];
  phoneNumber?: string | null;
  bio?: string | null;
  bankCode?: string | null;
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  travelPreferences?: string[];
}

export interface UpdateProfilePayload {
  displayName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  bio?: string;
  bankCode?: string;
  bankBin?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  travelPreferences?: string[];
}

export const userApi = {
  /**
   * Lấy thông tin hồ sơ của người dùng hiện tại
   * GET /api/v1/users/me
   */
  async getProfile(): Promise<UserProfileResponse> {
    const res = await api.get<UserProfileResponse>('/users/me');
    return res.data;
  },

  /**
   * Cập nhật thông tin hồ sơ người dùng
   * PATCH /api/v1/users/me
   */
  async updateProfile(payload: UpdateProfilePayload): Promise<UserProfileResponse> {
    const res = await api.patch<UserProfileResponse>('/users/me', payload);
    return res.data;
  },
};
