import fs from 'fs';
import path from 'path';

const inputCsvPath = path.resolve('Vietnam_dia_diem_DA_CAP_NHAT_phan1 (6).csv');
const backendSeedPath = path.resolve('backend/src/main/resources/db/seed/demo_destinations_seed.csv');
const dbSeedPath = path.resolve('database/seed/destinations/demo_destinations_seed.csv');
const frontendTsPath = path.resolve('web/src/features/map-location/data/vietnam300Destinations.ts');

const COORD_MAPPING = {
  'Rừng ngập mặn Cần Giờ': { lat: 10.4114, lng: 106.9538 },
  'Đảo Bé Lý Sơn': { lat: 15.4055, lng: 109.0772 },
  'Thác Dray Sáp': { lat: 12.5397, lng: 107.8864 },
  'Hang động núi lửa Krông Nô': { lat: 12.5186, lng: 107.9333 },
  'Hồ Ea Snô': { lat: 12.5147, lng: 107.7889 },
  'Làng sơn mài Tương Bình Hiệp': { lat: 11.0069, lng: 106.6347 },
  'Khu bảo tồn thiên nhiên Lung Ngọc Hoàng': { lat: 9.7153, lng: 105.7175 },
  'Công viên giải trí Kittyd & Minnied': { lat: 9.9483, lng: 105.7958 },
  'Di tích Chiến thắng Chương Thiện': { lat: 9.7758, lng: 105.4678 },
  'Bún nước lèo Bà Xím': { lat: 9.6033, lng: 105.9744 },
  'Núi đôi Quản Bạ': { lat: 23.0642, lng: 104.9961 },
  'Đèo Thẩm Mã': { lat: 23.1833, lng: 105.2167 },
  'Chợ Thái Thái Nguyên': { lat: 21.5936, lng: 105.8453 },
  'Đảo cò Chi Lăng Nam': { lat: 20.7608, lng: 106.2758 },
  'Đền Cao An Phụ': { lat: 20.9856, lng: 106.4950 },
  'Làng gốm Chu Đậu': { lat: 20.9839, lng: 106.3575 },
  'Chợ Phú Yên Hải Dương': { lat: 20.9383, lng: 106.3308 },
  'Làng Nôm': { lat: 20.9250, lng: 106.0750 },
  'Chùa Nôm': { lat: 20.9261, lng: 106.0742 },
  'Làng nghề tương Bần': { lat: 20.9389, lng: 106.0611 },
  'Đền Phù Ủng': { lat: 20.8931, lng: 106.1839 },
  'Chợ Hiến': { lat: 20.6486, lng: 106.0528 },
  'Biển Đồng Châu': { lat: 20.3556, lng: 106.5667 },
  'Cồn Vành': { lat: 20.2833, lng: 106.5667 },
  'Cồn Đen': { lat: 20.5167, lng: 106.5667 },
  'Đền Trần Thái Bình': { lat: 20.6139, lng: 106.1950 },
  'Đền Trúc - Ngũ Động Thi Sơn': { lat: 20.5750, lng: 105.8667 },
  'Đền Trần Nam Định': { lat: 20.4489, lng: 106.1667 },
  'Chùa Phổ Minh': { lat: 20.4503, lng: 106.1692 },
  'Nhà thờ đổ Hải Lý': { lat: 20.1764, lng: 106.3056 },
  'Bãi biển Thịnh Long': { lat: 20.1069, lng: 106.2167 },
  'Chợ Rồng Nam Định': { lat: 20.4286, lng: 106.1736 },
};

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

function normalizeHours(raw) {
  if (!raw || raw.trim().length === 0) {
    return '{"mon":"07:30-17:30","tue":"07:30-17:30","wed":"07:30-17:30","thu":"07:30-17:30","fri":"07:30-17:30","sat":"07:30-17:30","sun":"07:30-17:30"}';
  }
  const clean = raw.trim();
  if (clean === '00:00-23:59' || clean === '24/24' || clean.toLowerCase().includes('cả ngày')) {
    const range = '00:00-23:59';
    return JSON.stringify({
      mon: range, tue: range, wed: range, thu: range, fri: range, sat: range, sun: range
    });
  }
  const m = clean.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
  if (m) {
    let start = m[1].padStart(5, '0');
    let end = m[2].padStart(5, '0');
    if (end === '00:00' || end === '24:00') {
      end = '23:59';
    }
    const range = `${start}-${end}`;
    return JSON.stringify({
      mon: range, tue: range, wed: range, thu: range, fri: range, sat: range, sun: range
    });
  }
  return JSON.stringify({
    mon: "07:30-17:30", tue: "07:30-17:30", wed: "07:30-17:30", thu: "07:30-17:30", fri: "07:30-17:30", sat: "07:30-17:30", sun: "07:30-17:30"
  });
}

