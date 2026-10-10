import { NextRequest, NextResponse } from 'next/server';
import { validateSession, updatePassword } from '@/lib/auth/serverStore';

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

    if (!auth.session?.isMaster) {
      return NextResponse.json(
        {
          success: false,
          error: 'Access denied: Only Declan Salo (Master Account) can change the account password.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword, revokeOtherSessions } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    const res = await updatePassword(
      currentPassword,
      newPassword,
      revokeOtherSessions !== false,
      auth.session?.id
    );

    if (!res.success) {
      return NextResponse.json({ success: false, error: res.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Password successfully updated!',
      revokedCount: res.revokedCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
