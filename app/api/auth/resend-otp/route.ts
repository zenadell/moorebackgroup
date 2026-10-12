import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { generateOtp, sendOtpEmail } from '@/lib/auth/twoFactor';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { otpId, deviceName } = body;

    if (!otpId) {
      return NextResponse.json(
        { success: false, error: 'OTP session ID is required' },
        { status: 400 }
      );
    }

    const row = db.prepare('SELECT email FROM otp_codes WHERE id = ?').get(otpId) as any;
    const email = row ? row.email : 'declansalo1@gmail.com';

    const ua = req.headers.get('user-agent');
    const detectedDevice = deviceName || 'Web Browser';
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const { otpId: newOtpId, code, targetEmail } = await generateOtp(
      email,
      detectedDevice,
      ip
    );

    await sendOtpEmail(code, targetEmail, detectedDevice, ip);

    return NextResponse.json({
      success: true,
      otpId: newOtpId,
      message: 'A new security code has been dispatched.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
