import { apiRequest } from '@/lib/api';
import {
  ActivityItem,
  DayPlanItem,
  getSampleItineraryForDestination,
  getSampleProposals,
} from '@/data/sampleItineraries';

export function toIsoDateOffset(startDateStr?: string, dayOffset = 0): string {
  let base = new Date();
  if (startDateStr) {
    const clean = startDateStr.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split('-').map(Number);
      base = new Date(y, m - 1, d);
    } else if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(clean)) {
      const [d, m, y] = clean.split('/').map(Number);
      base = new Date(y, m - 1, d);
    }
  }
  base.setDate(base.getDate() + dayOffset);
  const y = base.getFullYear();
  const m = String(base.getMonth() + 1).padStart(2, '0');
  const d = String(base.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function countTripDaysInclusive(startDateStr?: string, endDateStr?: string): number {
  if (!startDateStr || !endDateStr) return 3;
  const startIso = toIsoDateOffset(startDateStr, 0);
  const endIso = toIsoDateOffset(endDateStr, 0);
  const [sy, sm, sd] = startIso.split('-').map(Number);
  const [ey, em, ed] = endIso.split('-').map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);
  const diffDays = Math.floor((endMs - startMs) / 86400000) + 1;
  return Math.max(1, Math.min(diffDays, 7));
}

export function parseTimeRangeForApi(timeStr?: string): { startTime?: string; endTime?: string } {
  if (!timeStr) return {};
  const parts = timeStr.split(/[-–—]/);
  const formatPart = (part?: string): string | undefined => {
    if (!part) return undefined;
    const m = part.trim().match(/^(\d{1,2}):(\d{2})/);
    if (!m) return undefined;
    const h = Number(m[1]);
    const min = Number(m[2]);
    if (Number.isNaN(h) || Number.isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) {
      return undefined;
    }
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}:00`;
  };
  const startTime = formatPart(parts[0]);
  const endTime = formatPart(parts[1]);
  if (startTime && endTime && endTime <= startTime) {
    return { startTime };
  }
  return { startTime, endTime };
}

export async function seedSampleItineraryToTrip(params: {
  tripId: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  existingDays?: Array<{ id?: string; dayNumber: number }>;
  seedProposals?: boolean;
}): Promise<DayPlanItem[]> {
  const { tripId, destination, startDate, endDate, existingDays = [], seedProposals = true } = params;
  const maxDays = countTripDaysInclusive(startDate, endDate);
  const sampleDays = getSampleItineraryForDestination(destination, startDate).slice(0, maxDays);

  const existingDayIdByNumber = new Map<number, string>();
  existingDays.forEach((d) => {
    if (d.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.id)) {
      existingDayIdByNumber.set(d.dayNumber, d.id);
    }
  });

  const hydratedDays: DayPlanItem[] = [];

  for (const sampleDay of sampleDays) {
    const tripDateIso = toIsoDateOffset(startDate, sampleDay.dayNumber - 1);
    let backendDayId = existingDayIdByNumber.get(sampleDay.dayNumber);

    if (!backendDayId) {
      try {
        const createdDay = await apiRequest<any>(`/trips/${tripId}/itinerary/days`, {
          method: 'POST',
          body: JSON.stringify({
            dayNumber: sampleDay.dayNumber,
            tripDate: tripDateIso,
          }),
        });
        if (createdDay?.id) {
          backendDayId = String(createdDay.id);
        }
      } catch {
        // Nếu ngày đã tồn tại trên backend nhưng chưa nằm trong existingDays, fetch lại danh sách ngày
        const fetchedDays = await apiRequest<any[]>(`/trips/${tripId}/itinerary/days`).catch(() => []);
        const match = Array.isArray(fetchedDays)
          ? fetchedDays.find((fd) => Number(fd.dayNumber) === sampleDay.dayNumber)
          : null;
        if (match?.id) backendDayId = String(match.id);
      }
    }

    const hydratedActivities: ActivityItem[] = [];
    for (let idx = 0; idx < (sampleDay.activities || []).length; idx += 1) {
      const act = sampleDay.activities[idx];
      let savedItemId = act.id;

      if (backendDayId) {
        const { startTime, endTime } = parseTimeRangeForApi(act.timeRange || act.timeSlot);
        try {
          const createdItem = await apiRequest<any>(`/itinerary/days/${backendDayId}/items`, {
            method: 'POST',
            body: JSON.stringify({
              customStopName: act.title,
              startTime: startTime || null,
              endTime: endTime || null,
              sortOrder: idx,
              note: act.description || null,
            }),
          });
          if (createdItem?.id) {
            savedItemId = String(createdItem.id);
          }
        } catch {
          // Giữ act.id fallback nếu backend từ chối 1 item
        }
      }

      hydratedActivities.push({
        ...act,
        id: savedItemId,
      });
    }

    hydratedDays.push({
      ...sampleDay,
      ...(backendDayId ? { id: backendDayId } : {}),
      dateStr: tripDateIso.split('-').reverse().join('/'),
      activities: hydratedActivities,
    } as DayPlanItem & { id?: string });
  }

  if (seedProposals) {
    const sampleProps = getSampleProposals(destination).slice(0, 3);
    for (const prop of sampleProps) {
      try {
        await apiRequest(`/trips/${tripId}/proposals`, {
          method: 'POST',
          body: JSON.stringify({ title: prop.title }),
        });
      } catch {
        // Bỏ qua nếu đã có đề xuất hoặc không hỗ trợ
      }
    }
  }

  if (typeof window !== 'undefined' && hydratedDays.length > 0) {
    try {
      localStorage.setItem(`vista_trip_itinerary_${tripId}`, JSON.stringify(hydratedDays));
    } catch {}
  }

  return hydratedDays;
}
