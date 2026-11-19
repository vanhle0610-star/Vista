import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || process.env.PYTHON_LLM_SERVICE_URL || 'http://127.0.0.1:8000';
  const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || '';

  const { searchParams } = new URL(request.url);
  const province = searchParams.get('province') || 'all';

  try {
    const query = province.toLowerCase() === 'all' ? 'all=1' : `province=${encodeURIComponent(province)}`;
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/destinations?${query}`, {
      headers: {
        'Accept': 'application/json',
        'X-Internal-Token': INTERNAL_TOKEN,
      },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({ destinations: [], count: 0, error: `Upstream ${res.status}` }, { status: 200 });
    }

    const data = await res.json();
    return NextResponse.json({
      count: data.count || (data.destinations?.length ?? 0),
      destinations: data.destinations || [],
    });
  } catch (err: any) {
    return NextResponse.json({ destinations: [], count: 0, error: err?.message || 'Unavailable' }, { status: 200 });
  }
}

