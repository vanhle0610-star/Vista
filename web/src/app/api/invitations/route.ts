import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
}

const STORE_PATH = path.join(process.cwd(), '.invitations_store.json');

// In-memory fallback in case of read error
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get('token');
  const email = searchParams.get('email');
  const tripId = searchParams.get('tripId');

  const list = readStore();

  // Find by token (case-insensitive and tolerant of 0 vs O ambiguity)
  if (token) {
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
      return NextResponse.json({ message: 'Không tìm thấy lời mời', token }, { status: 404 });
    }
    return NextResponse.json(found);
  }

  // Filter by invitee or inviter email
  if (email) {
    const cleanEmail = email.trim().toLowerCase();
    const filtered = list.filter(
      (it) =>
        it.inviteeEmail.toLowerCase() === cleanEmail ||
        (it.inviterEmail && it.inviterEmail.toLowerCase() === cleanEmail)
    );
    return NextResponse.json(filtered);
  }

  // Filter by tripId
  if (tripId) {
    const filtered = list.filter((it) => it.tripId === tripId);
    return NextResponse.json(filtered);
  }

  // Return all
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const list = readStore();

    if (!body.token) {
      return NextResponse.json({ message: 'Token là bắt buộc' }, { status: 400 });
    }

    const cleanToken = body.token.trim().toUpperCase();
    const existingIndex = list.findIndex((it) => it.token.toUpperCase() === cleanToken);

    const cleanEmail = (body.email || body.inviteeEmail || '').toLowerCase().trim();
    const isAccepted = body.action === 'ACCEPT' || body.status === 'ACCEPTED';
    const isRevoked = body.action === 'REVOKE' || body.status === 'REVOKED';

    if (existingIndex >= 0) {
      // Update existing
      const updated = {
        ...list[existingIndex],
        ...body,
        token: cleanToken,
        status: isAccepted ? 'ACCEPTED' : (isRevoked ? 'REVOKED' : (body.status || list[existingIndex].status)),
        acceptedAt: isAccepted ? new Date().toISOString() : list[existingIndex].acceptedAt,
        acceptedBy: isAccepted && body.user ? body.user : list[existingIndex].acceptedBy,
        email: cleanEmail || list[existingIndex].email || list[existingIndex].inviteeEmail,
        inviteeEmail: cleanEmail || list[existingIndex].inviteeEmail || list[existingIndex].email,
      };
      list[existingIndex] = updated;
      writeStore(list);

      // Immediately sync new member into trips store if accepted
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

      return NextResponse.json(updated);
    } else {
      // Create new
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
      };
      list.unshift(newItem);
      writeStore(list);
      return NextResponse.json(newItem, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Lỗi xử lý lời mời' }, { status: 500 });
  }
}

