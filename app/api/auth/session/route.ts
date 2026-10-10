import { NextRequest, NextResponse } from 'next/server';
import { validateSession } from '@/lib/auth/serverStore';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '') || req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ authenticated: false, reason: 'No token provided' }, { status: 401 });
    }

    const result = await validateSession(token);

    if (!result.valid) {
      return NextResponse.json(
        {
          authenticated: false,
          reason: result.reason || 'Session expired or revoked by account owner',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      authenticated: true,
      user: result.user,
      sessionId: result.session?.id,
      deviceName: result.session?.deviceName,
      isMaster: !!result.session?.isMaster,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}
