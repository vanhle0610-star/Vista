import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { plan, instruction, constraints } = body;

    if (!plan || !instruction) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'Missing plan or instruction' },
        { status: 400 }
      );
    }

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || process.env.PYTHON_LLM_SERVICE_URL || 'http://127.0.0.1:8000';
    const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || '';

    const adminInspect =
      request.headers.get('X-Admin-Inspect') === 'true' || Boolean(body.includeInternalDiagnostics);

    // Convert Next.js front-end plan format to Python plan format if needed
    const pythonPlan = {
      destination_province: plan.destinationProvince || plan.destination_province || '',
      total_days: plan.totalDays || plan.total_days || (plan.days ? plan.days.length : 3),
      people_count: plan.peopleCount || plan.people_count || 2,
      pace: plan.pace || 'MODERATE',
      budget_tier: (plan.budgetLevel || plan.budget_tier || 'standard').toLowerCase() === 'budget' ? 'economy' :
                   (plan.budgetLevel || plan.budget_tier || 'standard').toLowerCase() === 'luxury' ? 'luxury' : 'standard',
      estimated_total_cost_vnd: plan.estimatedTotalCost || plan.estimated_total_cost_vnd || 0,
      min_fluctuation_vnd: plan.minFluctuationVnd || plan.min_fluctuation_vnd || 0,
      max_fluctuation_vnd: plan.maxFluctuationVnd || plan.max_fluctuation_vnd || 0,
      internal_diagnostics: plan.internalDiagnostics || plan.internal_diagnostics || undefined,
      warnings: plan.warnings || [],
      days: (plan.days || []).map((d: any) => ({
        day_number: d.dayNumber ?? d.day_number ?? 1,
        date_label: d.dateLabel || d.date_label || `Ngày ${d.dayNumber || 1}`,
        title: d.title || `Ngày ${d.dayNumber || 1}`,
        day_rationale: d.dayRationale || d.day_rationale || '',
        day_status: d.dayStatus || d.day_status || 'ACTIVE',
        subtotal_cost_vnd: d.subtotalCostVnd ?? d.subtotal_cost_vnd ?? 0,
        activities: (d.activities || []).map((a: any) => {
          const rangeParts = typeof a.timeRange === 'string' ? a.timeRange.split(/[–-]/) : [];
          return {
            destination_id: a.destinationId || a.id || a.destination_id || '',
            destination_name: a.destinationName || a.title || a.destination_name || '',
            time_slot: a.timeSlot || a.time_slot || 'MORNING',
            item_type: a.itemType || a.item_type || 'SIGHTSEEING',
            start_time: a.startTime || a.start_time || rangeParts[0] || '08:30',
            end_time: a.endTime || a.end_time || rangeParts[1] || '10:30',
            duration_min: a.durationMin ?? a.duration_min ?? 60,
            category: a.category || 'Tham quan',
            cost_vnd: a.estimatedCost ?? a.costVnd ?? a.cost_vnd ?? 0,
            cost_label: a.costLabel || a.cost_label || '0 VND',
            travel_time_from_prev_min: a.travelDurationFromPreviousMinutes ?? a.travel_time_from_prev_min ?? 0,
            travel_distance_km: a.travelDistanceKm ?? a.travel_distance_km ?? 0,
            transport_mode: a.transportMode ?? a.transport_mode ?? 'car',
            buffer_min: a.bufferMinutes ?? a.buffer_min ?? 15,
            opening_hours_status: a.openingHoursStatus || a.opening_hours_status || 'OPEN_VERIFIED',
            is_locked: Boolean(a.isLocked ?? a.is_locked),
            is_must_visit: Boolean(a.isMustVisit ?? a.is_must_visit),
            tip: a.tip || '',
            note: a.note || a.description || '',
            latitude: typeof a.latitude === 'number' ? a.latitude : undefined,
            longitude: typeof a.longitude === 'number' ? a.longitude : undefined,
            photo_url: a.photoUrl || a.photo_url || '',
            rain_backup_suggestion: a.rainBackupSuggestion || a.rain_backup_suggestion || null,
            data_confidence: a.dataConfidence || a.data_confidence || 'VERIFIED',
            reasons: a.reasons || [],
          };
        }),
      })),
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Internal-Token': INTERNAL_TOKEN,
    };
    if (adminInspect) {
      headers['X-Admin-Inspect'] = 'true';
    }

    const res = await fetch(`${AI_SERVICE_URL}/api/v1/replan`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        plan: pythonPlan,
        instruction,
        constraints,
        shift_lunch_minutes: body.shiftLunchMinutes ?? body.shift_lunch_minutes,
        pace: body.pace,
        include_internal_diagnostics: adminInspect,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: 'REPLAN_FAILED', message: `Python engine error: ${errText}` },
        { status: res.status }
      );
    }

    const pyData = await res.json();

    // Map back to web frontend format
    const formattedResult: Record<string, any> = {
      provider: 'python-v2-replan',
      fallbackUsed: false,
      isMockData: false,
      destinationProvince: pyData.destination_province || plan.destinationProvince,
      totalDays: pyData.total_days || plan.totalDays,
      pace: pyData.pace || plan.pace || 'MODERATE',
      scheduleStatus: pyData.schedule_status || 'FEASIBLE',
      budgetLevel: plan.budgetLevel || 'MEDIUM',
      estimatedTotalCost: pyData.estimated_total_cost_vnd,
      minFluctuationVnd: pyData.min_fluctuation_vnd,
      maxFluctuationVnd: pyData.max_fluctuation_vnd,
      breakdown: pyData.breakdown || null,
      conflicts: pyData.conflicts || [],
      replanDiff: pyData.replan_diff || null,
      warnings: pyData.warnings || [],
      days: (pyData.days || []).map((d: any) => ({
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
          transportMode: a.transport_mode || 'car',
          bufferMinutes: a.buffer_min,
          openingHoursStatus: a.opening_hours_status || 'OPEN_VERIFIED',
          isLocked: Boolean(a.is_locked),
          isMustVisit: Boolean(a.is_must_visit),
          dataConfidence: a.data_confidence || 'VERIFIED',
          latitude: typeof a.latitude === 'number' ? a.latitude : undefined,
          longitude: typeof a.longitude === 'number' ? a.longitude : undefined,
          photoUrl: a.photo_url || a.image_url || '',
          rainBackupSuggestion: a.rain_backup_suggestion || null,
          rationale: a.reasons?.[0]?.description,
          timeSlotReason: a.reasons?.[0]?.description,
          whyVisitReason: a.reasons?.[1]?.description || a.note,
        })),
      })),
      citations: [],
      coPilotReply: pyData.co_pilot_reply || null,
      insiderTip: pyData.insider_tip || null,
      proactiveSuggestion: pyData.proactive_suggestion || null,
    };
    if (adminInspect && pyData.internal_diagnostics) {
      formattedResult.internalDiagnostics = pyData.internal_diagnostics;
    }

    return NextResponse.json(formattedResult);
  } catch (error: any) {
    console.error('[AI Replan] Route error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}

