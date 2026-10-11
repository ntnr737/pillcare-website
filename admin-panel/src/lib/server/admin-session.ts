import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'pillcare_admin_session';
export const PENDING_COOKIE = 'pillcare_admin_pending';

function secret(): string {
  const value = process.env.ADMIN_PANEL_SESSION_SECRET;
  if (!value || value.length < 32) throw new Error('ADMIN_PANEL_SESSION_SECRET must be set to at least 32 characters.');
  return value;
}

export function signValue(value: string): string {
  const signature = createHmac('sha256', secret()).update(value).digest('hex');
  return `${value}.${signature}`;
}

export function verifyValue(raw: string | undefined): string | null {
  if (!raw) return null;
  const split = raw.lastIndexOf('.');
  if (split < 1) return null;
  const value = raw.slice(0, split);
  const signature = raw.slice(split + 1);
  const expected = createHmac('sha256', secret()).update(value).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const parts = value.split('|');
  const expires = Number(parts[parts.length - 1]);
  if (!Number.isFinite(expires) || expires < Date.now()) return null;
  return value;
}

export function verifyTotp(code: string, base32: string): boolean {
  if (!/^\d{6}$/.test(code) || !base32) return false;
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = base32.toUpperCase().replace(/=+$/g, '').replace(/\s/g, '');
  let bits = '';
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index < 0) return false;
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  const key = Buffer.from(bytes);
  const counter = Math.floor(Date.now() / 30000);
  for (let drift = -1; drift <= 1; drift++) {
    const moving = BigInt(counter + drift);
    const msg = Buffer.alloc(8);
    msg.writeBigUInt64BE(moving);
    const digest = createHmac('sha1', key).update(msg).digest();
    const offset = digest[digest.length - 1] & 0x0f;
    const binary = ((digest[offset] & 0x7f) << 24) | ((digest[offset + 1] & 0xff) << 16) | ((digest[offset + 2] & 0xff) << 8) | (digest[offset + 3] & 0xff);
    if (String(binary % 1000000).padStart(6, '0') === code) return true;
  }
  return false;
}
