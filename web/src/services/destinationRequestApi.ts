import { apiRequest } from '@/lib/api';

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

export interface DestinationDetailSnapshot {
  id: string;
  name: string;
  province: string;
  category: string;
  imageUrl?: string | null;
  imageUrls?: string[];
  priceMin?: number | null;
  priceMax?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  status: string;
  description?: string | null;
  openingHours?: Record<string, string>;
  sourceUrl?: string | null;
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
  reviewedBy?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  currentDestination?: DestinationDetailSnapshot | null;
}

export interface DestinationRequestPage {
  items: DestinationRequestItem[];
  page: number;
  size: number;
  total: number;
}

export interface DestinationRequestStats {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export async function submitDestinationRequest(
  payload: SubmitDestinationRequestPayload,
): Promise<DestinationRequestItem> {
  return apiRequest<DestinationRequestItem>('/destination-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function updateMyDestinationRequest(
  id: string,
  payload: SubmitDestinationRequestPayload,
): Promise<DestinationRequestItem> {
  return apiRequest<DestinationRequestItem>(`/destination-requests/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export async function fetchMyDestinationRequests(
  status?: string,
  page = 0,
  size = 20,
): Promise<DestinationRequestPage> {
  const params = new URLSearchParams({ page: String(page), size: String(size) });
  if (status && status !== 'ALL') params.set('status', status);
  return apiRequest<DestinationRequestPage>(`/destination-requests/me?${params.toString()}`);
}

export async function fetchAdminDestinationRequests(paramsObj: {
  status?: string;
  requestType?: string;
  keyword?: string;
  page?: number;
  size?: number;
}): Promise<DestinationRequestPage> {
  const params = new URLSearchParams({
    status: paramsObj.status || 'PENDING',
    page: String(paramsObj.page ?? 0),
    size: String(paramsObj.size ?? 20),
  });
  if (paramsObj.requestType && paramsObj.requestType !== 'ALL') {
    params.set('requestType', paramsObj.requestType);
  }
  if (paramsObj.keyword?.trim()) {
    params.set('keyword', paramsObj.keyword.trim());
  }
  return apiRequest<DestinationRequestPage>(`/admin/destination-requests?${params.toString()}`);
}

export async function fetchAdminDestinationRequestStats(): Promise<DestinationRequestStats> {
  return apiRequest<DestinationRequestStats>('/admin/destination-requests/stats');
}

export async function fetchAdminDestinationRequestDetail(
  id: string,
): Promise<DestinationRequestItem> {
  return apiRequest<DestinationRequestItem>(
    `/admin/destination-requests/${encodeURIComponent(id)}`,
  );
}

export async function approveAdminDestinationRequest(
  id: string,
  overrides?: Partial<SubmitDestinationRequestPayload>,
): Promise<DestinationRequestItem> {
  return apiRequest<DestinationRequestItem>(
    `/admin/destination-requests/${encodeURIComponent(id)}/approve`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(overrides ?? {}),
    },
  );
}

export async function rejectAdminDestinationRequest(
  id: string,
  reason: string,
): Promise<DestinationRequestItem> {
  return apiRequest<DestinationRequestItem>(
    `/admin/destination-requests/${encodeURIComponent(id)}/reject`,
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    },
  );
}
