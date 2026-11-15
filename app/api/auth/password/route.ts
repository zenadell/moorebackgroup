import { NextRequest, NextResponse } from 'next/server';
import { updatePassword } from '@/lib/auth/serverStore';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(
      req,
      'Access denied: Only Declan Salo (Master Account) can change the account password.'
    );
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const { currentPassword, newPassword, revokeOtherSessions, revokeOthers } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { success: false, error: 'Current password and new password are required' },
        { status: 400 }
      );
    }

    const res = await updatePassword(
      currentPassword,
      newPassword,
      revokeOtherSessions !== false && revokeOthers !== false,
      auth.sessionId
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
