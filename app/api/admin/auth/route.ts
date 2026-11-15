import { NextRequest, NextResponse } from 'next/server';
import {
  verifyMasterPassword,
  createMasterSession,
  revokeSession,
  getUserProfile,
  parseDeviceFromUserAgent,
} from '@/lib/auth/serverStore';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
};

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(req);
    if (!auth.ok) {
      return NextResponse.json(
        {
          success: true,
          authorized: false,
          error: auth.error || 'No active master session',
        },
        { headers: NO_STORE }
      );
    }

    const user = await getUserProfile();
    if (!user) {
      return NextResponse.json(
        { success: false, authorized: false, error: 'Profile record is not available' },
        { status: 503, headers: NO_STORE }
      );
    }

    return NextResponse.json(
      {
        success: true,
        authorized: true,
        isMaster: true,
        user,
      },
      { headers: NO_STORE }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error checking master session';
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_STORE });
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
    if (!user) return NextResponse.json({ success: false, authorized: false, error: 'Profile record is not available' }, { status: 503 });

    const isHttps =
      req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';

    const response = NextResponse.json({
      success: true,
      authorized: true,
      sessionId: session.id,
      isMaster: true,
      user,
      message: 'Master Security Terminal Unlocked',
    });

    // Dedicated database-backed HttpOnly admin cookie (isolated from client storage)
    response.cookies.set('salo_master_token', session.token, {
      path: '/',
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Master authentication error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isHttps =
      req.headers.get('x-forwarded-proto') === 'https' || req.nextUrl.protocol === 'https:';
    const auth = await authorizeMasterRequest(req);
    if (auth.ok && auth.sessionId) {
      await revokeSession(auth.sessionId, 'Locked manually by Master Admin');
    }

    const response = NextResponse.json({
      success: true,
      authorized: false,
      message: 'Admin terminal locked.',
    });
    response.cookies.set('salo_master_token', '', {
      path: '/',
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 0,
    });
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to lock terminal';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
