import { NextRequest, NextResponse } from 'next/server';
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

    const detectedDevice = deviceName || 'Web Browser';
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const location = req.headers.get('x-vercel-ip-city')
      ? `${decodeURIComponent(req.headers.get('x-vercel-ip-city') || '')}, ${req.headers.get('x-vercel-ip-country') || ''}`.replace(/,\s*$/, '')
      : req.headers.get('x-appengine-city')
        ? `${decodeURIComponent(req.headers.get('x-appengine-city') || '')}, ${req.headers.get('x-appengine-country') || ''}`.replace(/,\s*$/, '')
        : 'Location unavailable';

    const { otpId: newOtpId, code, targetEmail } = await generateOtp(
      'declansalo1@gmail.com',
      detectedDevice,
      ip,
      location
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
