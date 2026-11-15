import { NextRequest, NextResponse } from 'next/server';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';
import {
  clearGeminiAdminKey,
  DEFAULT_GEMINI_MODEL,
  getGeminiAdminConfigSummary,
  saveGeminiAdminConfig,
} from '@/lib/ai/emailArchitect';
import { isLeakedOrRevokedKeyError } from '@/lib/security/secrets';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const config = await getGeminiAdminConfigSummary();
    return NextResponse.json({ success: true, config });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to read AI configuration' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const apiKey = typeof body.apiKey === 'string' ? body.apiKey.trim() : undefined;
    const model =
      typeof body.model === 'string' && body.model.trim()
        ? body.model.trim()
        : DEFAULT_GEMINI_MODEL;

    const config = await saveGeminiAdminConfig({ apiKey, model });
    return NextResponse.json({
      success: true,
      message: apiKey
        ? `Verified & encrypted Gemini API key locally for model ${config.model}.`
        : `Saved Gemini AI settings (${config.model}).`,
      config,
    });
  } catch (err: any) {
    const msg = err?.message || 'Failed to save AI configuration';
    const isKeyError = isLeakedOrRevokedKeyError(msg) || msg.toLowerCase().includes('leaked');
    return NextResponse.json(
      {
        success: false,
        error: msg,
        ...(isKeyError ? { errorCode: 'KEY_LEAKED' } : {}),
      },
      { status: isKeyError ? 400 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(req);
    if (!auth.ok) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const config = await clearGeminiAdminKey('Cleared manually by Master Admin');
    return NextResponse.json({
      success: true,
      message: 'Removed stored Gemini API key from local vault & .env.local.',
      config,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to remove Gemini API key' },
      { status: 500 }
    );
  }
}
