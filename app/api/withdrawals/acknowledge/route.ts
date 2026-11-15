import { NextRequest, NextResponse } from 'next/server';
import { acknowledgeWithdrawal } from '@/lib/admin/service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing withdrawal record ID' },
        { status: 400 }
      );
    }

    const ok = await acknowledgeWithdrawal(id);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to acknowledge receipt' },
      { status: 500 }
    );
  }
}
