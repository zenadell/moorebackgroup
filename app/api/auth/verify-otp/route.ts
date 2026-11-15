import { NextRequest, NextResponse } from 'next/server';
import { createSession, getUserProfile } from '@/lib/auth/serverStore';
import { verifyOtp } from '@/lib/auth/twoFactor';
import {
  NO_STORE_HEADERS,
  clearOtpChallengeCookie,
  extractClientRequestMeta,
  readSignedChallengeCookie,
} from '@/lib/auth/otpHttp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { otpId, challengeId, code, deviceName } = body as {
      otpId?: string;
      challengeId?: string;
      code?: string;
      deviceName?: string;
    };

    const signedCookie = readSignedChallengeCookie(req);
    const effectiveChallengeId = signedCookie?.challengeId || challengeId || null;

    if ((!otpId && !effectiveChallengeId) || !code) {
      return NextResponse.json(
        { success: false, error: 'Verification code and session ID are required' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const verification = await verifyOtp({
      otpId,
      challengeId: effectiveChallengeId,
      inputCode: code,
    });
    if (!verification.valid) {
      return NextResponse.json(
        { success: false, error: verification.error || 'Invalid verification code' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const { deviceName: detectedDevice, ip, location } = extractClientRequestMeta(req, deviceName);

    // Successful OTP verification -> Create session
    const session = await createSession(detectedDevice, ip, location);
    const user = await getUserProfile();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Profile record is not available' },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        token: session.token,
        sessionId: session.id,
        deviceName: session.deviceName,
        isMaster: !!session.isMaster,
        user,
      },
      { headers: NO_STORE_HEADERS }
    );
    clearOtpChallengeCookie(response, req);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
