import { NextResponse } from 'next/server';
import { getBeneficiaryInfo } from '@/lib/beneficiary/service';

export async function GET() {
  try {
    const beneficiary = await getBeneficiaryInfo();
    if (!beneficiary) {
      return NextResponse.json({ success: false, error: 'Beneficiary record is not available' }, { status: 503 });
    }
    return NextResponse.json({
      success: true,
      beneficiary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
