export interface BlockchainVerificationResult {
  asset: 'USDT' | 'BTC' | 'ETH';
  network: string;
  address: string;
  hasDeposit: boolean;
  checkedAt: string;
  source: string;
  balance?: number;
  transactions: Array<{
    txId: string;
    amount: number;
    symbol: string;
    confirmations: number;
    status: 'mempool' | 'confirmed';
    timestamp: number;
    from?: string;
    to: string;
    explorerUrl: string;
    blockHeight?: number;
  }>;
  summary: {
    totalReceived: number;
    unconfirmedCount: number;
    confirmedCount: number;
    statusMessage: string;
  };
}

export interface TxLookupResult {
  found: boolean;
  validForVault: boolean;
  asset: 'USDT' | 'BTC' | 'ETH';
  network: string;
  txId: string;
  amount?: number;
  confirmations?: number;
  status?: 'mempool' | 'confirmed';
  from?: string;
  to?: string;
  timestamp?: number;
  explorerUrl?: string;
  message: string;
}

// -------------------------------------------------------------
// Address format validation
// -------------------------------------------------------------
export function validateCryptoAddress(asset: 'USDT' | 'BTC' | 'ETH', network: string, address: string): { valid: boolean; error?: string } {
  if (!address || typeof address !== 'string' || address.trim().length === 0) {
    return { valid: false, error: 'Address cannot be empty.' };
  }
  const clean = address.trim();

  if (asset === 'USDT') {
    if (network === 'TRC20') {
      if (!/^T[a-km-zA-HJ-NP-Z1-9]{33}$/.test(clean)) {
        return { valid: false, error: 'Invalid Tron (TRC-20) address format. Must start with "T" and be 34 characters base58.' };
      }
    } else {
      if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
        return { valid: false, error: 'Invalid Ethereum (ERC-20) address format. Must start with "0x" and be 42 characters hex.' };
      }
    }
  } else if (asset === 'BTC') {
    const isBech32 = /^bc1[a-z0-9]{25,62}$/i.test(clean);
    const isBase58 = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(clean);
    if (!isBech32 && !isBase58) {
      return { valid: false, error: 'Invalid Bitcoin address. Must start with "bc1" (SegWit), "1" (Legacy), or "3" (Script).' };
    }
  } else if (asset === 'ETH') {
    if (!/^0x[a-fA-F0-9]{40}$/.test(clean)) {
      return { valid: false, error: 'Invalid Ethereum address. Must start with "0x" and be 42 characters hex.' };
    }
  }

  return { valid: true };
}

