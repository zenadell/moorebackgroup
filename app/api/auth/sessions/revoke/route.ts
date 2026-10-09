import { NextRequest, NextResponse } from 'next/server';
import {
  validateSession,
  revokeSession,
  revokeAllOtherSessions,
} from '@/lib/auth/serverStore';

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { sessionId, allOthers, reason } = body;

    const revocationReason = reason || 'Session terminated by account owner (Declan Salo)';

    if (allOthers) {
      const revokedCount = await revokeAllOtherSessions(token, revocationReason);
      return NextResponse.json({
        success: true,
        message: `Successfully terminated ${revokedCount} other session(s)`,
        revokedCount,
      });
    }

    if (sessionId) {
      if (sessionId === auth.session?.id) {
        return NextResponse.json(
          {
            success: false,
            error: 'Cannot terminate your current active session from here. Use Log Out instead.',
          },
          { status: 400 }
        );
      }

      const ok = await revokeSession(sessionId, revocationReason);
      if (!ok) {
        return NextResponse.json(
          { success: false, error: 'Session not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Target session terminated immediately',
        sessionId,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Please specify sessionId or allOthers: true' },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
