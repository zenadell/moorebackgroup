import { NextRequest, NextResponse } from 'next/server';
import { getWithdrawalRequests, updateWithdrawalStatus } from '@/lib/admin/service';
import { validateSession } from '@/lib/auth/serverStore';

export async function GET(req: NextRequest) {
  try {
    const token =
      req.cookies.get('moback_session_token')?.value ||
      req.headers.get('x-session-token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionRes = await validateSession(token);
    if (!sessionRes.valid || !sessionRes.session?.isMaster) {
      return NextResponse.json(
        { success: false, error: 'Only Declan Salo can access withdrawal logs.' },
        { status: 403 }
      );
    }

    const withdrawals = await getWithdrawalRequests();
    return NextResponse.json({ success: true, withdrawals });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to fetch withdrawal requests' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const token =
      req.cookies.get('moback_session_token')?.value ||
      req.headers.get('x-session-token');

    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sessionRes = await validateSession(token);
    if (!sessionRes.valid || !sessionRes.session?.isMaster) {
      return NextResponse.json(
        { success: false, error: 'Only Declan Salo can update withdrawal status.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, status, reason } = body;

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing withdrawal ID or status' },
        { status: 400 }
      );
    }

    const ok = await updateWithdrawalStatus(id, status, reason);
    if (!ok) {
      return NextResponse.json(
        { success: false, error: 'Withdrawal request not found' },
        { status: 404 }
      );
    }

    const updatedList = await getWithdrawalRequests();
    return NextResponse.json({ success: true, withdrawals: updatedList });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to update withdrawal' },
      { status: 500 }
    );
  }
}
