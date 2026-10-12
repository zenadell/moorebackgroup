import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMasterPassword,
  createMasterSession,
  validateSession,
  getUserProfile,
  parseDeviceFromUserAgent,
} from '@/lib/auth/serverStore';

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get('moback_session_token')?.value ||
      req.cookies.get('salo_master_token')?.value ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    const saloKey = req.headers.get('x-salo-key');

    if (saloKey) {
      const isKeyValid = await verifyMasterPassword(saloKey);
      if (isKeyValid) {
        const user = await getUserProfile();
        return NextResponse.json({
          success: true,
          authorized: true,
          isMaster: true,
          user,
        });
      }
    }

    if (!token) {
      return NextResponse.json({
        success: true,
        authorized: false,
        error: 'No active master session',
      });
    }

    const sessionRes = await validateSession(token);
    if (sessionRes.valid && sessionRes.session?.isMaster) {
      return NextResponse.json({
        success: true,
        authorized: true,
        isMaster: true,
        user: sessionRes.user,
      });
    }

    return NextResponse.json({
      success: true,
      authorized: false,
      error: 'Session is not authorized for master administration',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error checking master session';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { key, deviceName } = body;

    if (!key) {
      return NextResponse.json(
        { success: false, error: 'Master clearance key is required.' },
        { status: 400 }
      );
    }

    const isValid = await verifyMasterPassword(key);
    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access Denied: Invalid Master Clearance Key. This incident has been logged.',
        },
        { status: 401 }
      );
    }

    const ua = req.headers.get('user-agent');
    const detectedDevice = deviceName || `${parseDeviceFromUserAgent(ua)} (Master Console)`;
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0] ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const session = await createMasterSession(detectedDevice, ip);
    const user = await getUserProfile();

    const response = NextResponse.json({
      success: true,
      authorized: true,
      token: session.token,
      sessionId: session.id,
      isMaster: true,
      user,
      message: 'Master Security Terminal Unlocked',
    });

    // Set cookie for session persistence
    response.cookies.set('moback_session_token', session.token, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    response.cookies.set('salo_master_token', session.token, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Master authentication error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
