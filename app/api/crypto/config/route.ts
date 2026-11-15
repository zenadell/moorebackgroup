import { NextRequest, NextResponse } from 'next/server';
import { getCryptoConfig, updateCryptoConfig } from '@/lib/crypto/config';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';

export async function GET() {
  try {
    const config = await getCryptoConfig();
    return NextResponse.json({
      success: true,
      config,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to read crypto config' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(
      req,
      'Unauthorized: Only Declan Salo (Master Account) can update deposit vault addresses.'
    );
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const { addresses } = body;

    if (!addresses || typeof addresses !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid addresses payload.' },
        { status: 400 }
      );
    }

    const updateRes = await updateCryptoConfig(addresses, auth.userId || 'usr_declan_salo');
    if (!updateRes.success) {
      return NextResponse.json(
        { success: false, error: updateRes.error || 'Validation failed.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      config: updateRes.config,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update crypto config' },
      { status: 500 }
    );
  }
}
