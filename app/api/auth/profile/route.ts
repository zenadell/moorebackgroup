import { NextRequest, NextResponse } from 'next/server';
import { validateSession, updateUserProfile, getUserProfile } from '@/lib/auth/serverStore';

export async function GET() {
  try {
    const user = await getUserProfile();
    return NextResponse.json({ success: true, user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

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
          error: 'Access denied: Only Declan Salo (Master Account) can update profile and login details.',
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, email, location, avatarUrl } = body;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    const updatedUser = await updateUserProfile({
      name,
      email,
      location,
      avatarUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile and login details updated successfully',
      user: updatedUser,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
