import { NextRequest, NextResponse } from 'next/server';
import {
  getAdminConfig,
  logWithdrawalAttempt,
  getLiquidatedBalance,
  isWithdrawalLockdownActive,
  getPostLockdownDeclineStatus,
  getDailyWithdrawnTotal,
  getLatestTransferredUnacknowledgedWithdrawal,
  recordLedgerTransaction,
} from '@/lib/admin/service';
import { parseDeviceFromUserAgent } from '@/lib/auth/serverStore';
import { validateCryptoAddress } from '@/lib/crypto/blockchain';
import { sendAdminWithdrawalNotificationEmail } from '@/lib/email/service';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    const config = await getAdminConfig();
    const liquidatedBalance = await getLiquidatedBalance();
    const lockdown = await isWithdrawalLockdownActive();
    const postLockdownDecline = await getPostLockdownDeclineStatus();
    const dailyWithdrawnTotal = await getDailyWithdrawnTotal();
    const dailyLimit = config.withdrawals.dailyLimit || 0;
    const dailyRemaining = dailyLimit > 0 ? Math.max(0, Number((dailyLimit - dailyWithdrawnTotal).toFixed(2))) : null;
    const unacknowledgedReceipt = await getLatestTransferredUnacknowledgedWithdrawal();

    return NextResponse.json(
      {
        success: true,
        withdrawals: config.withdrawals,
        liquidatedBalance,
        dailyWithdrawnTotal,
        dailyRemaining,
        lockdown,
        postLockdownDecline,
        unacknowledgedReceipt,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to read withdrawal config' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
        },
      }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const config = await getAdminConfig();
    const wConfig = config.withdrawals;
    const body = await req.json();
    const { amount, rail, beneficiary, destination, asset, network, recipientAddress, userEmail } = body;

    // 1. Check 24-hour security lockdown
    const lockdown = await isWithdrawalLockdownActive();
    if (lockdown.isLocked) {
      return NextResponse.json(
        {
          success: false,
          locked24h: true,
          remainingMs: lockdown.remainingMs,
          remainingFormatted: lockdown.remainingFormatted,
          error: `Security Protocol Active: Capital disbursements are restricted to one transfer every 24 hours. Your gateway is locked for another ${lockdown.remainingFormatted}.`,
          lastWithdrawal: lockdown.lastWithdrawal,
        },
        { status: 403 }
      );
    }

    // 2. Check post-lockdown decline directive
    const declineStatus = await getPostLockdownDeclineStatus();
    if (declineStatus.isDeclined) {
      return NextResponse.json(
        {
          success: false,
          declined: true,
          title: declineStatus.title,
          error: declineStatus.message,
          supportEmail: declineStatus.supportEmail,
          buttonText: declineStatus.buttonText,
        },
        { status: 403 }
      );
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid withdrawal amount.' },
        { status: 400 }
      );
    }

    // 3. Enforce allowed disbursement rail & withdrawal limits
    const selectedRail = (rail || 'crypto') as 'crypto' | 'fedwire' | 'swift' | 'debit';
    if (wConfig.allowedRails && wConfig.allowedRails[selectedRail] === false) {
      const railLabel =
        selectedRail === 'crypto'
          ? 'Crypto Outbound'
          : selectedRail === 'fedwire'
          ? 'Fedwire Wire'
          : selectedRail === 'swift'
          ? 'SWIFT Global'
          : 'Debit';
      return NextResponse.json(
        {
          success: false,
          railDisabled: true,
          error: `${railLabel} disbursements are currently disabled by treasury policy.`,
        },
        { status: 400 }
      );
    }

    if (wConfig.minAmount > 0 && parsedAmount < wConfig.minAmount) {
      return NextResponse.json(
        {
          success: false,
          limitError: true,
          error: `Minimum withdrawal limit is $${wConfig.minAmount.toLocaleString('en-US')} USD.`,
        },
        { status: 400 }
      );
    }

    if (wConfig.maxAmount > 0 && parsedAmount > wConfig.maxAmount) {
      return NextResponse.json(
        {
          success: false,
          limitError: true,
          error: `Maximum withdrawal limit per transaction is $${wConfig.maxAmount.toLocaleString('en-US')} USD.`,
        },
        { status: 400 }
      );
    }

    if (wConfig.dailyLimit > 0) {
      const dailyTotal = await getDailyWithdrawnTotal();
      if (dailyTotal + parsedAmount > wConfig.dailyLimit) {
        const remaining = Math.max(0, Number((wConfig.dailyLimit - dailyTotal).toFixed(2)));
        return NextResponse.json(
          {
            success: false,
            limitError: true,
            error: `Exceeds 24-hour daily withdrawal limit of $${wConfig.dailyLimit.toLocaleString('en-US')} USD ($${remaining.toLocaleString('en-US')} remaining).`,
          },
          { status: 400 }
        );
      }
    }

    // 3. Check available liquidated balance
    const availableBalance = await getLiquidatedBalance();
    if (availableBalance <= 0) {
      return NextResponse.json(
        {
          success: false,
          noLiquidatedCapital: true,
          error: 'No liquidated capital available for disbursement. Please liquidate shares from your equity holdings before requesting a withdrawal.',
        },
        { status: 400 }
      );
    }

    if (parsedAmount > availableBalance) {
      return NextResponse.json(
        {
          success: false,
          error: `Requested amount ($${parsedAmount.toLocaleString()}) exceeds your available liquidated balance ($${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}). Please liquidate additional shares first.`,
        },
        { status: 400 }
      );
    }

    // 5. Strict on-chain address validation if crypto rail is selected
    const cryptoAsset = (asset || 'USDT') as 'USDT' | 'BTC' | 'ETH';
    const cryptoNetwork = network || (cryptoAsset === 'USDT' ? 'TRC20' : cryptoAsset === 'BTC' ? 'Native' : 'ERC20');
    const targetAddress = (recipientAddress || destination || '').trim();

    if (selectedRail === 'crypto') {
      const validation = validateCryptoAddress(cryptoAsset, cryptoNetwork, targetAddress);
      if (!validation.valid) {
        return NextResponse.json(
          {
            success: false,
            validationError: true,
            error: validation.error || 'Invalid crypto destination address.',
            instruction: validation.instruction,
            detectedFormat: validation.detectedFormat,
          },
          { status: 400 }
        );
      }
    }

    const ipAddress =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '::1';
    const userAgent = req.headers.get('user-agent');
    const deviceName = parseDeviceFromUserAgent(userAgent);

    const finalDestination =
      selectedRail === 'crypto'
        ? `${cryptoAsset} (${cryptoNetwork}): ${targetAddress}`
        : targetAddress || 'Unspecified bank account';

    // 4. Log the user request as pending for administrative review & transfer
    const recorded = await logWithdrawalAttempt({
      amount: parsedAmount,
      rail: selectedRail,
      beneficiary: beneficiary || 'Declan Salo',
      destination: finalDestination,
      status: 'pending',
      statusReason: 'Awaiting administrative transfer & clearance',
      ipAddress,
      deviceName,
      asset: cryptoAsset,
      network: cryptoNetwork,
      walletAddress: targetAddress,
      userEmail: userEmail || 'declansalo1@gmail.com',
    });

    const remainingAfter = Math.max(0, availableBalance - parsedAmount);

    // 5. Automatically alert the configured admin email(s)
    try {
      await sendAdminWithdrawalNotificationEmail(recorded, remainingAfter);
    } catch (emailErr) {
      console.error('[WITHDRAWAL_ADMIN_ALERT] Email dispatch error:', emailErr);
    }

    return NextResponse.json({
      success: true,
      blocked: false,
      message: 'Withdrawal request submitted successfully and dispatched to admin queue.',
      record: recorded,
      remainingBalance: remainingAfter,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process withdrawal request' },
      { status: 500 }
    );
  }
}
