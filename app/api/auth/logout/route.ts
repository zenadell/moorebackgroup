import { NextRequest, NextResponse } from 'next/server';
import { validateSession, revokeSession } from '@/lib/auth/serverStore';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');

    if (token) {
      const auth = await validateSession(token);
      if (auth.valid && auth.session) {
        await revokeSession(auth.session.id, 'Logged out by user');
      }
    }

    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
