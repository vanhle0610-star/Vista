import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace(/\/+$/, '');

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const targetUrl = id ? `${BACKEND_URL}/trips/${id}` : `${BACKEND_URL}/trips`;

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
    const res = await fetch(`${BACKEND_URL}/trips`, {
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

export async function DELETE(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ message: 'Missing trip ID' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/trips/${id}`, {
      method: 'DELETE',
      headers: {
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
    });

    if (res.status === 204) {
      return new NextResponse(null, { status: 204 });
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }
    const text = await res.text();
    return new NextResponse(text, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ message: 'Không thể kết nối Backend', error: error.message }, { status: 502 });
  }
}
