import {
  MemberLocationShare,
  MeetupPoint,
  TripCheckIn,
  StartLocationSharePayload,
  UpdateLocationSharePayload,
  CreateMeetupPointPayload,
  CreateCheckInPayload,
} from '../types';

const API_BASE = '/api/v1';

export class ApiProblemError extends Error {
  status: number;
  code?: string;
  detail?: string;

  constructor(status: number, message: string, code?: string, detail?: string) {
    super(message);
    this.name = 'ApiProblemError';
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem('vista_token') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(res: Response, defaultMessage: string): Promise<T> {
  if (res.ok) {
    if (res.status === 204) {
      return undefined as unknown as T;
    }
    return (await res.json()) as T;
  }

  let errorMessage = defaultMessage;
  let errorCode: string | undefined;
  let errorDetail: string | undefined;

  try {
    const errorBody = await res.json();
    if (errorBody) {
      errorMessage = errorBody.message || errorBody.title || errorBody.detail || defaultMessage;
      errorCode = errorBody.code || errorBody.error;
      errorDetail = errorBody.detail;
    }
  } catch {
    // Non-JSON response
  }

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vista_auth_expired'));
    }
    throw new ApiProblemError(
      401,
      'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
      'UNAUTHORIZED',
      errorDetail
    );
  }

  if (res.status === 403) {
    throw new ApiProblemError(
      403,
      'Bạn không có quyền thực hiện thao tác này trong chuyến đi.',
      'FORBIDDEN',
      errorDetail
    );
  }

  throw new ApiProblemError(res.status, errorMessage, errorCode, errorDetail);
}

export const tripLocationService = {
  // ─── LOCATION SHARES (WEEK 4) ───
  async startLocationShare(
    tripId: string,
    payload: StartLocationSharePayload
  ): Promise<MemberLocationShare> {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/location-shares/me`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return await handleResponse<MemberLocationShare>(
        res,
        'Không thể bắt đầu chia sẻ vị trí. Vui lòng thử lại.'
      );
    } catch (err: unknown) {
      if (err instanceof ApiProblemError) throw err;
      throw new ApiProblemError(0, 'Mất kết nối mạng. Vui lòng kiểm tra đường truyền.');
    }
  },

  async updateLocationShare(
    tripId: string,
    payload: UpdateLocationSharePayload
  ): Promise<MemberLocationShare> {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/location-shares/me`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return await handleResponse<MemberLocationShare>(
        res,
        'Không thể cập nhật tọa độ vị trí.'
      );
    } catch (err: unknown) {
      if (err instanceof ApiProblemError) throw err;
      throw new ApiProblemError(0, 'Mất kết nối mạng khi cập nhật vị trí.');
    }
  },

  async stopLocationShare(tripId: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/location-shares/me`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      await handleResponse<void>(res, 'Không thể dừng chia sẻ vị trí trên máy chủ.');
    } catch (err: unknown) {
      if (err instanceof ApiProblemError) throw err;
      throw new ApiProblemError(
        0,
        'Lỗi mạng: Không thể xác nhận dừng chia sẻ trên máy chủ. Máy chủ có thể vẫn đang lưu phiên chia sẻ của bạn.'
      );
    }
  },

  async getActiveLocationShares(tripId: string): Promise<MemberLocationShare[]> {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/location-shares?size=50`, {
        headers: getAuthHeaders(),
      });
      const data = await handleResponse<{ content?: MemberLocationShare[]; items?: MemberLocationShare[] }>(
        res,
        'Không thể tải danh sách vị trí thành viên.'
      );
      return data?.content || data?.items || [];
    } catch (err: unknown) {
      if (err instanceof ApiProblemError) throw err;
      throw new ApiProblemError(0, 'Không thể kết nối đến máy chủ để lấy vị trí nhóm.');
    }
  },

  // ─── MEETUP POINTS (WEEK 5) ───
  async getMeetupPoints(tripId: string): Promise<MeetupPoint[]> {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/meetup-points`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<MeetupPoint[]>(res, 'Không thể tải điểm hẹn nhóm.');
    } catch (err: unknown) {
      if (err instanceof ApiProblemError) throw err;
      throw new ApiProblemError(0, 'Mất kết nối mạng khi tải danh sách điểm hẹn.');
    }
  },

  async createMeetupPoint(
    tripId: string,
    payload: CreateMeetupPointPayload
  ): Promise<MeetupPoint> {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/meetup-points`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return await handleResponse<MeetupPoint>(res, 'Không thể tạo điểm hẹn.');
    } catch (err: unknown) {
      if (err instanceof ApiProblemError) throw err;
      throw new ApiProblemError(0, 'Mất kết nối mạng khi tạo điểm hẹn.');
    }
  },

  async deleteMeetupPoint(tripId: string, meetupId: string): Promise<void> {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/meetup-points/${meetupId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      await handleResponse<void>(res, 'Không thể xóa điểm hẹn.');
    } catch (err: unknown) {
      if (err instanceof ApiProblemError) throw err;
      throw new ApiProblemError(0, 'Mất kết nối mạng khi xóa điểm hẹn.');
    }
  },

  // ─── CHECK-INS (WEEK 5) ───
  async createCheckIn(
    tripId: string,
    payload: CreateCheckInPayload
  ): Promise<TripCheckIn> {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/check-ins`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      return await handleResponse<TripCheckIn>(res, 'Không thể ghi nhận check-in.');
    } catch (err: unknown) {
      if (err instanceof ApiProblemError) throw err;
      throw new ApiProblemError(0, 'Mất kết nối mạng khi gửi check-in.');
    }
  },

  async getCheckIns(tripId: string): Promise<TripCheckIn[]> {
    try {
      const res = await fetch(`${API_BASE}/trips/${tripId}/check-ins`, {
        headers: getAuthHeaders(),
      });
      return await handleResponse<TripCheckIn[]>(res, 'Không thể tải lịch sử check-in.');
    } catch (err: unknown) {
      if (err instanceof ApiProblemError) throw err;
      throw new ApiProblemError(0, 'Mất kết nối mạng khi tải lịch sử check-in.');
    }
  },
};
