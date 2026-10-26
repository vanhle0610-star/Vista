import fs from 'fs';
import path from 'path';

const csvPath = path.resolve('Vietnam_300_dia_diem_CHUAN_HOA.csv');
const content = fs.readFileSync(csvPath, 'utf8');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += char;
  }
  result.push(current.trim());
  return result;
}

const lines = content.split(/\r?\n/).filter(l => l.trim().length > 0);
console.log('Total lines (inc header):', lines.length);

const items = [];
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  items.push({
    index: i,
    name: row[0],
    province: row[1],
    category: row[2],
    lat: parseFloat(row[3]),
    lng: parseFloat(row[4]),
    sourceUrl: row[8],
    imageRef: row[11]
  });
}

// Group by province
const byProvince = {};
for (const item of items) {
  if (!byProvince[item.province]) byProvince[item.province] = [];
  byProvince[item.province].push(item.name);
}

console.log('Provinces count:', Object.keys(byProvince).length);
for (const [prov, names] of Object.entries(byProvince)) {
  console.log(`- ${prov} (${names.length}): ${names.slice(0, 5).join(', ')}${names.length > 5 ? '...' : ''}`);
}
