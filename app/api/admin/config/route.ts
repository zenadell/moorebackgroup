import { NextRequest, NextResponse } from 'next/server';
import { getAdminConfig, updateAdminConfig } from '@/lib/admin/service';
import { authorizeMasterRequest } from '@/lib/auth/masterAuth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
};

export async function GET() {
  try {
    const config = await getAdminConfig();
    return NextResponse.json({ success: true, config }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to read admin config' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeMasterRequest(
      req,
      'Unauthorized: Only Declan Salo (Master Account) can modify Admin settings.'
    );
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, error: auth.error },
        { status: auth.status, headers: NO_STORE_HEADERS }
      );
    }

    const body = await req.json();
    const updated = await updateAdminConfig(body, auth.userId || 'usr_declan_salo');

    return NextResponse.json({ success: true, config: updated }, { headers: NO_STORE_HEADERS });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update admin config' },
      { status: 500 }
    );
  }
}
