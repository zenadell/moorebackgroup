import { NextRequest, NextResponse } from 'next/server';
import { getAdminConfig, updateAdminConfig } from '@/lib/admin/service';
import { validateSession } from '@/lib/auth/serverStore';

export async function GET() {
  try {
    const config = await getAdminConfig();
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to read admin config' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token =
      req.cookies.get('moback_session_token')?.value ||
      req.headers.get('x-session-token');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const sessionRes = await validateSession(token);
    if (!sessionRes.valid || !sessionRes.session) {
      return NextResponse.json(
        { success: false, error: 'Session expired or revoked' },
        { status: 401 }
      );
    }

    if (!sessionRes.session.isMaster) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only Declan Salo (Master Account) can modify Admin settings.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const updated = await updateAdminConfig(body, sessionRes.session.userId);

    return NextResponse.json({ success: true, config: updated });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update admin config' },
      { status: 500 }
    );
  }
}
