import { NextRequest, NextResponse } from 'next/server';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';
import {
  getGeminiAdminConfigSummary,
  planAndDraftEmailWithGemini,
} from '@/lib/ai/emailArchitect';
import { isLeakedOrRevokedKeyError } from '@/lib/security/secrets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
    if (!prompt) {
      return NextResponse.json(
        { success: false, error: 'Please describe what email you want the AI to plan.' },
        { status: 400 }
      );
    }

    const result = await planAndDraftEmailWithGemini({
      prompt,
      mode: body.mode === 'new' ? 'new' : body.currentDraft ? 'revise' : undefined,
      currentDraft: body.currentDraft || undefined,
      history: Array.isArray(body.history) ? body.history : undefined,
      context: body.context || undefined,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    const message = err?.message || 'AI email planning failed.';
    const leaked = isLeakedOrRevokedKeyError(message) || message.toLowerCase().includes('leaked');
    const config = leaked ? await getGeminiAdminConfigSummary().catch(() => undefined) : undefined;
    return NextResponse.json(
      {
        success: false,
        error: message,
        ...(leaked ? { isKeyLeaked: true, config } : {}),
      },
      { status: leaked ? 403 : 500 }
    );
  }
}
