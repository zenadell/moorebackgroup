import { NextRequest, NextResponse } from 'next/server';
import {
  createSession,
  getUserProfile,
  parseDeviceFromUserAgent,
} from '@/lib/auth/serverStore';
import { verifyOtp } from '@/lib/auth/twoFactor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { otpId, code, deviceName } = body;

    if (!otpId || !code) {
      return NextResponse.json(
        { success: false, error: 'Verification code and session ID are required' },
        { status: 400 }
      );
    }

    const verification = await verifyOtp(otpId, code);
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid verification code' },
        { status: 401 }
      );
    }

    const ua = req.headers.get('user-agent');
    const detectedDevice = deviceName || parseDeviceFromUserAgent(ua);
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    // Successful OTP verification -> Create session
    const session = await createSession(
      detectedDevice,
      ip,
      'Nashville Tennessee, United States'
    );
    const user = await getUserProfile();

    return NextResponse.json({
      success: true,
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
