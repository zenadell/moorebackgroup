import { NextRequest, NextResponse } from 'next/server';
import { validateSession, getActiveSessions } from '@/lib/auth/serverStore';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const bearerToken = authHeader?.replace(/^Bearer\s+/i, '');

    if (bearerToken) {
      const auth = await validateSession(bearerToken);
      if (auth.valid) {
        const { sessions, totalActive } = await getActiveSessions(bearerToken);
        return NextResponse.json({
          success: true,
          sessions,
          totalActive,
          currentSessionId: auth.session?.id,
          isMaster: !!auth.session?.isMaster,
        });
      }
    }

    const masterAuth = await authorizeMasterRequest(req);
    if (!masterAuth.ok) {
      return NextResponse.json(
        { success: false, error: masterAuth.error || 'Unauthorized' },
        { status: masterAuth.status }
      );
    }

    const currentToken = masterAuth.token || req.cookies.get('salo_master_token')?.value || '';
    const { sessions, totalActive } = await getActiveSessions(currentToken);

    return NextResponse.json({
      success: true,
      sessions,
      totalActive,
      currentSessionId: masterAuth.sessionId,
      isMaster: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
