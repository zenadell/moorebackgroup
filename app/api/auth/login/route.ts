import { NextRequest, NextResponse } from 'next/server';
import {
  verifyCredentials,
  createSession,
  getUserProfile,
} from '@/lib/auth/serverStore';
import {
  OTP_RESEND_COOLDOWN_SECONDS,
  getTwoFactorSettings,
  generateOtp,
  sendOtpEmail,
} from '@/lib/auth/twoFactor';
import {
  NO_STORE_HEADERS,
  clearOtpChallengeCookie,
  extractClientRequestMeta,
  setOtpChallengeCookie,
} from '@/lib/auth/otpHttp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, deviceName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const isValid = await verifyCredentials(email, password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const { deviceName: detectedDevice, ip, location } = extractClientRequestMeta(req, deviceName);

    // Check if Two-Factor Authentication is active
    const twoFactorSettings = await getTwoFactorSettings();

    if (twoFactorSettings.enabled) {
      // Generate OTP bound to both DB record ID (otpId) and session challenge ID (challengeId)
      const { otpId, challengeId, code, targetEmail, maskedEmail, expiresAt } = await generateOtp(
        email,
        detectedDevice,
        ip,
        location
      );

      const emailResult = await sendOtpEmail(code, targetEmail, detectedDevice, ip);
      console.log('[2FA] OTP email result:', JSON.stringify(emailResult));

      const response = NextResponse.json(
        {
          success: true,
          requires2FA: true,
          otpId,
          challengeId,
          maskedEmail,
          resendAfterSeconds: OTP_RESEND_COOLDOWN_SECONDS,
          expiresAt,
          message: `Security code dispatched to ${maskedEmail}`,
        },
        { headers: NO_STORE_HEADERS }
      );
      setOtpChallengeCookie(response, req, challengeId, targetEmail);
      return response;
    }

    // If 2FA is explicitly disabled by admin, proceed with direct session
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
        requires2FA: false,
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
