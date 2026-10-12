import { NextRequest, NextResponse } from 'next/server';
import { getBeneficiaryInfo, updateBeneficiaryInfo } from '@/lib/beneficiary/service';

export async function GET() {
  try {
    const beneficiary = await getBeneficiaryInfo();
    return NextResponse.json({
      success: true,
      beneficiary,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      relationship,
      email,
      address,
      allocationPercent,
      covenantId,
      designationDate,
      status,
      avatarUrl,
      notes,
    } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Beneficiary name is required' }, { status: 400 });
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (relationship !== undefined) updates.relationship = relationship.trim();
    if (email !== undefined) updates.email = email.trim();
    if (address !== undefined) updates.address = address.trim();
    if (allocationPercent !== undefined) updates.allocationPercent = Number(allocationPercent);
    if (covenantId !== undefined) updates.covenantId = covenantId.trim();
    if (designationDate !== undefined) updates.designationDate = designationDate.trim();
    if (status !== undefined) updates.status = status;
    if (avatarUrl !== undefined && avatarUrl !== '') updates.avatarUrl = avatarUrl;
    if (notes !== undefined) updates.notes = notes.trim();

    const updated = await updateBeneficiaryInfo(updates);

    return NextResponse.json({
      success: true,
      message: 'Sole Beneficiary records updated and synced to MooreBach Group ledger',
      beneficiary: updated,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
