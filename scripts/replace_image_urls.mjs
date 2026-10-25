import fs from 'node:fs';

const files = [
  'web/src/app/vietnamMapData.ts',
  'web/src/app/page.tsx',
  'web/src/app/planner/page.tsx',
];

const CLOUD_URL = 'https://cyqvqehhjpvwovdzscxm.supabase.co/storage/v1/object/public/vista-media/images/';

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  const countBefore = (content.match(/\/images\//g) || []).length;
  content = content.replace(/['"]\/images\/([^'"]+)['"]/g, (_match, p1) => {
    return `'${CLOUD_URL}${p1}'`;
  });
  fs.writeFileSync(file, content, 'utf8');
  console.log(`Replaced ${countBefore} image paths in ${file}`);
}
