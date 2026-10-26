import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const imagesDir = path.resolve(__dirname, '..', 'web', 'public', 'images');

const SUPABASE_URL = 'https://cyqvqehhjpvwovdzscxm.supabase.co';
const SUPABASE_KEY = 'sb_publishable_UmSu3JB2FOLYWxLB3EB14Q_D2Sg29u9';
const BUCKET = 'vista-media';

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    case '.gif':
      return 'image/gif';
    case '.svg':
      return 'image/svg+xml';
    default:
      return 'application/octet-stream';
  }
}

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  }

  return arrayOfFiles;
}

async function uploadFile(filePath) {
  const relativePath = path.relative(imagesDir, filePath).replace(/\\/g, '/');
  const storagePath = `images/${relativePath}`;
  const mimeType = getMimeType(filePath);
  const fileBuffer = fs.readFileSync(filePath);

  console.log(`[UPLOADING] ${relativePath} (${(fileBuffer.length / 1024).toFixed(1)} KB) -> ${storagePath}...`);

  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${storagePath}`;

  // Use upsert header if already exists
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': mimeType,
      'x-upsert': 'true'
    },
    body: fileBuffer
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error(`  [FAILED] ${relativePath}: HTTP ${res.status} - ${errText}`);
    return false;
  }

  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
  console.log(`  [OK] CDN URL: ${publicUrl}`);
  return true;
}

async function main() {
  if (!fs.existsSync(imagesDir)) {
    console.error(`Images directory not found: ${imagesDir}`);
    process.exit(1);
  }

  const allFiles = getAllFiles(imagesDir);
  console.log(`Found ${allFiles.length} images to migrate to Supabase Storage (${BUCKET})...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const file of allFiles) {
    const success = await uploadFile(file);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n===========================================`);
  console.log(`Migration Complete: ${successCount} uploaded successfully, ${failCount} failed.`);
  console.log(`Public Base URL: ${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/images/`);
  console.log(`===========================================`);
}

main().catch(console.error);
