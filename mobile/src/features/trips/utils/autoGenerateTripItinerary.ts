import { expenseApi } from '@/services/api/expenseApi';
import { tripApi } from '@/services/api/tripApi';
import { parseLocalNoonDate } from '@/utils/tripStatus';

export interface AutoItineraryResult {
  generatedDays: number;
  generatedStops: number;
}

const DESTINATION_PROVINCE_ALIASES: Array<[string, string]> = [
  ['phu quoc', 'Kiên Giang'],
  ['da lat', 'Lâm Đồng'],
  ['hoi an', 'Quảng Nam'],
  ['sapa', 'Lào Cai'],
  ['sa pa', 'Lào Cai'],
  ['nha trang', 'Khánh Hòa'],
  ['ha long', 'Quảng Ninh'],
  ['vung tau', 'Bà Rịa - Vũng Tàu'],
  ['con dao', 'Bà Rịa - Vũng Tàu'],
  ['mui ne', 'Bình Thuận'],
  ['phan thiet', 'Bình Thuận'],
  ['quy nhon', 'Bình Định'],
  ['phong nha', 'Quảng Bình'],
  ['hue', 'Thừa Thiên Huế'],
  ['cat ba', 'Hải Phòng'],
  ['sai gon', 'Hồ Chí Minh'],
];

export function normalizeProvinceForAi(rawDestination: string): string {
  const clean = rawDestination.trim();
  const normalized = clean
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();

  for (const [alias, province] of DESTINATION_PROVINCE_ALIASES) {
    if (normalized.includes(alias)) {
      return province;
    }
  }
  return clean;
}

function formatYmd(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function resolveBudgetLevel(budgetTotal?: number): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (!budgetTotal || budgetTotal <= 0) return 'MEDIUM';
  if (budgetTotal < 5_000_000) return 'LOW';
  if (budgetTotal > 20_000_000) return 'HIGH';
  return 'MEDIUM';
}

function mapSlotTime(timeSlot?: string, index = 0): { startTime: string; endTime: string } {
  const slot = (timeSlot || '').toUpperCase();
  if (slot === 'MORNING') return { startTime: '08:30', endTime: '11:00' };
  if (slot === 'AFTERNOON') return { startTime: '14:00', endTime: '17:00' };
  if (slot === 'EVENING') return { startTime: '18:30', endTime: '20:30' };
  const startH = Math.min(20, 8 + index * 3);
  return {
    startTime: `${String(startH).padStart(2, '0')}:00`,
    endTime: `${String(Math.min(22, startH + 2)).padStart(2, '0')}:30`,
  };
}

/**
 * Tự động gọi AI Planner để đề xuất và tạo lịch trình ban đầu cho chuyến đi vừa tạo.
 * Nếu AI service không có điểm PUBLISHED cho tỉnh này, vẫn tạo sẵn các ngày theo startDate..endDate.
 */
export async function autoGenerateTripItinerary(params: {
  tripId: string;
  destinationSummary?: string | null;
  startDate: string;
  endDate: string;
  budgetTotal?: number;
}): Promise<AutoItineraryResult> {
  const rawDestination = (params.destinationSummary || '').trim();
  if (!rawDestination) {
    return { generatedDays: 0, generatedStops: 0 };
  }

  const startNoon = parseLocalNoonDate(params.startDate);
  const endNoon = parseLocalNoonDate(params.endDate);
  let daysCount = 3;
  if (startNoon && endNoon && endNoon.getTime() >= startNoon.getTime()) {
    daysCount = Math.round((endNoon.getTime() - startNoon.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }
  daysCount = Math.max(1, Math.min(7, daysCount));

  const request = {
    destinationProvince: normalizeProvinceForAi(rawDestination),
    totalDays: daysCount,
    budgetLevel: resolveBudgetLevel(params.budgetTotal),
    interests: ['Khám phá', 'Ẩm thực'],
  };

  let aiPlan;
  try {
    aiPlan = await expenseApi.fetchAiItinerarySuggestions(params.tripId, request);
  } catch {
    try {
      aiPlan = await expenseApi.fetchAiQuickPlan(request);
    } catch {
      aiPlan = null;
    }
  }

  const baseDate = startNoon || new Date();
  let generatedDays = 0;
  let generatedStops = 0;

  if (aiPlan?.days && aiPlan.days.length > 0) {
    for (let i = 0; i < aiPlan.days.length; i++) {
      const dayPlan = aiPlan.days[i];
      const dayDateObj = new Date(
        baseDate.getFullYear(),
        baseDate.getMonth(),
        baseDate.getDate() + i,
        12,
        0,
        0
      );
      const dayDate = formatYmd(dayDateObj);

      try {
        const createdDay = await tripApi.createItineraryDay(
          params.tripId,
          dayPlan.dayNumber || i + 1,
          dayDate
        );
        if (!createdDay?.id) continue;
        generatedDays++;

        const activities = dayPlan.activities || [];
        for (let j = 0; j < activities.length; j++) {
          const act = activities[j];
          const times = mapSlotTime(act.timeSlot, j);
          try {
            await tripApi.createItineraryItem(createdDay.id, {
              destinationId: act.destinationId || undefined,
              customStopName: act.destinationName,
              startTime: times.startTime,
              endTime: times.endTime,
              sortOrder: j,
              costVnd: act.estimatedCost ? Math.round(act.estimatedCost) : undefined,
              note: act.note || act.category || undefined,
            });
            generatedStops++;
          } catch {
            // Skip failed item without aborting remaining stops
          }
        }
      } catch {
        // Skip failed day without aborting trip creation
      }
    }
    return { generatedDays, generatedStops };
  }

  // Fallback: create empty itinerary day tabs for the trip date range
  for (let i = 0; i < daysCount; i++) {
    const dayDateObj = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth(),
      baseDate.getDate() + i,
      12,
      0,
      0
    );
    try {
      const createdDay = await tripApi.createItineraryDay(
        params.tripId,
        i + 1,
        formatYmd(dayDateObj)
      );
      if (createdDay?.id) generatedDays++;
    } catch {
      // Non-fatal
    }
  }

  return { generatedDays, generatedStops };
}
