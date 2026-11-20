import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace(/\/+$/, '');

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const tripId = searchParams.get('tripId');

  let targetUrl = `${BACKEND_URL}/invitations/my-pending`;
  if (token) {
    targetUrl = `${BACKEND_URL}/invitations/${token}/preview`;
  } else if (tripId) {
    targetUrl = `${BACKEND_URL}/trips/${tripId}/invitations`;
  }

  try {
    const res = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      cache: 'no-store',
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ message: 'Không thể kết nối Backend', error: error.message }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  try {
    const body = await request.json();
    const token = body.token;
    const id = body.id;
    const status = body.status;

    let targetUrl = `${BACKEND_URL}/invitations`;
    if (id && status === 'ACCEPTED') {
      targetUrl = `${BACKEND_URL}/invitations/${id}/accept-by-id`;
    } else if (token && status === 'ACCEPTED') {
      targetUrl = `${BACKEND_URL}/invitations/${token}/accept`;
    } else if (token && (status === 'DECLINED' || status === 'REVOKED')) {
      targetUrl = `${BACKEND_URL}/invitations/${token}/decline`;
    }

    const res = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ message: 'Không thể kết nối Backend', error: error.message }, { status: 502 });
  }
}
