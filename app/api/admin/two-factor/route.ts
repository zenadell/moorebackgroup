import { NextRequest, NextResponse } from 'next/server';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';
import {
  getTwoFactorSettings,
  updateTwoFactorSettings,
  clearResendApiKey,
  getRecentOtpLogs,
} from '@/lib/auth/twoFactor';
import { NO_STORE_HEADERS } from '@/lib/auth/otpHttp';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(req);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: NO_STORE_HEADERS }
      );
    }

    const settings = await getTwoFactorSettings();
    const logs = await getRecentOtpLogs();

    return NextResponse.json(
      {
        success: true,
        settings,
        logs,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch 2FA configuration';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(req);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: NO_STORE_HEADERS }
      );
    }

    const body = await req.json();
    const {
      enabled,
      notifyEmail,
      resendApiKey,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPass,
      smtpFrom,
    } = body;

    await updateTwoFactorSettings({
      enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      notifyEmail: notifyEmail ? notifyEmail.trim() : undefined,
      resendApiKey:
        typeof resendApiKey === 'string' && resendApiKey.trim().length > 0
          ? resendApiKey.trim()
          : undefined,
      smtpHost: smtpHost !== undefined ? smtpHost.trim() : undefined,
      smtpPort: smtpPort ? Number(smtpPort) : undefined,
      smtpUser: smtpUser !== undefined ? smtpUser.trim() : undefined,
      smtpPass: smtpPass !== undefined ? smtpPass.trim() : undefined,
      smtpFrom: smtpFrom !== undefined ? smtpFrom.trim() : undefined,
    });

    const updated = await getTwoFactorSettings();

    return NextResponse.json(
      {
        success: true,
        message: 'Two-Factor Authentication & Email gateway settings saved.',
        settings: updated,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update 2FA configuration';
    const isClientError =
      /api key is invalid|invalid api key|resend rejected|invalid resend|personal gmail|outbound smtp/i.test(
        message
      );
    return NextResponse.json(
      { success: false, error: message },
      { status: isClientError ? 400 : 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(req);
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: NO_STORE_HEADERS }
      );
    }

    await clearResendApiKey(undefined, 'missing');
    const updated = await getTwoFactorSettings();

    return NextResponse.json(
      {
        success: true,
        message: 'Resend API key removed.',
        settings: updated,
      },
      { headers: NO_STORE_HEADERS }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to remove Resend API key';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}
