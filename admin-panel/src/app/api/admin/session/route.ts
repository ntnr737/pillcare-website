import { NextRequest, NextResponse } from 'next/server';
import { PENDING_COOKIE, SESSION_COOKIE, signValue, verifyTotp, verifyValue } from '@/lib/server/admin-session';

export const runtime = 'nodejs';
const secure = process.env.NODE_ENV === 'production';

export async function POST(request: NextRequest) {
  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 }); }

  if (body?.stage === 'credentials') {
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    const expectedEmail = String(process.env.ADMIN_PANEL_EMAIL || '').trim().toLowerCase();
    const expectedPassword = process.env.ADMIN_PANEL_PASSWORD || '';
    if (!expectedEmail || !expectedPassword || !process.env.ADMIN_PANEL_TOTP_SECRET || !process.env.ADMIN_PANEL_SESSION_SECRET) {
      return NextResponse.json({ error: 'Admin authentication environment is not configured.' }, { status: 503 });
    }
    if (email !== expectedEmail || password.length !== expectedPassword.length || !timingSafeStringEqual(password, expectedPassword)) {
      return NextResponse.json({ error: 'Invalid administrator credentials.' }, { status: 401 });
    }
    const response = NextResponse.json({ ok: true, next: 'totp' });
    response.cookies.set(PENDING_COOKIE, signValue(`pending|${email}|${Date.now() + 5 * 60 * 1000}`), {
      httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 300,
    });
    return response;
  }

  if (body?.stage === 'totp') {
    const pending = verifyValue(request.cookies.get(PENDING_COOKIE)?.value || undefined);
    const parts = pending?.split('|') || [];
    if (parts.length !== 3 || parts[0] !== 'pending') {
      return NextResponse.json({ error: 'Login challenge expired. Enter your credentials again.' }, { status: 401 });
    }
    if (!verifyTotp(String(body.code || ''), process.env.ADMIN_PANEL_TOTP_SECRET || '')) {
      return NextResponse.json({ error: 'Invalid authenticator code.' }, { status: 401 });
    }
    const email = parts[1];
    const response = NextResponse.json({ ok: true, user: { email, name: 'PillCare Administrator', role: 'SUPER_ADMIN' } });
    response.cookies.set(SESSION_COOKIE, signValue(`session|${email}|${Date.now() + 8 * 60 * 60 * 1000}`), {
      httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 8 * 60 * 60,
    });
    response.cookies.set(PENDING_COOKIE, '', { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 0 });
    return response;
  }
  return NextResponse.json({ error: 'Unsupported authentication stage.' }, { status: 400 });
}

export async function GET(request: NextRequest) {
  const session = verifyValue(request.cookies.get(SESSION_COOKIE)?.value);
  const parts = session?.split('|') || [];
  if (parts.length !== 3 || parts[0] !== 'session') return NextResponse.json({ authenticated: false }, { status: 401 });
  return NextResponse.json({ authenticated: true, user: { email: parts[1], name: 'PillCare Administrator', role: 'SUPER_ADMIN' } });
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, '', { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 0 });
  response.cookies.set(PENDING_COOKIE, '', { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge: 0 });
  return response;
}

function timingSafeStringEqual(a: string, b: string): boolean {
  const { timingSafeEqual } = require('node:crypto') as typeof import('node:crypto');
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
