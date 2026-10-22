import { create, isAxiosError } from 'axios';
import { Platform } from 'react-native';
import { authStorage } from '../auth/authStorage';

const defaultBaseUrl =
  Platform.OS === 'android' ? 'http://10.0.2.2:8081/api/v1' : 'http://localhost:8081/api/v1';

export const api = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? defaultBaseUrl,
  timeout: 10_000,
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await authStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function apiErrorMessage(reason: unknown) {
  if (isAxiosError(reason)) {
    const data = reason.response?.data as { detail?: string } | undefined;
    return (
      data?.detail ??
      (reason.code === 'ECONNABORTED'
        ? 'Máy chủ phản hồi quá lâu.'
        : 'Không thể kết nối máy chủ.')
    );
  }
  return 'Đã xảy ra lỗi không xác định.';
}
