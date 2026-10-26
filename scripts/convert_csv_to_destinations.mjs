import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('Vietnam_300_dia_diem_CHUAN_HOA.csv');
const outPath = path.resolve('web/src/features/map-location/data/vietnam300Destinations.ts');

const content = fs.readFileSync(csvPath, 'utf8');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
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

const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);

const destinations = [];
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  if (row.length < 5) continue;
  const [name, province, category, latStr, lngStr, pMinStr, pMaxStr, opening, sourceUrl, verifiedAt, desc, imgRef] = row;
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);
  if (isNaN(lat) || isNaN(lng)) continue;

  const slug = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  const id = `vn-${i}-${slug || 'diem-den'}`;

  let cleanProvince = (province || 'Việt Nam').trim();
  if (cleanProvince === 'Huế') cleanProvince = 'Thừa Thiên Huế';
  if (cleanProvince === 'Hồ Chí Minh' || cleanProvince === 'Thành phố Hồ Chí Minh') cleanProvince = 'TP. Hồ Chí Minh';

  destinations.push({
    id,
    name: (name || '').trim(),
    province: cleanProvince,
    category: (category || 'Tham quan').trim(),
    latitude: lat,
    longitude: lng,
    description: (desc || '').trim(),
    priceMin: pMinStr && !isNaN(parseInt(pMinStr, 10)) ? parseInt(pMinStr, 10) : 0,
    priceMax: pMaxStr && !isNaN(parseInt(pMaxStr, 10)) ? parseInt(pMaxStr, 10) : 0,
    openingHours: opening ? opening.trim() : '07:00-18:00',
    sourceUrl: sourceUrl ? sourceUrl.trim() : undefined,
    thumbnailUrl: imgRef ? imgRef.trim() : undefined,
  });
}

const fileHeader = `import type { DestinationMarker } from '../types';\n\n/**\n * Kho 300+ Địa điểm Du lịch Chuẩn hóa Toàn quốc (63 Tỉnh Thành Việt Nam)\n * Nguồn: Dữ liệu VISTA chuẩn hóa có tọa độ GPS, phân loại và mô tả chi tiết.\n */\nexport const VIETNAM_300_DESTINATIONS: DestinationMarker[] = `;

const tsContent = `${fileHeader}${JSON.stringify(destinations, null, 2)};\n`;

fs.writeFileSync(outPath, tsContent, 'utf8');
console.log(`Successfully converted ${destinations.length} destinations to ${outPath}`);
