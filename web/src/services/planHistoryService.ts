export interface PlanActivity {
  id: string;
  timeSlot: string;
  timeRange: string;
  category: string;
  title: string;
  description: string;
  location: string;
  costVnd: number;
  costLabel?: string;
  tip?: string;
  photoUrl: string;
  transferTimeAfter?: string;
  latitude?: number;
  longitude?: number;
  rationale?: string;
  timeSlotReason?: string;
  whyVisitReason?: string;
  costStatus?: 'FREE' | 'PAID' | 'ESTIMATED' | 'UNVERIFIED';
  warning?: string;
  dataConfidence?: 'VERIFIED' | 'UNVERIFIED_HOURS';
  travelDurationFromPreviousMinutes?: number;
  bufferMinutes?: number;
}

export interface PlanDay {
  dayNumber: number;
  dateStr: string;
  title: string;
  dayRationale?: string;
  activities: PlanActivity[];
}

export interface PlanHistoryRecord {
  id: string;
  destination: string;
  title: string;
  totalDays: number;
  durationLabel: string;
  startDate: string;
  peopleCount: number;
  budgetTier: string;
  totalEstimatedCost: number;
  createdAt: string; // ISO
  itineraryDays: PlanDay[];
  aiMetadata?: {
    provider: string;
    fallbackUsed?: boolean;
  };
  warnings?: string[];
  selectedStyles?: string[];
  wishesText?: string;
  photoUrl?: string;
}

const STORAGE_KEY = 'vista_planner_history';
const MAX_HISTORY_ITEMS = 30;

export function getPlanHistory(): PlanHistoryRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (e) {
    console.warn('[PlanHistoryService] Failed to read history:', e);
    return [];
  }
}

export function savePlanToHistory(
  item: Omit<PlanHistoryRecord, 'id' | 'createdAt'>
): PlanHistoryRecord {
  const current = getPlanHistory();
  const newRecord: PlanHistoryRecord = {
    ...item,
    id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  // Prepend new item and prune to MAX_HISTORY_ITEMS
  const updated = [newRecord, ...current.filter((r) => r.id !== newRecord.id)].slice(
    0,
    MAX_HISTORY_ITEMS
  );

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[PlanHistoryService] Failed to persist history:', e);
    }
  }

  return newRecord;
}

export function deletePlanFromHistory(id: string): PlanHistoryRecord[] {
  const current = getPlanHistory();
  const updated = current.filter((item) => item.id !== id);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
      console.warn('[PlanHistoryService] Failed to delete history item:', e);
    }
  }
  return updated;
}

export function clearAllPlanHistory(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.warn('[PlanHistoryService] Failed to clear history:', e);
    }
  }
}

export function formatTimeAgo(isoString: string): string {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'Vừa xong';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) {
      return `Hôm qua lúc ${date.getHours().toString().padStart(2, '0')}:${date
        .getMinutes()
        .toString()
        .padStart(2, '0')}`;
    }
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1)
      .toString()
      .padStart(2, '0')}/${date.getFullYear()}`;
  } catch {
    return 'Gần đây';
  }
}