const rawContent = fs.readFileSync(inputCsvPath, 'utf8');
const lines = rawContent.split(/\r?\n/).filter(l => l.trim().length > 0);

console.log(`Bắt đầu xử lý ${lines.length - 1} địa điểm từ ${inputCsvPath}...`);

const processedRows = [];
const frontendDestinations = [];

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  let [name, province, category, latStr, lngStr, pMinStr, pMaxStr, opening, sourceUrl, verifiedAt, desc, imgRef] = row;

  if (!name || name.trim().length === 0) continue;
  name = name.trim();

  let cleanProvince = (province || 'Việt Nam').trim();
  if (cleanProvince === 'Hồ Chí Minh' || cleanProvince === 'Thành phố Hồ Chí Minh') {
    cleanProvince = 'TP. Hồ Chí Minh';
  }
  if (cleanProvince === 'Huế') {
    cleanProvince = 'Thừa Thiên Huế';
  }

  let lat = parseFloat(latStr);
  let lng = parseFloat(lngStr);

  if ((isNaN(lat) || isNaN(lng)) && COORD_MAPPING[name]) {
    lat = COORD_MAPPING[name].lat;
    lng = COORD_MAPPING[name].lng;
  }

  if (isNaN(lat) || isNaN(lng)) {
    console.warn(`Vẫn thiếu tọa độ cho: ${name} (${cleanProvince})`);
    lat = 16.0;
    lng = 108.0;
  }

  const pMin = pMinStr && !isNaN(parseFloat(pMinStr)) ? Math.round(parseFloat(pMinStr)) : 0;
  const pMax = pMaxStr && !isNaN(parseFloat(pMaxStr)) ? Math.round(parseFloat(pMaxStr)) : pMin;

  const openingJson = normalizeHours(opening);
  const cleanCategory = (category || 'Tham quan').trim();
  const cleanDesc = (desc || '').trim();
  const cleanImg = (imgRef || '').trim() || 'https://images.unsplash.com/photo-1528127269322-539801943592?auto=format&fit=crop&w=800&q=80';
  const cleanSource = (sourceUrl || '').trim();
  const cleanVerified = (verifiedAt || '2026-10-15T00:00:00Z').trim();

  processedRows.push([
    name,
    cleanProvince,
    cleanCategory,
    lat.toFixed(6),
    lng.toFixed(6),
    pMin.toString(),
    pMax.toString(),
    openingJson,
    cleanSource,
    cleanVerified,
    cleanDesc,
    cleanImg,
  ]);

  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  frontendDestinations.push({
    id: `vn-${i}-${slug || 'diem-den'}`,
    name,
    province: cleanProvince,
    category: cleanCategory,
    latitude: lat,
    longitude: lng,
    description: cleanDesc,
    priceMin: pMin,
    priceMax: pMax,
    openingHours: opening ? opening.trim() : '07:00-18:00',
    sourceUrl: cleanSource || undefined,
    thumbnailUrl: cleanImg,
  });
}

console.log(`Đã chuẩn hóa thành công ${processedRows.length} địa điểm.`);

// 1. Tạo CSV chuẩn cho Backend
const csvHeader = [
  'name', 'province', 'category', 'latitude', 'longitude',
  'price_min', 'price_max', 'opening_hours', 'source_url',
  'verified_at', 'description', 'image_reference'
].map(escapeCsvField).join(',');

const csvLines = [csvHeader];
for (const row of processedRows) {
  csvLines.push(row.map(escapeCsvField).join(','));
}

