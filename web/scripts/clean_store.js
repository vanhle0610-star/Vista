const fs = require('fs');
const path = require('path');

const filePaths = ['web/.trips_store.json', '.trips_store.json'];

filePaths.forEach((p) => {
  if (fs.existsSync(p)) {
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    data.forEach((t) => {
      if (Array.isArray(t.members)) {
        const seen = new Map();
        t.members.forEach((m) => {
          const cleanName = (m.name || m.displayName || '').replace(/\s*\([^)]*\)/g, '').trim();
          const key = cleanName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          if (!seen.has(key)) {
            seen.set(key, { ...m, name: cleanName });
          } else {
            const ex = seen.get(key);
            if (m.email && !m.email.includes('@vista.vn')) ex.email = m.email;
            if (m.userId && !m.userId.startsWith('u-')) ex.userId = m.userId;
            if (m.role === 'Trưởng nhóm') ex.role = 'Trưởng nhóm';
          }
        });
        t.members = Array.from(seen.values());
      }
    });
    fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
    console.log('Cleaned:', p);
  }
});

