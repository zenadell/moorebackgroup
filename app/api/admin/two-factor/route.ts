import { NextRequest, NextResponse } from 'next/server';
import {
  getTwoFactorSettings,
  updateTwoFactorSettings,
  getRecentOtpLogs,
} from '@/lib/auth/twoFactor';

export async function GET() {
  try {
    const settings = await getTwoFactorSettings();
    const logs = await getRecentOtpLogs();

    return NextResponse.json({
      success: true,
      settings,
      logs,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch 2FA configuration';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { enabled, notifyEmail, smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom } = body;

    await updateTwoFactorSettings({
      enabled: enabled !== undefined ? Boolean(enabled) : undefined,
      notifyEmail: notifyEmail ? notifyEmail.trim() : undefined,
      smtpHost: smtpHost !== undefined ? smtpHost.trim() : undefined,
      smtpPort: smtpPort ? Number(smtpPort) : undefined,
      smtpUser: smtpUser !== undefined ? smtpUser.trim() : undefined,
      smtpPass: smtpPass !== undefined ? smtpPass.trim() : undefined,
      smtpFrom: smtpFrom !== undefined ? smtpFrom.trim() : undefined,
    });

    const updated = await getTwoFactorSettings();

    return NextResponse.json({
      success: true,
      message: 'Two-Factor Authentication settings updated successfully',
      settings: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update 2FA configuration';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