// -------------------------------------------------------------
// BITCOIN (mempool.space)
// -------------------------------------------------------------
export async function checkBtcAddress(address: string): Promise<BlockchainVerificationResult> {
  const clean = address.trim();
  const checkedAt = new Date().toISOString();

  try {
    // 1. Get current tip height for confirmation math
    let tipHeight = 880000;
    try {
      const tipRes = await fetch('https://mempool.space/api/blocks/tip/height', { cache: 'no-store' });
      if (tipRes.ok) {
        tipHeight = parseInt(await tipRes.text(), 10) || tipHeight;
      }
    } catch {
      // Fallback tip
    }

    // 2. Fetch address stats & recent transactions
    const [statsRes, txsRes] = await Promise.all([
      fetch(`https://mempool.space/api/address/${clean}`, { cache: 'no-store' }),
      fetch(`https://mempool.space/api/address/${clean}/txs`, { cache: 'no-store' }),
    ]);

    if (!txsRes.ok) {
      return {
        asset: 'BTC',
        network: 'Bitcoin Native (SegWit)',
        address: clean,
        hasDeposit: false,
        checkedAt,
        source: 'mempool.space',
        balance: 0,
        transactions: [],
        summary: {
          totalReceived: 0,
          unconfirmedCount: 0,
          confirmedCount: 0,
          statusMessage: 'No incoming transactions detected on the Bitcoin blockchain for this address.',
        },
      };
    }

    const txsData = (await txsRes.json()) as any[];
    let balanceBtc = 0;

    if (statsRes.ok) {
      const stats = await statsRes.json();
      const fundedSats = (stats.chain_stats?.funded_txo_sum || 0) + (stats.mempool_stats?.funded_txo_sum || 0);
      const spentSats = (stats.chain_stats?.spent_txo_sum || 0) + (stats.mempool_stats?.spent_txo_sum || 0);
      balanceBtc = Math.max(0, (fundedSats - spentSats) / 1e8);
    }

    const detectedTxs: BlockchainVerificationResult['transactions'] = [];

    for (const tx of txsData) {
      // Find incoming outputs
      const incomingOutputs = (tx.vout || []).filter(
        (v: any) => v.scriptpubkey_address?.toLowerCase() === clean.toLowerCase()
      );

      if (incomingOutputs.length > 0) {
        const totalOutputSats = incomingOutputs.reduce((acc: number, v: any) => acc + (v.value || 0), 0);
        const amountBtc = totalOutputSats / 1e8;

        const isConfirmed = !!tx.status?.confirmed;
        const blockHeight = tx.status?.block_height;
        const confirmations = isConfirmed && blockHeight ? Math.max(1, tipHeight - blockHeight + 1) : 0;
        const timestamp = tx.status?.block_time ? tx.status.block_time * 1000 : Date.now();

        detectedTxs.push({
          txId: tx.txid,
          amount: amountBtc,
          symbol: 'BTC',
          confirmations,
          status: isConfirmed ? 'confirmed' : 'mempool',
          timestamp,
          to: clean,
          explorerUrl: `https://mempool.space/tx/${tx.txid}`,
          blockHeight,
        });
      }
    }

    const unconfirmedCount = detectedTxs.filter((t) => t.status === 'mempool').length;
    const confirmedCount = detectedTxs.filter((t) => t.status === 'confirmed').length;
    const totalReceived = detectedTxs.reduce((sum, t) => sum + t.amount, 0);

    return {
      asset: 'BTC',
      network: 'Bitcoin Native (SegWit)',
      address: clean,
      hasDeposit: detectedTxs.length > 0,
      checkedAt,
      source: 'mempool.space',
      balance: balanceBtc,
      transactions: detectedTxs,
      summary: {
        totalReceived,
        unconfirmedCount,
        confirmedCount,
        statusMessage:
          detectedTxs.length > 0
            ? `Found ${detectedTxs.length} real on-chain transaction(s) totaling ${totalReceived.toFixed(6)} BTC.`
            : 'No incoming transactions detected on the Bitcoin blockchain. Awaiting broadcast.',
      },
    };
  } catch (err: any) {
    return {
      asset: 'BTC',
      network: 'Bitcoin Native (SegWit)',
      address: clean,
      hasDeposit: false,
      checkedAt,
      source: 'mempool.space (offline)',
      balance: 0,
      transactions: [],
      summary: {
        totalReceived: 0,
        unconfirmedCount: 0,
        confirmedCount: 0,
        statusMessage: `Could not query Bitcoin blockchain: ${err.message || 'Network error'}`,
      },
    };
  }
}

// -------------------------------------------------------------
// TRON (USDT TRC-20)
// -------------------------------------------------------------
const TRON_USDT_CONTRACT = 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';

