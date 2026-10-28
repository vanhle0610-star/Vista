import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), '.trips_store.json');

let memoryTrips: any[] = [];

function readStore(): any[] {
  try {
    if (fs.existsSync(STORE_PATH)) {
      const data = fs.readFileSync(STORE_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        memoryTrips = parsed;
        return memoryTrips;
      }
    }
  } catch (err) {
    console.error('Error reading trips store:', err);
  }
  return memoryTrips;
}

function writeStore(items: any[]) {
  memoryTrips = items;
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(items, null, 2), 'utf-8');
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
    return NextResponse.json(found);
  }

  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const list = readStore();

    if (!body || !body.id) {
      return NextResponse.json({ message: 'ID chuyến đi là bắt buộc' }, { status: 400 });
    }

    const idx = list.findIndex((t) => t.id === body.id);
    if (idx >= 0) {
      // Merge members if both have members
      let mergedMembers = body.members || list[idx].members || [];
      if (Array.isArray(list[idx].members) && Array.isArray(body.members)) {
        const seen = new Set();
        mergedMembers = [];
        for (const m of [...list[idx].members, ...body.members]) {
          const cleanName = (m.name || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();
          const cleanEmail = (m.email || '').toLowerCase().trim();
          const key = cleanEmail || cleanName;
          if (key && !seen.has(key)) {
            seen.add(key);
            mergedMembers.push(m);
          }
        }
      }

      const updated = {
        ...list[idx],
        ...body,
        members: mergedMembers,
      };
      list[idx] = updated;
      writeStore(list);
      return NextResponse.json(updated);
    } else {
      list.unshift(body);
      writeStore(list);
      return NextResponse.json(body, { status: 201 });
    }
  } catch (err: any) {
    return NextResponse.json({ message: err.message || 'Lỗi lưu chuyến đi' }, { status: 500 });
  }
}
