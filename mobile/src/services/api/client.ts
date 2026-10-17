import { create, isAxiosError } from 'axios';

export const api = create({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:8080/api/v1',
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
