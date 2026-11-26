import { api } from './client';

export interface SubmitDestinationRequestPayload {
  requestType: 'CREATE' | 'UPDATE';
  targetDestinationId?: string | null;
  name?: string | null;
  provinceName?: string | null;
  categoryName?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  openingHours?: Record<string, string> | string | null;
  imageUrls?: string[] | null;
  sourceUrl?: string | null;
  note?: string | null;
}

export interface DestinationRequestItem {
  id: string;
  requestType: 'CREATE' | 'UPDATE';
  targetDestinationId?: string | null;
  targetDestinationName?: string | null;
  submittedBy: string;
  submittedByName?: string | null;
  name?: string | null;
  provinceName?: string | null;
  categoryName?: string | null;
  description?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  priceMin?: number | null;
  priceMax?: number | null;
  openingHours?: Record<string, string>;
  imageUrls?: string[];
  sourceUrl?: string | null;
  note?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DestinationRequestPage {
  items: DestinationRequestItem[];
  page: number;
  size: number;
  total: number;
}

export async function submitDestinationRequest(
  payload: SubmitDestinationRequestPayload,
): Promise<DestinationRequestItem> {
  const res = await api.post<DestinationRequestItem>('/destination-requests', payload);
  return res.data;
}

export async function updateMyDestinationRequest(
  id: string,
  payload: SubmitDestinationRequestPayload,
): Promise<DestinationRequestItem> {
  const res = await api.put<DestinationRequestItem>(`/destination-requests/${id}`, payload);
  return res.data;
}

export async function fetchMyDestinationRequests(
  status?: string,
  page = 0,
  size = 20,
): Promise<DestinationRequestPage> {
  const params: Record<string, string | number> = { page, size };
  if (status && status !== 'ALL') params.status = status;
  const res = await api.get<DestinationRequestPage>('/destination-requests/me', { params });
  return res.data;
}
