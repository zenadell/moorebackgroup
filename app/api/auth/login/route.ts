import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCredentials,
  createSession,
  getUserProfile,
  parseDeviceFromUserAgent,
} from '@/lib/auth/serverStore';

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
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('x-real-ip') || '127.0.0.1';

    const session = await createSession(detectedDevice, ip, 'Nashville Tennessee, United States');
    const user = await getUserProfile();

    return NextResponse.json({
      success: true,
      token: session.token,
      sessionId: session.id,
      deviceName: session.deviceName,
      user,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
