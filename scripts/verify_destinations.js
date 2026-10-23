const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'backend', 'src', 'main', 'resources', 'db', 'seed', 'demo_destinations_seed.csv');
const content = fs.readFileSync(csvPath, 'utf8');

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  const header = lines[0];
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const tokens = [];
    let cur = '';
    let inQuotes = false;
    for (let j = 0; j < line.length; j++) {
      const c = line[j];
      if (c === '"') {
        if (inQuotes && j + 1 < line.length && line[j + 1] === '"') {
          cur += '"';
          j++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        tokens.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    tokens.push(cur);
    rows.push({ lineIndex: i + 1, tokens, raw: line });
  }
  return { header, rows };
}

const { header, rows } = parseCsv(content);
console.log(`Total data rows parsed: ${rows.length}`);

const provinces = {};
const names = new Set();
const duplicates = [];

rows.forEach((r, idx) => {
  const name = r.tokens[0];
  const province = r.tokens[1];
  const opening = r.tokens[7];
  if (names.has(name)) {
    duplicates.push({ name, line: r.lineIndex });
  }
  names.add(name);
  provinces[province] = (provinces[province] || 0) + 1;

  if (r.tokens.length !== 12) {
    console.error(`Row ${r.lineIndex} has ${r.tokens.length} tokens instead of 12! Name: ${name}`);
  }

  try {
    const json = JSON.parse(opening);
    if (!json.mon || !json.sun) {
      console.warn(`Row ${r.lineIndex} (${name}) missing mon/sun opening hours!`);
    }
  } catch (err) {
    console.error(`Row ${r.lineIndex} (${name}) invalid JSON opening_hours:`, opening);
  }
});

console.log('Unique names:', names.size);
console.log('Duplicates:', duplicates);
console.log('Provinces breakdown:', provinces);
