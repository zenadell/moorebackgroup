import { NextRequest, NextResponse } from 'next/server';
import { parseDeviceFromUserAgent } from '@/lib/auth/serverStore';
import {
  OTP_CHALLENGE_COOKIE,
  OTP_TTL_MS,
  signOtpChallengeToken,
  verifyOtpChallengeToken,
} from '@/lib/auth/twoFactor';

export const NO_STORE_HEADERS: Record<string, string> = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export function extractClientRequestMeta(
  req: NextRequest,
  requestedDeviceName?: string | null
): {
  deviceName: string;
  ip: string;
  location: string;
  isHttps: boolean;
} {
  const ua = req.headers.get('user-agent');
  const deviceName =
    (typeof requestedDeviceName === 'string' && requestedDeviceName.trim()) ||
    parseDeviceFromUserAgent(ua);
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';
  const location = req.headers.get('x-vercel-ip-city')
    ? `${decodeURIComponent(req.headers.get('x-vercel-ip-city') || '')}, ${req.headers.get('x-vercel-ip-country') || ''}`.replace(
        /,\s*$/,
        ''
      )
    : req.headers.get('x-appengine-city')
      ? `${decodeURIComponent(req.headers.get('x-appengine-city') || '')}, ${req.headers.get('x-appengine-country') || ''}`.replace(
          /,\s*$/,
          ''
        )
      : 'Location unavailable';
  const isHttps =
    req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';

  return { deviceName, ip, location, isHttps };
}

export function readSignedChallengeCookie(req: NextRequest): {
  challengeId: string;
  email?: string;
} | null {
  const raw = req.cookies.get(OTP_CHALLENGE_COOKIE)?.value;
  const verified = verifyOtpChallengeToken(raw);
  if (!verified.valid || !verified.challengeId) return null;
  return {
    challengeId: verified.challengeId,
    email: verified.email,
  };
}

export function setOtpChallengeCookie(
  res: NextResponse,
  req: NextRequest,
  challengeId: string,
  email: string
): void {
  const isHttps =
    req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
  const token = signOtpChallengeToken(challengeId, email);
  res.cookies.set(OTP_CHALLENGE_COOKIE, token, {
    path: '/',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: Math.floor((OTP_TTL_MS * 3) / 1000),
  });
}

export function clearOtpChallengeCookie(res: NextResponse, req: NextRequest): void {
  const isHttps =
    req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
  res.cookies.set(OTP_CHALLENGE_COOKIE, '', {
    path: '/',
    httpOnly: true,
    secure: isHttps,
    sameSite: 'lax',
    maxAge: 0,
  });
}
