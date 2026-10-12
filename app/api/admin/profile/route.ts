import { NextRequest, NextResponse } from 'next/server';
import { getUserProfile, updateUserProfile } from '@/lib/auth/serverStore';

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
    const body = await req.json();
    const { name, email, location, avatarUrl } = body;

    const updated = await updateUserProfile({
      name,
      email,
      location,
      avatarUrl,
    });

    return NextResponse.json({
      success: true,
      message: 'Portfolio Principal profile & avatar updated successfully',
      user: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
