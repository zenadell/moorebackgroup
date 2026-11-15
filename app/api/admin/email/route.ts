import { NextRequest, NextResponse } from 'next/server';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';
import {
  getEmailDispatchHistory,
  getSmtpCapabilitySummary,
  sendAdminInstitutionalEmail,
} from '@/lib/email/service';
import { ComposedEmailInput, EmailTemplateId } from '@/lib/email/templates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function authorizeMaster(req: NextRequest) {
  return authorizeMasterRequest(req, 'Only Declan Salo can dispatch institutional emails.');
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeMaster(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const [history, smtp] = await Promise.all([
      getEmailDispatchHistory(40),
      getSmtpCapabilitySummary(),
    ]);

    return NextResponse.json({ success: true, history, smtp });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to load email studio data' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMaster(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const bodyText = typeof body.bodyText === 'string' ? body.bodyText.trim() : '';

    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return NextResponse.json(
        { success: false, error: 'Please provide a valid recipient email address.' },
        { status: 400 }
      );
    }

    if (!subject) {
      return NextResponse.json(
        { success: false, error: 'Email subject line cannot be empty.' },
        { status: 400 }
      );
    }

    if (!bodyText) {
      return NextResponse.json(
        { success: false, error: 'Email body content cannot be empty.' },
        { status: 400 }
      );
    }

    const allowedTemplates: EmailTemplateId[] = [
      'mercury_clean',
      'stripe_statement',
      'swiss_memo',
      'plain_executive',
      'compliance_notice',
      'official_notice',
      'withdrawal_advisory',
      'disbursement_receipt',
      'security_alert',
      'executive_letterhead',
    ];
    const templateId: EmailTemplateId = allowedTemplates.includes(body.templateId)
      ? body.templateId
      : 'mercury_clean';

    const input: ComposedEmailInput = {
      to,
      fromEmail: typeof body.fromEmail === 'string' ? body.fromEmail.trim() : undefined,
      replyTo: typeof body.replyTo === 'string' ? body.replyTo.trim() : undefined,
      senderName:
        typeof body.senderName === 'string' && body.senderName.trim()
          ? body.senderName.trim()
          : 'MooreBach Group',
      senderRole:
        typeof body.senderRole === 'string' && body.senderRole.trim()
          ? body.senderRole.trim()
          : 'Private Wealth & Institutional Custody',
      subject,
      preheader: typeof body.preheader === 'string' ? body.preheader.trim() : undefined,
      templateId,
      classification:
        typeof body.classification === 'string' ? body.classification.trim() : undefined,
      tone: body.tone,
      accentColor:
        typeof body.accentColor === 'string' ? body.accentColor.trim() : undefined,
      headline: typeof body.headline === 'string' ? body.headline.trim() : undefined,
      greeting: typeof body.greeting === 'string' ? body.greeting.trim() : undefined,
      bodyText,
      summaryTitle: typeof body.summaryTitle === 'string' ? body.summaryTitle.trim() : undefined,
      summaryRows: Array.isArray(body.summaryRows)
        ? body.summaryRows.slice(0, 12).map((r: any) => ({
            label: String(r?.label ?? '').slice(0, 80),
            value: String(r?.value ?? '').slice(0, 160),
            highlight: Boolean(r?.highlight),
          }))
        : [],
      calloutNote: typeof body.calloutNote === 'string' ? body.calloutNote.trim() : undefined,
      ctaLabel: typeof body.ctaLabel === 'string' ? body.ctaLabel.trim() : undefined,
      ctaUrl: typeof body.ctaUrl === 'string' ? body.ctaUrl.trim() : undefined,
      signOff: typeof body.signOff === 'string' ? body.signOff.trim() : undefined,
      referenceCode:
        typeof body.referenceCode === 'string' ? body.referenceCode.trim() : undefined,
    };

    const result = await sendAdminInstitutionalEmail(input, 'MooreBach Group Treasury Desk');
    const [history, smtp] = await Promise.all([
      getEmailDispatchHistory(40),
      getSmtpCapabilitySummary(),
    ]);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'SMTP delivery failed',
          record: result.record,
          history,
          smtp,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Email dispatched to ${to}`,
      record: result.record,
      history,
      smtp,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to dispatch institutional email' },
      { status: 500 }
    );
  }
}
