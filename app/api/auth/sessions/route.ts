import { NextRequest, NextResponse } from 'next/server';
import { validateSession, getActiveSessions } from '@/lib/auth/serverStore';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const auth = await validateSession(token);
    if (!auth.valid) {
      return NextResponse.json(
        { success: false, error: auth.reason || 'Session expired or revoked' },
        { status: 401 }
      );
    }

    const { sessions, totalActive } = await getActiveSessions(token);

    return NextResponse.json({
      success: true,
      sessions,
      totalActive,
      currentSessionId: auth.session?.id,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
