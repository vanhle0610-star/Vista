import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BACKEND_URL = (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1').replace(/\/+$/, '');

export interface StoredInvitation {
  id: string;
  tripId: string;
  tripTitle?: string;
  destination?: string;
  startDate?: string;
  endDate?: string;
  inviterEmail?: string;
  inviterName?: string;
  inviteeEmail: string;
  email?: string;
  token: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  expiresAt?: string;
  createdAt: string;
  acceptedAt?: string;
  acceptedBy?: any;
  action?: string;
  emailSent?: boolean;
  emailSentAt?: string;
  emailMode?: string;
  emailMessageId?: string;
}

const STORE_PATH = path.join(process.cwd(), '.invitations_store.json');

let memoryStore: StoredInvitation[] = [
  {
    id: 'inv-seed-1',
    tripId: 'demo-danang-2026',
    tripTitle: 'Khám phá Đà Nẵng - Hội An 4N3Đ',
    destination: 'Đà Nẵng & Hội An',
    startDate: '15/11/2026',
    endDate: '18/11/2026',
    inviterEmail: 'nguyendaovanquy05@gmail.com',
    inviterName: 'Quý Nguyễn Đào Văn',
    inviteeEmail: 'quy192005@gmail.com',
    email: 'quy192005@gmail.com',
    token: 'VISTA-W4HFPT',
    status: 'PENDING',
    expiresAt: 'Trong 7 ngày tới',
    createdAt: new Date().toISOString(),
  },
];

function readStore(): StoredInvitation[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        memoryStore = parsed;
        return memoryStore;
      }
    }
  } catch (err) {
    console.error('Error reading invitations store:', err);
  }
  return memoryStore;
}

