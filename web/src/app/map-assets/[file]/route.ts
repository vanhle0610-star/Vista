import { readFile } from 'node:fs/promises';
import path from 'node:path';

// MapLibre 6's module worker imports a sibling shared module. Serve the installed
// package together at stable same-origin URLs, independent of Turbopack chunk names.
const allowed = new Set(['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']);

export async function GET(
  _request: Request,
  context: { params: Promise<{ file: string }> },
) {
  const { file } = await context.params;
  if (!allowed.has(file)) return new Response('Not found', { status: 404 });
  const content = await readFile(
    path.join(process.cwd(), 'node_modules', 'maplibre-gl', 'dist', file),
  );
  return new Response(content, {
    headers: {
      'Content-Type': 'text/javascript; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