export async function checkTronUsdtAddress(address: string): Promise<BlockchainVerificationResult> {
  const clean = address.trim();
  const checkedAt = new Date().toISOString();

  try {
    let rawTransfers: any[] = [];
    let querySource = 'trongrid.io';

    // 1. Try TronGrid
    try {
      const url = `https://api.trongrid.io/v1/accounts/${clean}/transactions/trc20?contract_address=${TRON_USDT_CONTRACT}&limit=20`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.data && Array.isArray(json.data)) {
          rawTransfers = json.data;
        }
      }
    } catch {
      // TronGrid failed, try fallback
    }

    // 2. Fallback to TronScan API
    if (rawTransfers.length === 0) {
      try {
        const fallbackUrl = `https://apilist.tronscanapi.com/api/transfer/trc20?address=${clean}&trc20Id=${TRON_USDT_CONTRACT}&limit=15&direction=1`;
        const res = await fetch(fallbackUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' },
          cache: 'no-store',
        });
        if (res.ok) {
          const json = await res.json();
          if (json.token_transfers && Array.isArray(json.token_transfers)) {
            rawTransfers = json.token_transfers;
            querySource = 'tronscan.org';
          }
        }
      } catch {
        // Fallback failed
      }
    }

    const detectedTxs: BlockchainVerificationResult['transactions'] = [];

    for (const item of rawTransfers) {
      const toAddr = item.to_address || item.to;
      if (toAddr && toAddr.toLowerCase() === clean.toLowerCase()) {
        const rawVal = item.quant || item.value || '0';
        const decimals = item.tokenInfo?.tokenDecimal || item.token_info?.decimals || 6;
        const amountUsdt = Number(rawVal) / Math.pow(10, decimals);
        const txId = item.transaction_id || item.tx_id || item.hash;
        const blockTimestamp = item.block_timestamp || item.timestamp || Date.now();
        const fromAddr = item.from_address || item.from;

        if (txId && amountUsdt > 0) {
          detectedTxs.push({
            txId,
            amount: amountUsdt,
            symbol: 'USDT',
            confirmations: item.confirmed !== false ? 1 : 0,
            status: item.confirmed !== false ? 'confirmed' : 'mempool',
            timestamp: blockTimestamp,
            from: fromAddr,
            to: clean,
            explorerUrl: `https://tronscan.org/#/transaction/${txId}`,
          });
        }
      }
    }

    const totalReceived = detectedTxs.reduce((sum, t) => sum + t.amount, 0);

    return {
      asset: 'USDT',
      network: 'Tron (TRC-20)',
      address: clean,
      hasDeposit: detectedTxs.length > 0,
      checkedAt,
      source: querySource,
      balance: totalReceived,
      transactions: detectedTxs,
      summary: {
        totalReceived,
        unconfirmedCount: detectedTxs.filter((t) => t.status === 'mempool').length,
        confirmedCount: detectedTxs.filter((t) => t.status === 'confirmed').length,
        statusMessage:
          detectedTxs.length > 0
            ? `Found ${detectedTxs.length} real TRC-20 USDT deposit(s) totaling ${totalReceived.toFixed(2)} USDT.`
            : 'No incoming USDT (TRC-20) transfers detected on Tron. Awaiting mempool broadcast.',
      },
    };
  } catch (err: any) {
    return {
      asset: 'USDT',
      network: 'Tron (TRC-20)',
      address: clean,
      hasDeposit: false,
      checkedAt,
      source: 'TronGrid/TronScan',
      balance: 0,
      transactions: [],
      summary: {
        totalReceived: 0,
        unconfirmedCount: 0,
        confirmedCount: 0,
        statusMessage: `Could not query Tron blockchain: ${err.message || 'Network error'}`,
      },
    };
  }
}

// -------------------------------------------------------------
// ETHEREUM (ETH & USDT ERC-20)
// -------------------------------------------------------------
const ETH_USDT_CONTRACT = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const ETH_RPCS = [
  'https://ethereum-rpc.publicnode.com',
  'https://eth.drpc.org',
  'https://rpc.mevblocker.io',
];

