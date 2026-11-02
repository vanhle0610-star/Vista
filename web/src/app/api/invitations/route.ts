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

  // Find by token
  if (token) {
    const found = list.find((it) => it.token.toUpperCase() === token.trim().toUpperCase());
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
    if (existingIndex >= 0) {
      // Update existing
      const updated = {
        ...list[existingIndex],
        ...body,
        token: cleanToken,
        email: cleanEmail || list[existingIndex].email || list[existingIndex].inviteeEmail,
        inviteeEmail: cleanEmail || list[existingIndex].inviteeEmail || list[existingIndex].email,
      };
      list[existingIndex] = updated;
      writeStore(list);
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
        status: body.status || 'PENDING',
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

