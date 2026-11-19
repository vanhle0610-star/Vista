import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const prompt = (body.prompt || '').trim();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const AI_SERVICE_URL = process.env.AI_SERVICE_URL || process.env.PYTHON_LLM_SERVICE_URL || 'http://127.0.0.1:8000';
    const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || '';

    try {
      const res = await fetch(`${AI_SERVICE_URL}/api/v1/parse-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Internal-Token': INTERNAL_TOKEN,
        },
        body: JSON.stringify({ prompt }),
      });

      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch (err) {
      console.warn('[AI Parse Intent] Python service unreachable, using local fallback:', err);
    }

    // Local deterministic fallback
    return NextResponse.json({
      destination: prompt.toLowerCase().includes('huế') ? 'Thừa Thiên Huế' :
                   prompt.toLowerCase().includes('hà nội') ? 'Hà Nội' :
                   prompt.toLowerCase().includes('sài gòn') || prompt.toLowerCase().includes('hồ chí minh') ? 'TP. Hồ Chí Minh' :
                   prompt.toLowerCase().includes('phú quốc') ? 'Kiên Giang' : 'Đà Nẵng',
      total_days: 3,
      people_count: 2,
      budget_tier: 'standard',
      has_elderly: /người\s*lớn\s*tuổi|người\s*già|ông\s*bà|bố\s*mẹ|cao\s*tuổi/.test(prompt.toLowerCase()),
      has_children: /trẻ\s*em|bé\s*nhỏ|con\s*nhỏ/.test(prompt.toLowerCase()),
      pace: 'MODERATE',
      interests: ['biển & nghỉ dưỡng', 'ẩm thực bản địa'],
      arrival_time: '08:00',
      departure_time: '18:00',
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

