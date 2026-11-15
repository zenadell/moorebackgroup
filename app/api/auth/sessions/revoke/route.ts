import { NextRequest, NextResponse } from 'next/server';
import {
  revokeSession,
  revokeAllOtherSessions,
} from '@/lib/auth/serverStore';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(
      req,
      'Access denied: Only Declan Salo (Master Account) has permission to terminate sessions.'
    );
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status }
      );
    }

    const token = auth.token || req.cookies.get('salo_master_token')?.value || '';
    const body = await req.json();
    const { sessionId, allOthers, revokeAllOthers, reason } = body;

    const revocationReason = reason || 'Session terminated by account owner (Declan Salo)';

    if (allOthers || revokeAllOthers) {
      const revokedCount = await revokeAllOtherSessions(token, revocationReason);
      return NextResponse.json({
        success: true,
        message: `Successfully terminated ${revokedCount} other session(s)`,
        revokedCount,
      });
    }

    if (sessionId) {
      if (auth.sessionId && sessionId === auth.sessionId) {
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
