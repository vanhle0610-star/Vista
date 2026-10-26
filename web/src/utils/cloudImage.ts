export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://cyqvqehhjpvwovdzscxm.supabase.co';

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_UmSu3JB2FOLYWxLB3EB14Q_D2Sg29u9';

export const STORAGE_BUCKET =
  process.env.NEXT_PUBLIC_STORAGE_BUCKET || 'vista-media';

export const CLOUD_IMAGE_BASE =
  process.env.NEXT_PUBLIC_CLOUD_IMAGE_BASE ||
  `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/images`;

/**
 * Normalizes any image path to the Supabase Cloud Storage public URL.
 * Accepts:
 * - Full URL (returns as is)
 * - Local path like '/images/danang_real.jpg' or 'images/map/my-khe.jpg'
 * - Destination path like 'destinations/danang/cau-rong.jpg'
 */
export function getCloudImageUrl(path?: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const clean = path.replace(/^\/?images\//, '').replace(/^\//, '');
  return `${CLOUD_IMAGE_BASE}/${clean}`;
}

/**
 * Uploads a file directly to Supabase Storage bucket.
 * Returns the public CDN URL.
 */
export async function uploadFileToCloud(
  file: File,
  folder: 'avatars' | 'trips' | 'destinations' = 'avatars'
): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const cleanExt = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
  const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${cleanExt}`;
  const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${fileName}`;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': file.type || 'image/jpeg',
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Upload ảnh lên Cloud thất bại: ${errorText}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${fileName}`;
}
