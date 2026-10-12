import { NextRequest, NextResponse } from 'next/server';
import { getCryptoConfig, updateCryptoConfig } from '@/lib/crypto/config';
import { validateSession } from '@/lib/auth/serverStore';

export async function GET() {
  try {
    const config = await getCryptoConfig();
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to read crypto config' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication and authorization
    const token =
      req.cookies.get('moback_session_token')?.value ||
      req.headers.get('x-session-token') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required to configure deposit vaults.' },
        { status: 401 }
      );
    }

    const sessionRes = await validateSession(token);
    if (!sessionRes.valid || !sessionRes.session) {
      return NextResponse.json(
        { success: false, error: sessionRes.reason || 'Session is invalid or expired.' },
        { status: 401 }
      );
    }

    if (!sessionRes.session.isMaster) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Only Declan Salo (Master Account) can update deposit vault addresses.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { addresses } = body;

    if (!addresses || typeof addresses !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid addresses payload.' },
        { status: 400 }
      );
    }

    const updateRes = await updateCryptoConfig(addresses, sessionRes.session.userId);
    if (!updateRes.success) {
      return NextResponse.json(
        { success: false, error: updateRes.error || 'Validation failed.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      config: updateRes.config,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update crypto config' },
      { status: 500 }
    );
  }
}
