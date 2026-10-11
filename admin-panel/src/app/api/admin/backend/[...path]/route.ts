import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifyValue } from '@/lib/server/admin-session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const session = verifyValue(request.cookies.get(SESSION_COOKIE)?.value);
  const parts = session?.split('|') || [];
  if (parts.length !== 3 || parts[0] !== 'session') {
    return NextResponse.json({ error: 'Admin authentication required.' }, { status: 401 });
  }
  const backend = process.env.PILLCARE_BACKEND_URL || 'https://pillcare-backend-1082668880575.europe-west1.run.app';
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret.length < 16) return NextResponse.json({ error: 'Server admin integration is not configured.' }, { status: 503 });

  const { path } = await context.params;
  const joined = path.join('/');
  if (!joined.startsWith('admin/')) return NextResponse.json({ error: 'Route not allowed.' }, { status: 403 });
  const url = new URL(`/${joined}`, backend);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.append(key, value));

  const headers = new Headers();
  headers.set('x-admin-secret', secret);
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);
  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer();

  try {
    const upstream = await fetch(url, { method: request.method, headers, body, cache: 'no-store', redirect: 'manual' });
    const responseHeaders = new Headers();
    const upstreamType = upstream.headers.get('content-type');
    if (upstreamType) responseHeaders.set('content-type', upstreamType);
    responseHeaders.set('Cache-Control', 'no-store, max-age=0');
    return new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: responseHeaders });
  } catch {
    return NextResponse.json({ error: 'Backend service is unavailable.' }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
