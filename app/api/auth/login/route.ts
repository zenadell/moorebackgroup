import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCredentials,
  createSession,
  getUserProfile,
  parseDeviceFromUserAgent,
} from '@/lib/auth/serverStore';
import {
  getTwoFactorSettings,
  generateOtp,
  sendOtpEmail,
} from '@/lib/auth/twoFactor';

function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return 'authorized security email';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}•@${domain}`;
  const first = local[0];
  const last = local[local.length - 1];
  return `${first}${'•'.repeat(Math.min(local.length - 2, 5))}${last}@${domain}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, deviceName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const isValid = await verifyCredentials(email, password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const ua = req.headers.get('user-agent');
    const detectedDevice = deviceName || parseDeviceFromUserAgent(ua);
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const location = req.headers.get('x-vercel-ip-city')
      ? `${decodeURIComponent(req.headers.get('x-vercel-ip-city') || '')}, ${req.headers.get('x-vercel-ip-country') || ''}`.replace(/,\s*$/, '')
      : req.headers.get('x-appengine-city')
        ? `${decodeURIComponent(req.headers.get('x-appengine-city') || '')}, ${req.headers.get('x-appengine-country') || ''}`.replace(/,\s*$/, '')
        : 'Location unavailable';

    // Check if Two-Factor Authentication is active
    const twoFactorSettings = await getTwoFactorSettings();

    if (twoFactorSettings.enabled) {
      // Generate OTP and dispatch to Declan Salo's security email
      const { otpId, code, targetEmail } = await generateOtp(
        email,
        detectedDevice,
        ip,
        location
      );

      const emailResult = await sendOtpEmail(code, targetEmail, detectedDevice, ip);
      console.log('[2FA] OTP email result:', JSON.stringify(emailResult));

      return NextResponse.json({
        success: true,
        requires2FA: true,
        otpId,
        maskedEmail: maskEmail(targetEmail),
        message: `Security code dispatched to ${maskEmail(targetEmail)}`,
      });
    }

    // If 2FA is explicitly disabled by admin, proceed with direct session
    const session = await createSession(
      detectedDevice,
      ip,
      location
    );
    const user = await getUserProfile();

    return NextResponse.json({
      success: true,
      requires2FA: false,
      token: session.token,
      sessionId: session.id,
      deviceName: session.deviceName,
      isMaster: !!session.isMaster,
      user,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
