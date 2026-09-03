import 'server-only';
import { somniaPublicClient } from '../somnia';

export type TxVerification = { ok: true } | { ok: false; reason: string };

/**
 * Cheap sanity check that `txHash` is a real, mined, successful transaction
 * sent by `walletAddress` — NOT a full re-verification of the CLOB fill
 * itself (that would duplicate the SDK's order-matching logic server-side,
 * for a service that holds no funds and gates nothing real). This rejects
 * a fabricated hash, a reverted transaction, and someone reporting another
 * wallet's transaction as their own; it does not prove the exact amount or
 * price claimed alongside it. SOMNIX's backend history is a best-effort
 * mirror — the real authorization for a claim is always the on-chain
 * redeem call itself.
 */
export async function verifyOnChainTx(txHash: string, walletAddress?: string | null): Promise<TxVerification> {
  if (!/^0x[0-9a-fA-F]{64}$/.test(txHash)) {
    return { ok: false, reason: 'txHash is not a well-formed transaction hash' };
  }

  try {
    const receipt = await somniaPublicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });

    if (receipt.status !== 'success') {
      return { ok: false, reason: 'transaction did not succeed on-chain' };
    }

    if (walletAddress && receipt.from.toLowerCase() !== walletAddress.toLowerCase()) {
      return { ok: false, reason: 'transaction sender does not match the reported wallet address' };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: 'transaction not found on-chain' };
  }
}
