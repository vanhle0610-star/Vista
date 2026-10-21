import { create, isAxiosError } from 'axios';

import { Platform } from 'react-native';

const resolveBaseUrl = () => {
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (Platform.OS === 'web') {
    if (!envUrl || envUrl.includes('10.0.2.2')) {
      return 'http://localhost:8080/api/v1';
    }
    return envUrl;
  }
  return envUrl ?? 'http://10.0.2.2:8080/api/v1';
};

export const api = create({
  baseURL: resolveBaseUrl(),
  timeout: 10_000,
  headers: { Accept: 'application/json' },
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
