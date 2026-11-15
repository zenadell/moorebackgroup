import { NextRequest, NextResponse } from 'next/server';
import { getOtpChallengeState } from '@/lib/auth/twoFactor';
import {
  NO_STORE_HEADERS,
  clearOtpChallengeCookie,
  readSignedChallengeCookie,
} from '@/lib/auth/otpHttp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const signedCookie = readSignedChallengeCookie(req);
    if (!signedCookie?.challengeId) {
      return NextResponse.json({ success: true, active: false }, { headers: NO_STORE_HEADERS });
    }

    const state = await getOtpChallengeState({ challengeId: signedCookie.challengeId });
    if (!state.active) {
      const res = NextResponse.json(
        { success: true, active: false },
        { headers: NO_STORE_HEADERS }
      );
      clearOtpChallengeCookie(res, req);
      return res;
    }

    return NextResponse.json(
      {
        success: true,
        ...state,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load verification challenge';
    return NextResponse.json(
      { success: false, active: false, error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const res = NextResponse.json({ success: true, cleared: true }, { headers: NO_STORE_HEADERS });
  clearOtpChallengeCookie(res, req);
  return res;
}
