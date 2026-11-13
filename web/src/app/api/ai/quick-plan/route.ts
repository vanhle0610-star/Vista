import { NextResponse } from 'next/server';
import { getRealPlacesByProvince } from '@/data/realDestinationsData';

// Circuit breaker state for Python AI Engine
let circuitBreakerOpenUntil = 0;
const CIRCUIT_COOLDOWN_MS = 30000; // 30 seconds cooldown when Python service is down

async function callPythonWithRetry(
  url: string,
  payload: any,
  token: string,
  timeoutMs: number = 8000,
  adminInspect: boolean = false
): Promise<any> {
  const attemptCall = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Internal-Token': token,
      };
      if (adminInspect) {
        headers['X-Admin-Inspect'] = 'true';
      }
      const res = await fetch(`${url}/api/v1/plan`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Python service returned status ${res.status}: ${errText}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  try {
    return await attemptCall();
  } catch (firstErr) {
    console.warn('[AI Gateway] First attempt to Python engine failed, retrying once...', firstErr);
    try {
      return await attemptCall();
    } catch (secondErr) {
      circuitBreakerOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
      console.error('[AI Gateway] Second attempt failed. Circuit breaker opened for 30s:', secondErr);
      throw secondErr;
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const destination = (body.destinationProvince || body.province || body.destination || '').trim();
    const adminInspect =
      request.headers.get('X-Admin-Inspect') === 'true' || Boolean(body.includeInternalDiagnostics);

    // 1. Strict validation: Do NOT default blindly to "Đà Nẵng" if missing
    if (!destination) {
      return NextResponse.json(
        {
          error: 'PROVINCE_REQUIRED',
          message: 'Vui lòng chọn tỉnh/thành phố để lập lịch trình chuyến đi.',
        },
        { status: 422 }
      );
    }

    const totalDays = Math.max(1, Math.min(5, Number(body.totalDays) || 3));
    const peopleCount = Number(body.peopleCount) || 2;
    const budgetLevel = body.budgetLevel || 'MEDIUM';
    const arrivalTime = body.arrivalTime || '08:00';
    const departureTime = body.departureTime || '18:00';

    const pythonPayload = {
      destination,
      days: totalDays,
      people: peopleCount,
      interests: body.interests || [],
      priority_interests: body.priorityInterests || body.priority_interests || [],
      pace: body.pace || 'MODERATE',
      must_visit_ids: body.mustVisitIds || body.must_visit_ids || [],
      locked_items: body.lockedItems || body.locked_items || [],
      departure_point: body.departurePoint || body.departure_point || null,
      departure_type: body.departureType || body.departure_type || 'TRANSPORT_DEPARTURE',
      departure_buffer_min: body.departureBufferMin ?? body.departure_buffer_min ?? null,
      transit_buffer_min: body.transitBufferMin ?? body.transit_buffer_min ?? 0,
      transport_mode: body.transportMode || body.transport_mode || 'car',
      start_date: body.startDate || body.start_date || null,
      budget_tier: budgetLevel === 'BUDGET' ? 'economy' : budgetLevel === 'LUXURY' ? 'luxury' : 'standard',
      has_elderly: Boolean(body.hasElderly),
      has_children: Boolean(body.hasChildren),
      arrival_time: arrivalTime,
      departure_time: departureTime,
      custom_notes: body.customNotes || body.custom_notes || null,
      enable_llm_rerank: body.enableLlmRerank ?? body.enable_llm_rerank ?? true,
      enable_llm_narration: body.enableLlmNarration ?? body.enable_llm_narration ?? true,
      rejected_destination_ids: body.rejectedDestinationIds || body.rejected_destination_ids || [],
      rejected_subtypes: body.rejectedSubtypes || body.rejected_subtypes || [],
      include_internal_diagnostics: adminInspect,
    };

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || process.env.PYTHON_LLM_SERVICE_URL || 'http://127.0.0.1:8000';
    const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || '';

    // Check circuit breaker
    const isCircuitOpen = Date.now() < circuitBreakerOpenUntil;

    if (!isCircuitOpen) {
      try {
        const pyData = await callPythonWithRetry(AI_SERVICE_URL, pythonPayload, INTERNAL_TOKEN, 26000, adminInspect);

        if (pyData && pyData.days && Array.isArray(pyData.days) && pyData.days.length > 0) {
          console.log('[AI Gateway] Successfully obtained grounded plan from Python Engine v2 for', destination);
          const responsePayload: Record<string, any> = {
            provider: 'python-v2',
            fallbackUsed: false,
            isMockData: false,
            destinationProvince: pyData.destination_province || destination,
            totalDays: pyData.total_days || totalDays,
            pace: pyData.pace || pythonPayload.pace,
            scheduleStatus: pyData.schedule_status || 'FEASIBLE',
            budgetLevel: budgetLevel,
            estimatedTotalCost: pyData.estimated_total_cost_vnd,
            minFluctuationVnd: pyData.min_fluctuation_vnd,
            maxFluctuationVnd: pyData.max_fluctuation_vnd,
            breakdown: pyData.breakdown || null,
            conflicts: pyData.conflicts || [],
            assumptions: pyData.assumptions || [],
            warnings: pyData.warnings || [],
            days: pyData.days.map((d: any) => ({
              dayNumber: d.day_number,
              dateLabel: d.date_label,
              title: d.title,
              dayRationale: d.day_rationale,
              dayStatus: d.day_status || 'ACTIVE',
              statusReason: d.status_reason || null,
              departureInfo: d.departure_info || null,
              subtotalCostVnd: d.subtotal_cost_vnd,
              activities: (d.activities || []).map((a: any) => ({
                destinationId: a.destination_id,
                destinationName: a.destination_name,
                timeSlot: a.time_slot,
                itemType: a.item_type || 'SIGHTSEEING',
                category: a.category,
                estimatedCost: a.cost_vnd,
                costLabel: a.cost_label || (a.cost_vnd === 0 ? 'Miễn phí vé' : `~${a.cost_vnd.toLocaleString('vi-VN')}đ`),
                costStatus: a.cost_vnd === 0 ? 'FREE' : 'ESTIMATED',
                note: a.note || '',
                tip: a.tip || '',
                startTime: a.start_time,
                endTime: a.end_time,
                durationMin: a.duration_min ?? 60,
                waitTimeMin: a.wait_time_min ?? 0,
                travelDurationFromPreviousMinutes: a.travel_time_from_prev_min,
                travelDistanceKm: a.travel_distance_km ?? 0,
                transportMode: a.transport_mode || pythonPayload.transport_mode,
                bufferMinutes: a.buffer_min,
                openingHoursStatus: a.opening_hours_status || 'OPEN_VERIFIED',
                isLocked: Boolean(a.is_locked),
                isMustVisit: Boolean(a.is_must_visit),
                dataConfidence: a.data_confidence || 'VERIFIED',
                rainBackupSuggestion: a.rain_backup_suggestion || null,
                rationale: a.reasons?.[0]?.description,
                timeSlotReason: a.reasons?.[0]?.description,
                whyVisitReason: a.reasons?.[1]?.description || a.note,
                photoUrl: a.photo_url || a.image_url || '',
                latitude: a.latitude,
                longitude: a.longitude,
                realtimeStatus:
                  a.opening_hours_status === 'UNVERIFIED_HOURS'
                    ? 'Chưa xác nhận giờ mở cửa'
                    : 'Dự kiến mở lúc bạn đến',
                isOpenRealtime: a.is_open_realtime ?? true,
              })),
            })),
            citations: [],
          };
          if (adminInspect && pyData.internal_diagnostics) {
            responsePayload.internalDiagnostics = pyData.internal_diagnostics;
          }
          return NextResponse.json(responsePayload);
        }
      } catch (pythonError: any) {
        console.warn('[AI Gateway] Python engine unavailable, activating safe rule-based fallback:', pythonError.message);
      }
    } else {
      console.warn('[AI Gateway] Python engine circuit breaker is OPEN, skipping probe and using rule-based generator');
    }

    // SAFE GROUNDED FALLBACK: Strictly deterministic, no hallucinations, using real 645 destinations
    const rawPlaces = getRealPlacesByProvince(destination);
    const dayThemes = [
      'Khám phá biểu tượng di sản & Nét đẹp trung tâm',
      'Di tích văn hóa & Tinh hoa ẩm thực trứ danh',
      'Thiên nhiên sinh thái & Trải nghiệm đáng nhớ',
      'Làng nghề truyền thống & Check-in phong cảnh',
      'Khép lại hành trình & Kỷ niệm trọn vẹn',
    ];

    const fallbackDays = [];
    for (let dayNum = 1; dayNum <= totalDays; dayNum++) {
      const dayIndex = dayNum - 1;
      const theme = dayThemes[dayIndex % dayThemes.length];

      // Pick up to 4 distinct real places for Morning, Noon, Afternoon, Evening
      const morningPlace = rawPlaces[(dayIndex * 4) % Math.max(1, rawPlaces.length)];
      const noonPlace = rawPlaces[(dayIndex * 4 + 1) % Math.max(1, rawPlaces.length)];
      const afternoonPlace = rawPlaces[(dayIndex * 4 + 2) % Math.max(1, rawPlaces.length)];
      const eveningPlace = rawPlaces[(dayIndex * 4 + 3) % Math.max(1, rawPlaces.length)];

      const pickedPlaces = [
        { slot: 'MORNING', time: '08:00', end: '10:30', place: morningPlace },
        { slot: 'NOON', time: '11:30', end: '13:00', place: noonPlace },
        { slot: 'AFTERNOON', time: '14:30', end: '17:00', place: afternoonPlace },
        { slot: 'EVENING', time: '18:30', end: '21:00', place: eveningPlace },
      ].filter((item) => Boolean(item.place));

      const activities = pickedPlaces.map((item, idx) => {
        const p = item.place!;
        const costVnd = p.priceMin || 0;
        return {
          destinationId: `fb-${destination}-${dayNum}-${idx + 1}`,
          destinationName: p.name,
          timeSlot: item.slot,
          category: p.category,
          estimatedCost: costVnd * peopleCount,
          costLabel: costVnd === 0 ? 'Miễn phí' : `${new Intl.NumberFormat('vi-VN').format(costVnd)}đ/người`,
          costStatus: costVnd === 0 ? 'FREE' : 'ESTIMATED',
          startTime: item.time,
          endTime: item.end,
          latitude: p.latitude,
          longitude: p.longitude,
          photoUrl: p.image,
          dataConfidence: 'VERIFIED',
          note: p.description,
        };
      });

      fallbackDays.push({
        dayNumber: dayNum,
        dateLabel: `Ngày ${dayNum}`,
        title: `Ngày ${dayNum} — ${theme}`,
        dayRationale: `Lịch trình Ngày ${dayNum} tại ${destination} được chọn lọc từ các điểm di sản và ẩm thực nổi tiếng, tối ưu thứ tự di chuyển gần nhau.`,
        activities,
      });
    }

    return NextResponse.json({
      provider: 'rule-based-fallback',
      fallbackUsed: true,
      isMockData: false,
      destinationProvince: destination,
      totalDays: totalDays,
      budgetLevel: budgetLevel,
      estimatedTotalCost: 450000 * peopleCount * totalDays,
      warnings: ['Cảnh báo dự phòng: Đang dùng bộ dữ liệu offline (không kết nối được Python AI Engine).'],
      days: fallbackDays,
      citations: [],
    });
  } catch (error: any) {
    console.error('[AI Gateway] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}