function writeStore(items: StoredInvitation[]) {
  memoryStore = items;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing invitations store:', err);
  }
}

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const tripId = searchParams.get('tripId');
  const email = searchParams.get('email');

  // Try Backend first if applicable
  if (token) {
    try {
      const res = await fetch(`${BACKEND_URL}/invitations/${token}/preview`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback to local store
    }

    const list = readStore();
    const clean = token.trim().toUpperCase();
    const cleanNo0 = clean.replace(/0/g, 'O');
    const cleanNoO = clean.replace(/O/g, '0');
    const found = list.find((it) => {
      const itToken = (it.token || '').trim().toUpperCase();
      const itNo0 = itToken.replace(/0/g, 'O');
      const itNoO = itToken.replace(/O/g, '0');
      return (
        itToken === clean ||
        itToken === cleanNo0 ||
        itToken === cleanNoO ||
        itNo0 === cleanNo0 ||
        itNoO === cleanNoO
      );
    });
    if (!found) {
      return NextResponse.json({ message: 'Không tìm thấy lời mời' }, { status: 404 });
    }
    return NextResponse.json(found);
  }

  if (tripId) {
    try {
      const res = await fetch(`${BACKEND_URL}/trips/${tripId}/invitations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback
    }

    const list = readStore();
    const filtered = list.filter((it) => it.tripId === tripId);
    return NextResponse.json(filtered);
  }

  // Pending invitations for current user
  if (authHeader) {
    try {
      const res = await fetch(`${BACKEND_URL}/invitations/my-pending`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: authHeader,
        },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json(data);
      }
    } catch {
      // Fallback
    }
  }

  const list = readStore();
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    const filtered = list.filter(
      (it) =>
        (it.inviteeEmail || '').toLowerCase() === cleanEmail ||
        (it.email || '').toLowerCase() === cleanEmail
    );
    return NextResponse.json(filtered);
  }

  return NextResponse.json(list);
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  try {
    const body = await request.json();
    const token = body.token ? String(body.token).trim() : '';
    const id = body.id;
    const status = body.status;

    // Backend forward logic
    let backendSuccess = false;
    let backendResult = null;

    if (id && status === 'ACCEPTED') {
      try {
        const res = await fetch(`${BACKEND_URL}/invitations/${id}/accept-by-id`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          backendSuccess = true;
          backendResult = await res.json().catch(() => ({}));
        }
      } catch {
        // Fall through
      }
    } else if (token && status === 'ACCEPTED') {
      try {
        const res = await fetch(`${BACKEND_URL}/invitations/${token}/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          backendSuccess = true;
          backendResult = await res.json().catch(() => ({}));
        }
      } catch {
        // Fall through
      }
    } else if (token && (status === 'DECLINED' || status === 'REVOKED')) {
      try {
        const res = await fetch(`${BACKEND_URL}/invitations/${token}/decline`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authHeader ? { Authorization: authHeader } : {}),
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          backendSuccess = true;
          backendResult = await res.json().catch(() => ({}));
        }
      } catch {
        // Fall through
      }
    }

    // Always keep local store in sync
    const list = readStore();
    const cleanToken = token.toUpperCase();
    const existingIndex = list.findIndex((it) => it.token.toUpperCase() === cleanToken);
    const cleanEmail = (body.email || body.inviteeEmail || '').toLowerCase().trim();
    const isAccepted = body.action === 'ACCEPT' || status === 'ACCEPTED';
    const isRevoked = body.action === 'REVOKE' || status === 'REVOKED';

    let localResult = null;
    if (existingIndex >= 0) {
      const updated: StoredInvitation = {
        ...list[existingIndex],
        ...body,
        token: cleanToken || list[existingIndex].token,
        status: isAccepted ? 'ACCEPTED' : (isRevoked ? 'REVOKED' : (body.status || list[existingIndex].status)),
        acceptedAt: isAccepted ? new Date().toISOString() : list[existingIndex].acceptedAt,
        acceptedBy: isAccepted && body.user ? body.user : list[existingIndex].acceptedBy,
        email: cleanEmail || list[existingIndex].email || list[existingIndex].inviteeEmail,
        inviteeEmail: cleanEmail || list[existingIndex].inviteeEmail || list[existingIndex].email,
        emailSent: body.emailSent !== undefined ? Boolean(body.emailSent) : list[existingIndex].emailSent,
        emailSentAt: body.emailSentAt || list[existingIndex].emailSentAt,
        emailMode: body.emailMode || list[existingIndex].emailMode,
        emailMessageId: body.emailMessageId || list[existingIndex].emailMessageId,
      };
      list[existingIndex] = updated;
      writeStore(list);
      localResult = updated;

      if (isAccepted && updated.tripId) {
        try {
          const tripsStorePath = path.join(process.cwd(), '.trips_store.json');
          if (fs.existsSync(tripsStorePath)) {
            const tripsData = fs.readFileSync(tripsStorePath, 'utf-8');
            const tripsList = JSON.parse(tripsData);
            const targetTrip = tripsList.find((t: any) => t.id === updated.tripId);
            if (targetTrip) {
              if (!Array.isArray(targetTrip.members)) targetTrip.members = [];
              const u = body.user || {};
              const rawName = u.name || u.displayName || (cleanEmail ? (cleanEmail.startsWith('quy192005') ? 'deki' : cleanEmail.split('@')[0]) : 'Thành viên mới');
              const memberName = rawName.replace(/\s*\([^)]*\)/g, '').trim();
              const memberUserId = u.userId || u.id || `u-${cleanToken}`;
              const memberAvatar = u.avatar || (memberName.length >= 2 ? memberName.slice(0, 2) : 'TV').toUpperCase();

              const alreadyIn = targetTrip.members.some((m: any) => {
                const mEmail = (m.email || '').toLowerCase().trim();
                const mUserId = (m.userId || m.id || '').trim();
                const mName = (m.name || '').toLowerCase().trim();
                if (memberUserId && mUserId && memberUserId === mUserId) return true;
                if (cleanEmail && mEmail && cleanEmail === mEmail) return true;
                if (memberName && mName && memberName.toLowerCase() === mName) return true;
                return false;
              });

              if (!alreadyIn) {
                targetTrip.members.push({
                  name: memberName,
                  avatar: memberAvatar,
                  color: '#10b981',
                  email: cleanEmail || undefined,
                  userId: memberUserId,
                  role: 'Thành viên',
                });
                fs.writeFileSync(tripsStorePath, JSON.stringify(tripsList, null, 2), 'utf-8');
              }
            }
          }
        } catch (e) {
          console.error('Error syncing member to trips_store from invitations route:', e);
        }
      }
    } else if (cleanToken || cleanEmail) {
      const newItem: StoredInvitation = {
        id: body.id || `inv-${Date.now()}`,
        tripId: body.tripId || 'demo-danang-2026',
        tripTitle: body.tripTitle || 'Khám phá Đà Nẵng - Hội An',
        destination: body.destination || 'Đà Nẵng',
        startDate: body.startDate || 'Sắp tới',
        endDate: body.endDate || '2026',
        inviterEmail: body.inviterEmail || '',
        inviterName: body.inviterName || 'Trưởng nhóm',
        inviteeEmail: cleanEmail,
        email: cleanEmail,
        token: cleanToken,
        status: isAccepted ? 'ACCEPTED' : (isRevoked ? 'REVOKED' : (body.status || 'PENDING')),
        acceptedAt: isAccepted ? new Date().toISOString() : undefined,
        acceptedBy: isAccepted && body.user ? body.user : undefined,
        expiresAt: body.expiresAt || 'Trong 7 ngày tới',
        createdAt: new Date().toISOString(),
        emailSent: Boolean(body.emailSent),
        emailSentAt: body.emailSentAt || (body.emailSent ? new Date().toISOString() : undefined),
        emailMode: body.emailMode || (body.emailSent ? 'DIRECT_DISPATCH' : undefined),
        emailMessageId: body.emailMessageId,
      };
      list.unshift(newItem);
      writeStore(list);
      localResult = newItem;
    }

    if (backendSuccess && backendResult) {
      return NextResponse.json(backendResult);
    }
    if (localResult) {
      return NextResponse.json(localResult, { status: existingIndex >= 0 ? 200 : 201 });
    }
    return NextResponse.json({ message: 'Thành công' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Lỗi xử lý lời mời' }, { status: 500 });
  }
}