export async function checkEthereumAddress(
  asset: 'ETH' | 'USDT',
  address: string
): Promise<BlockchainVerificationResult> {
  const clean = address.trim();
  const checkedAt = new Date().toISOString();
  const isUsdt = asset === 'USDT';

  try {
    let detectedTxs: BlockchainVerificationResult['transactions'] = [];
    let liveBalance = 0;
    let querySource = 'Blockscout / Publicnode RPC';

    if (isUsdt) {
      // 1. Check ERC-20 token transfers on Blockscout
      try {
        const url = `https://eth.blockscout.com/api/v2/addresses/${clean}/token-transfers?type=ERC-20`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.items && Array.isArray(json.items)) {
            for (const item of json.items) {
              const contractAddr = (item.token?.address_hash || item.token?.address || '').toLowerCase();
              const toAddr = (item.to?.hash || item.to || '').toLowerCase();

              if (contractAddr === ETH_USDT_CONTRACT && toAddr === clean.toLowerCase()) {
                const decimals = item.token?.decimals ? parseInt(item.token.decimals, 10) : 6;
                const rawVal = item.total?.value || item.value || '0';
                const amount = Number(rawVal) / Math.pow(10, decimals);
                const txHash = item.transaction_hash;
                const timestamp = item.timestamp ? new Date(item.timestamp).getTime() : Date.now();

                detectedTxs.push({
                  txId: txHash,
                  amount,
                  symbol: 'USDT',
                  confirmations: 12,
                  status: 'confirmed',
                  timestamp,
                  from: item.from?.hash || item.from,
                  to: clean,
                  explorerUrl: `https://etherscan.io/tx/${txHash}`,
                });
              }
            }
          }
        }
      } catch {
        // Fall through to RPC check
      }

      // 2. Query On-Chain USDT Balance via RPC
      try {
        const cleanPadded = clean.toLowerCase().replace('0x', '').padStart(64, '0');
        const callData = '0x70a08231' + cleanPadded;

        for (const rpc of ETH_RPCS) {
          try {
            const rpcRes = await fetch(rpc, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                method: 'eth_call',
                params: [{ to: '0xdAC17F958D2ee523a2206206994597C13D831ec7', data: callData }, 'latest'],
                id: 1,
              }),
            });
            if (rpcRes.ok) {
              const rpcJson = await rpcRes.json();
              if (rpcJson.result && rpcJson.result !== '0x') {
                liveBalance = Number(BigInt(rpcJson.result)) / 1e6;
                break;
              }
            }
          } catch {
            continue;
          }
        }
      } catch {
        // RPC failed
      }
    } else {
      // Native ETH
      // 1. Check transactions on Blockscout
      try {
        const url = `https://eth.blockscout.com/api/v2/addresses/${clean}/transactions`;
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const json = await res.json();
          if (json.items && Array.isArray(json.items)) {
            for (const item of json.items) {
              const toAddr = (item.to?.hash || item.to || '').toLowerCase();
              if (toAddr === clean.toLowerCase() && item.value && item.value !== '0') {
                const amount = Number(item.value) / 1e18;
                const confirmations = item.confirmations || 12;
                const timestamp = item.timestamp ? new Date(item.timestamp).getTime() : Date.now();

                detectedTxs.push({
                  txId: item.hash,
                  amount,
                  symbol: 'ETH',
                  confirmations,
                  status: 'confirmed',
                  timestamp,
                  from: item.from?.hash || item.from,
                  to: clean,
                  explorerUrl: `https://etherscan.io/tx/${item.hash}`,
                  blockHeight: item.block_number,
                });
              }
            }
          }
        }
      } catch {
        // Fall through to RPC check
      }

      // 2. Query Live ETH Balance via RPC
      for (const rpc of ETH_RPCS) {
        try {
          const rpcRes = await fetch(rpc, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0',
              method: 'eth_getBalance',
              params: [clean, 'latest'],
              id: 1,
            }),
          });
          if (rpcRes.ok) {
            const rpcJson = await rpcRes.json();
            if (rpcJson.result) {
              liveBalance = Number(BigInt(rpcJson.result)) / 1e18;
              break;
            }
          }
        } catch {
          continue;
        }
      }
    }

    const totalReceived = detectedTxs.reduce((sum, t) => sum + t.amount, 0);
    const hasDeposit = detectedTxs.length > 0 || liveBalance > 0;

    return {
      asset,
      network: isUsdt ? 'Ethereum (ERC-20)' : 'Ethereum Mainnet',
      address: clean,
      hasDeposit,
      checkedAt,
      source: querySource,
      balance: liveBalance,
      transactions: detectedTxs,
      summary: {
        totalReceived: totalReceived || liveBalance,
        unconfirmedCount: 0,
        confirmedCount: detectedTxs.length,
        statusMessage: hasDeposit
          ? `Found on-chain activity: ${totalReceived > 0 ? `${detectedTxs.length} transfer(s) totaling ${totalReceived.toFixed(4)} ${asset}` : `Current on-chain balance: ${liveBalance.toFixed(4)} ${asset}`}.`
          : `No incoming ${asset} transactions detected on Ethereum mainnet. Awaiting transaction broadcast.`,
      },
    };
  } catch (err: any) {
    return {
      asset,
      network: isUsdt ? 'Ethereum (ERC-20)' : 'Ethereum Mainnet',
      address: clean,
      hasDeposit: false,
      checkedAt,
      source: 'Ethereum RPC / Blockscout',
      balance: 0,
      transactions: [],
      summary: {
        totalReceived: 0,
        unconfirmedCount: 0,
        confirmedCount: 0,
        statusMessage: `Could not query Ethereum blockchain: ${err.message || 'Network error'}`,
      },
    };
  }
}

