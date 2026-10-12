import { NextRequest, NextResponse } from 'next/server';
import { getAdminConfig, logWithdrawalAttempt } from '@/lib/admin/service';
import { parseDeviceFromUserAgent } from '@/lib/auth/serverStore';
import { validateCryptoAddress } from '@/lib/crypto/blockchain';

export async function GET() {
  try {
    const config = await getAdminConfig();
    return NextResponse.json({
      success: true,
      withdrawals: config.withdrawals,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to read withdrawal config' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const config = await getAdminConfig();
    const body = await req.json();
    const { amount, rail, beneficiary, destination, asset, network, recipientAddress } = body;

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid withdrawal amount.' },
        { status: 400 }
      );
    }

    // Strict on-chain address validation if crypto rail is selected
    if (rail === 'crypto') {
      const cryptoAsset = (asset || 'USDT') as 'USDT' | 'BTC' | 'ETH';
      const cryptoNetwork = network || (cryptoAsset === 'USDT' ? 'TRC20' : cryptoAsset === 'BTC' ? 'Native' : 'ERC20');
      const targetAddress = recipientAddress || destination;

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

    const isBlocked = !config.withdrawals.enabled;

    const finalDestination =
      rail === 'crypto'
        ? `${asset || 'USDT'} (${network || 'TRC20'}): ${recipientAddress || destination}`
        : destination || 'Unspecified account';

    // Log the actual attempt into persistent withdrawals log
    const recorded = await logWithdrawalAttempt({
      amount: parsedAmount,
      rail: rail || 'fedwire',
      beneficiary: beneficiary || 'Declan Salo',
      destination: finalDestination,
      status: isBlocked ? 'blocked' : 'pending',
      statusReason: isBlocked ? config.withdrawals.lockMessage : 'Awaiting administrative clearance',
      ipAddress,
      deviceName,
    });

    if (isBlocked) {
      return NextResponse.json(
        {
          success: false,
          blocked: true,
          error: config.withdrawals.lockMessage,
          recordId: recorded.id,
        },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      blocked: false,
      message: 'Withdrawal request submitted successfully and logged for compliance review.',
      record: recorded,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to process withdrawal request' },
      { status: 500 }
    );
  }
}
