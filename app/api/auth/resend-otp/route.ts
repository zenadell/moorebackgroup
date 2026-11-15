import { NextRequest, NextResponse } from 'next/server';
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  resendOtpChallenge,
  sendOtpEmail,
} from '@/lib/auth/twoFactor';
import {
  NO_STORE_HEADERS,
  extractClientRequestMeta,
  readSignedChallengeCookie,
  setOtpChallengeCookie,
} from '@/lib/auth/otpHttp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { otpId, challengeId, deviceName } = body as {
      otpId?: string;
      challengeId?: string;
      deviceName?: string;
    };

    const signedCookie = readSignedChallengeCookie(req);
    const effectiveChallengeId =
      (typeof challengeId === 'string' && challengeId.trim()) || signedCookie?.challengeId || null;

    if (!otpId && !effectiveChallengeId) {
      return NextResponse.json(
        { success: false, error: 'Verification challenge is required. Please sign in again.' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const { deviceName: detectedDevice, ip, location } = extractClientRequestMeta(req, deviceName);

    const issued = await resendOtpChallenge({
      challengeId: effectiveChallengeId,
      otpId,
      trustedEmail: signedCookie?.email,
      deviceName: detectedDevice,
      ipAddress: ip,
      location,
    });

    if (!issued.success || !issued.otpId || !issued.challengeId || !issued.code || !issued.targetEmail) {
      return NextResponse.json(
        {
          success: false,
          error: issued.error || 'Unable to resend verification code.',
          retryAfterSeconds: issued.retryAfterSeconds,
        },
        { status: issued.status || 400, headers: NO_STORE_HEADERS }
      );
    }

    const emailResult = await sendOtpEmail(issued.code, issued.targetEmail, detectedDevice, ip);
    console.log('[2FA] Resend OTP email result:', JSON.stringify(emailResult));

    const response = NextResponse.json(
      {
        success: true,
        otpId: issued.otpId,
        challengeId: issued.challengeId,
        maskedEmail: issued.maskedEmail,
        resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
        expiresAt: issued.expiresAt,
        message: 'A new security code has been dispatched.',
      },
      { headers: NO_STORE_HEADERS }
    );
    setOtpChallengeCookie(response, req, issued.challengeId, issued.targetEmail);
    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