// -------------------------------------------------------------
// MANUAL TRANSACTION HASH / TXID LOOKUP
// -------------------------------------------------------------
export async function lookupTransactionHash(
  asset: 'USDT' | 'BTC' | 'ETH',
  network: string,
  vaultAddress: string,
  txHash: string
): Promise<TxLookupResult> {
  const cleanHash = txHash.trim();
  const cleanVault = vaultAddress.trim().toLowerCase();

  if (asset === 'BTC') {
    try {
      const res = await fetch(`https://mempool.space/api/tx/${cleanHash}`, { cache: 'no-store' });
      if (!res.ok) {
        return {
          found: false,
          validForVault: false,
          asset,
          network,
          txId: cleanHash,
          message: 'Transaction not found in Bitcoin mempool or blockchain blocks. Please verify the TxID.',
        };
      }
      const tx = await res.json();
      const matchVout = (tx.vout || []).find(
        (v: any) => v.scriptpubkey_address?.toLowerCase() === cleanVault
      );

      if (!matchVout) {
        return {
          found: true,
          validForVault: false,
          asset,
          network,
          txId: cleanHash,
          message: `Transaction found on Bitcoin network, but no outputs were addressed to vault (${vaultAddress}).`,
        };
      }

      const amountBtc = (matchVout.value || 0) / 1e8;
      return {
        found: true,
        validForVault: true,
        asset,
        network,
        txId: cleanHash,
        amount: amountBtc,
        status: tx.status?.confirmed ? 'confirmed' : 'mempool',
        confirmations: tx.status?.confirmed ? 2 : 0,
        timestamp: tx.status?.block_time ? tx.status.block_time * 1000 : Date.now(),
        to: vaultAddress,
        explorerUrl: `https://mempool.space/tx/${cleanHash}`,
        message: `Verified Bitcoin transaction! Real deposit of ${amountBtc} BTC detected.`,
      };
    } catch (e: any) {
      return {
        found: false,
        validForVault: false,
        asset,
        network,
        txId: cleanHash,
        message: `Error verifying Bitcoin transaction: ${e.message}`,
      };
    }
  }

  if (asset === 'USDT' && network === 'TRC20') {
    try {
      const res = await fetch(`https://apilist.tronscanapi.com/api/transaction-info?hash=${cleanHash}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        cache: 'no-store',
      });
      if (!res.ok) {
        return {
          found: false,
          validForVault: false,
          asset,
          network,
          txId: cleanHash,
          message: 'Transaction not found on Tron network. Check hash and try again.',
        };
      }
      const tx = await res.json();
      if (!tx.hash) {
        return {
          found: false,
          validForVault: false,
          asset,
          network,
          txId: cleanHash,
          message: 'Transaction hash was not recognized on Tron network.',
        };
      }

      // Check TRC20 transfer info
      const trc20Transfers = tx.trc20TransferInfo || [];
      const matchTransfer = trc20Transfers.find(
        (t: any) =>
          (t.to_address || '').toLowerCase() === cleanVault &&
          (t.contract_address || '').toLowerCase() === TRON_USDT_CONTRACT.toLowerCase()
      );

      if (!matchTransfer) {
        return {
          found: true,
          validForVault: false,
          asset,
          network,
          txId: cleanHash,
          message: `Transaction verified on Tron, but was not a USDT transfer to vault (${vaultAddress}).`,
        };
      }

      const amount = Number(matchTransfer.amount_str || matchTransfer.amount) / Math.pow(10, matchTransfer.decimals || 6);
      return {
        found: true,
        validForVault: true,
        asset,
        network,
        txId: cleanHash,
        amount,
        status: tx.confirmed ? 'confirmed' : 'mempool',
        confirmations: tx.confirmed ? 1 : 0,
        from: matchTransfer.from_address,
        to: vaultAddress,
        timestamp: tx.timestamp,
        explorerUrl: `https://tronscan.org/#/transaction/${cleanHash}`,
        message: `Verified TRC-20 USDT transaction! Real deposit of ${amount} USDT detected.`,
      };
    } catch (e: any) {
      return {
        found: false,
        validForVault: false,
        asset,
        network,
        txId: cleanHash,
        message: `Error verifying Tron transaction: ${e.message}`,
      };
    }
  }

  // Ethereum (ETH or USDT ERC20)
  try {
    const res = await fetch(`https://eth.blockscout.com/api/v2/transactions/${cleanHash}`, { cache: 'no-store' });
    if (!res.ok) {
      return {
        found: false,
        validForVault: false,
        asset,
        network,
        txId: cleanHash,
        message: 'Transaction not found on Ethereum blockchain. Please check the transaction hash.',
      };
    }
    const tx = await res.json();

    if (asset === 'ETH') {
      const toAddr = (tx.to?.hash || tx.to || '').toLowerCase();
      if (toAddr !== cleanVault) {
        return {
          found: true,
          validForVault: false,
          asset,
          network,
          txId: cleanHash,
          message: `Transaction found on Ethereum, but recipient does not match vault (${vaultAddress}).`,
        };
      }
      const amountEth = Number(tx.value || 0) / 1e18;
      return {
        found: true,
        validForVault: true,
        asset,
        network,
        txId: cleanHash,
        amount: amountEth,
        status: 'confirmed',
        confirmations: tx.confirmations || 12,
        from: tx.from?.hash || tx.from,
        to: vaultAddress,
        timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now(),
        explorerUrl: `https://etherscan.io/tx/${cleanHash}`,
        message: `Verified Ethereum transaction! Real deposit of ${amountEth} ETH detected.`,
      };
    } else {
      // USDT ERC-20
      const tokenTransfers = tx.token_transfers || [];
      const matchTransfer = tokenTransfers.find(
        (t: any) =>
          (t.to?.hash || '').toLowerCase() === cleanVault &&
          (t.token?.address_hash || '').toLowerCase() === ETH_USDT_CONTRACT
      );

      if (!matchTransfer) {
        return {
          found: true,
          validForVault: false,
          asset,
          network,
          txId: cleanHash,
          message: `Transaction found on Ethereum, but was not a USDT ERC-20 transfer to vault (${vaultAddress}).`,
        };
      }

      const amountUsdt = Number(matchTransfer.total?.value || matchTransfer.value || 0) / 1e6;
      return {
        found: true,
        validForVault: true,
        asset,
        network,
        txId: cleanHash,
        amount: amountUsdt,
        status: 'confirmed',
        confirmations: tx.confirmations || 12,
        from: matchTransfer.from?.hash,
        to: vaultAddress,
        timestamp: tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now(),
        explorerUrl: `https://etherscan.io/tx/${cleanHash}`,
        message: `Verified ERC-20 USDT transaction! Real deposit of ${amountUsdt} USDT detected.`,
      };
    }
  } catch (e: any) {
    return {
      found: false,
      validForVault: false,
      asset,
      network,
      txId: cleanHash,
      message: `Error verifying Ethereum transaction: ${e.message}`,
    };
  }
}