const finalCsvContent = csvLines.join('\n');
fs.writeFileSync(backendSeedPath, finalCsvContent, 'utf8');
console.log(`Đã ghi file Backend Seed: ${backendSeedPath} (${processedRows.length} địa điểm)`);

fs.writeFileSync(dbSeedPath, finalCsvContent, 'utf8');
console.log(`Đã ghi file Database Seed: ${dbSeedPath}`);

// 2. Cập nhật file TypeScript cho Frontend Map
const tsHeader = `import type { DestinationMarker } from '../types';\n\n/**\n * Kho 600+ Địa điểm Du lịch Chuẩn hóa Toàn quốc (63 Tỉnh Thành Việt Nam)\n * Nguồn: CSDL Du lịch VISTA đã chuẩn hóa tọa độ GPS, danh mục và giờ mở cửa.\n */\nexport const VIETNAM_300_DESTINATIONS: DestinationMarker[] = `;
const tsContent = `${tsHeader}${JSON.stringify(frontendDestinations, null, 2)};\n\nexport default VIETNAM_300_DESTINATIONS;\n`;
fs.writeFileSync(frontendTsPath, tsContent, 'utf8');
console.log(`Đã cập nhật Frontend Map Data: ${frontendTsPath} (${frontendDestinations.length} địa điểm)`);

// 3. Cập nhật file web/src/data/realDestinationsData.ts cho AI Planner & Map Integration
const realPlacesPath = path.resolve('web/src/data/realDestinationsData.ts');
const realPlacesData = frontendDestinations.map(d => ({
  name: d.name,
  province: d.province,
  category: d.category,
  latitude: d.latitude,
  longitude: d.longitude,
  priceMin: d.priceMin,
  priceMax: d.priceMax,
  openingHours: d.openingHours,
  description: d.description,
  image: d.thumbnailUrl,
}));

const realPlacesTs = `// Standardized 600+ Real Destinations in Vietnam with GPS coordinates, pricing, descriptions
// Seeded from VISTA verified tourism database for AI Planner and Map Integration

export interface RealPlace {
  name: string;
  province: string;
  category: string;
  latitude: number;
  longitude: number;
  priceMin: number;
  priceMax: number;
  openingHours: string;
  description: string;
  image: string;
}

export const REAL_VIETNAM_PLACES: RealPlace[] = ${JSON.stringify(realPlacesData, null, 2)};

export function getRealPlacesByProvince(destQuery: string): RealPlace[] {
  if (!destQuery) return [];
  const q = destQuery.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').trim();

  let targetProvKey = q;
  if (q.includes('hue')) targetProvKey = 'thua thien hue';
  else if (q.includes('da nang')) targetProvKey = 'da nang';
  else if (q.includes('hoi an') || q.includes('quang nam')) targetProvKey = 'quang nam';
  else if (q.includes('ha noi')) targetProvKey = 'ha noi';
  else if (q.includes('sai gon') || q.includes('ho chi minh') || q.includes('tphcm')) targetProvKey = 'tp. ho chi minh';
  else if (q.includes('da lat') || q.includes('lam dong')) targetProvKey = 'lam dong';
  else if (q.includes('nha trang') || q.includes('khanh hoa')) targetProvKey = 'khanh hoa';
  else if (q.includes('ha long') || q.includes('quang ninh')) targetProvKey = 'quang ninh';
  else if (q.includes('sapa') || q.includes('sa pa') || q.includes('lao cai')) targetProvKey = 'lao cai';
  else if (q.includes('ninh binh')) targetProvKey = 'ninh binh';
  else if (q.includes('phu quoc')) targetProvKey = 'kien giang';

  const matches = REAL_VIETNAM_PLACES.filter((p) => {
    const provNorm = p.province.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    const nameNorm = p.name.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g, '');
    return provNorm.includes(targetProvKey) || targetProvKey.includes(provNorm) || nameNorm.includes(q);
  });

  return matches.length > 0 ? matches : REAL_VIETNAM_PLACES.filter(p => p.province === 'Đà Nẵng');
}
`;

fs.writeFileSync(realPlacesPath, realPlacesTs, 'utf8');
console.log(`Đã cập nhật Real Destinations Data: ${realPlacesPath} (${realPlacesData.length} địa điểm)`);
