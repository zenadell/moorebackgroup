import { NextRequest, NextResponse } from 'next/server';
import {
  checkBtcAddress,
  checkTronUsdtAddress,
  checkEthereumAddress,
  lookupTransactionHash,
  validateCryptoAddress,
} from '@/lib/crypto/blockchain';
import { getCryptoConfig } from '@/lib/crypto/config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asset, network, address, txHash } = body as {
      asset: 'USDT' | 'BTC' | 'ETH';
      network?: 'TRC20' | 'ERC20' | string;
      address?: string;
      txHash?: string;
    };

    if (!asset || !['USDT', 'BTC', 'ETH'].includes(asset)) {
      return NextResponse.json({ success: false, error: 'Invalid crypto asset specified.' }, { status: 400 });
    }

    const config = await getCryptoConfig();
    const resolvedNetwork = network || (asset === 'USDT' ? 'TRC20' : 'MAINNET');

    // Determine target address
    let targetAddress = (address || '').trim();
    if (!targetAddress) {
      if (asset === 'USDT') {
        targetAddress = resolvedNetwork === 'TRC20' ? config.addresses.USDT_TRC20 : config.addresses.USDT_ERC20;
      } else if (asset === 'BTC') {
        targetAddress = config.addresses.BTC;
      } else if (asset === 'ETH') {
        targetAddress = config.addresses.ETH;
      }
    }

    // 1. If user provided a specific Transaction Hash (TxID) to look up:
    if (txHash && txHash.trim().length > 0) {
      const lookup = await lookupTransactionHash(asset, resolvedNetwork, targetAddress, txHash.trim());
      return NextResponse.json({
        success: true,
        mode: 'tx_lookup',
        result: lookup,
      });
    }

    // 2. Validate target address format before executing live on-chain scan
    const validation = validateCryptoAddress(asset, resolvedNetwork, targetAddress);
    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: validation.error || 'Invalid address format.',
        },
        { status: 400 }
      );
    }

    // 3. Query real on-chain blockchain data
    let result;
    if (asset === 'BTC') {
      result = await checkBtcAddress(targetAddress);
    } else if (asset === 'USDT') {
      if (resolvedNetwork === 'TRC20') {
        result = await checkTronUsdtAddress(targetAddress);
      } else {
        result = await checkEthereumAddress('USDT', targetAddress);
      }
    } else {
      // ETH
      result = await checkEthereumAddress('ETH', targetAddress);
    }

    return NextResponse.json({
      success: true,
      mode: 'address_scan',
      result,
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: `Blockchain query failed: ${err.message || 'Unknown network error'}`,
      },
      { status: 500 }
    );
  }
}
