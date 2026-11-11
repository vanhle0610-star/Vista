import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), '.trips_store.json');

let memoryTrips: any[] = [];

function normalizeString(str?: string) {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]/g, '');
}

export function deduplicateTripMembers(members: any[], ownerId?: string): any[] {
  if (!Array.isArray(members) || members.length === 0) return [];
  const result: any[] = [];

  for (const m of members) {
    if (!m) continue;
    const rawName = (m.name || m.displayName || '').replace(/\s*\([^)]*\)/g, '').trim();
    if (!rawName) continue;
    const normName = normalizeString(rawName);
    const email = (m.email || '').trim().toLowerCase();
    const userId = (m.userId || m.id || '').trim();

    // Check if member already exists in result
    const existingIdx = result.findIndex((existing) => {
      const existingName = normalizeString(existing.name);
      const existingEmail = (existing.email || '').toLowerCase().trim();
      const existingUserId = (existing.userId || '').trim();

      if (userId && existingUserId && userId === existingUserId) return true;
      if (email && existingEmail && email === existingEmail) return true;
      if (normName && existingName && normName === existingName) return true;
      return false;
    });

    if (existingIdx >= 0) {
      const existing = result[existingIdx];
      const isRealEmail = email && !email.includes('@vista.vn');
      const isExistingRealEmail = existing.email && !existing.email.includes('@vista.vn');

      const isRealUserId = userId && !userId.startsWith('u-');
      const isExistingRealUserId = existing.userId && !existing.userId.startsWith('u-');

      result[existingIdx] = {
        ...existing,
        name: rawName,
        email: isRealEmail ? email : (isExistingRealEmail ? existing.email : (email || existing.email)),
        userId: isRealUserId ? userId : (isExistingRealUserId ? existing.userId : (userId || existing.userId)),
        role: m.role || existing.role || 'Thành viên',
        avatar: existing.avatar || m.avatar || rawName.slice(0, 2).toUpperCase(),
        color: existing.color || m.color || '#0284c7',
      };
    } else {
      result.push({
        ...m,
        name: rawName,
        email: email || undefined,
        userId: userId || undefined,
        role: m.role || (result.length === 0 ? 'Trưởng nhóm' : 'Thành viên'),
        avatar: m.avatar || rawName.slice(0, 2).toUpperCase(),
        color: m.color || (result.length % 2 === 0 ? '#0284c7' : '#10b981'),
      });
    }
  }

  // Ensure exactly one leader (Trưởng nhóm)
  let foundLeader = false;
  const processed = result.map((m) => {
    const isOwner = Boolean(ownerId && ((m.userId && m.userId === ownerId) || (m.email && m.email === ownerId)));
    if (isOwner) {
      foundLeader = true;
      return { ...m, role: 'Trưởng nhóm' };
    }
    if (m.role === 'Trưởng nhóm') {
      if (!foundLeader) {
        foundLeader = true;
        return m;
      }
      return { ...m, role: 'Thành viên' };
    }
    return m;
  });

  if (!foundLeader && processed.length > 0) {
    processed[0].role = 'Trưởng nhóm';
  }

  // Sort Trưởng nhóm first
  processed.sort((a, b) => (a.role === 'Trưởng nhóm' ? -1 : b.role === 'Trưởng nhóm' ? 1 : 0));
  return processed;
}

function cleanTripItem(trip: any) {
  if (!trip) return trip;
  if (Array.isArray(trip.members)) {
    trip.members = deduplicateTripMembers(trip.members, trip.ownerId);
  }
  return trip;
}

function readStore(): any[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        memoryTrips = parsed.map(cleanTripItem);
        return memoryTrips;
      }
    }
  } catch (err) {
    console.error('Error reading trips store:', err);
  }
  return memoryTrips.map(cleanTripItem);
}

function writeStore(items: any[]) {
  const cleaned = items.map(cleanTripItem);
  memoryTrips = cleaned;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(cleaned, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing trips store:', err);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  const list = readStore();

  if (id) {
    const found = list.find((t) => t.id === id);
    if (!found) {
      return NextResponse.json({ message: 'Không tìm thấy chuyến đi', id }, { status: 404 });
    }
    return NextResponse.json(cleanTripItem(found));
  }

  return NextResponse.json(list.map(cleanTripItem));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const list = readStore();

    if (!body || !body.id) {
      return NextResponse.json({ message: 'ID chuyến đi là bắt buộc' }, { status: 400 });
    }

    const idx = list.findIndex((t) => t.id === body.id);
    const isCustomTrip = body.id.startsWith('trip-') && !body.id.includes('danang') && !body.id.includes('hagiang');

    if (idx >= 0) {
      let combinedMembers: any[];
      if (body.replaceMembers || body.action === 'LEAVE' || body.action === 'TRANSFER_OWNERSHIP') {
        combinedMembers = body.members || [];
      } else {
        combinedMembers = [...(list[idx].members || []), ...(body.members || [])];
      }
      if (isCustomTrip) {
        combinedMembers = combinedMembers.filter(
          (m: any) => !m.name?.includes('Trần Minh Tuấn') && !m.name?.includes('Lê Vân Anh')
        );
      }
      const newOwnerId = body.ownerId || list[idx].ownerId;
      const mergedMembers = deduplicateTripMembers(combinedMembers, newOwnerId);

      const updated = {
        ...list[idx],
        ...body,
        ownerId: newOwnerId,
        members: mergedMembers,
      };
      list[idx] = updated;
      writeStore(list);
      return NextResponse.json(updated);
    } else {
      let filteredMembers = body.members || [];
      if (isCustomTrip && Array.isArray(filteredMembers)) {
        filteredMembers = filteredMembers.filter(
          (m: any) => !m.name?.includes('Trần Minh Tuấn') && !m.name?.includes('Lê Vân Anh')
        );
      }
      const newOwnerId = body.ownerId;
      const newItem = {
        ...body,
        ownerId: newOwnerId,
        members: deduplicateTripMembers(filteredMembers, newOwnerId),
      };
      list.unshift(newItem);
      writeStore(list);
      return NextResponse.json(newItem, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Lỗi lưu chuyến đi' }, { status: 500 });
  }
}

