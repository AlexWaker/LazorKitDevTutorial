import { Connection, PublicKey, TransactionInstruction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction as splCreateAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync as splGetAssociatedTokenAddressSync,
} from "@solana/spl-token";

// Re-export for callers that want to validate account owners / program IDs.
export { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID };

// Devnet USDC mint (Circle).
export const DEFAULT_USDC_MINT = new PublicKey(
  process.env.NEXT_PUBLIC_USDC_MINT ??
    // Devnet USDC mint (Circle).
    "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
);

export type SupportedCluster = "devnet" | "mainnet";

export function inferClusterFromRpcUrl(rpcUrl: string): SupportedCluster {
  const u = rpcUrl.toLowerCase();
  if (u.includes("mainnet")) return "mainnet";
  return "devnet";
}

/**
 * LazorKit / Paymaster usually covers fees, but SPL transfers still require users to
 * have the token (e.g. USDC). This helper returns the ATA for a given owner+mint.
 */
export function getAssociatedTokenAddressSync(
  mint: PublicKey,
  owner: PublicKey,
): PublicKey {
  // IMPORTANT: LazorKit smart wallets can be PDAs (off-curve), so we must set allowOwnerOffCurve=true.
  return splGetAssociatedTokenAddressSync(
    mint,
    owner,
    true,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export function validateRecipientAddress(recipient: string): {
  valid: boolean;
  address?: PublicKey;
  error?: string;
} {
  if (!recipient || recipient.trim() === "") {
    return { valid: false, error: "收款地址不能为空" };
  }
  try {
    const address = new PublicKey(recipient.trim());
    return { valid: true, address };
  } catch {
    return { valid: false, error: "收款地址格式不正确（base58）" };
  }
}

export function validateTransferAmount(amount: string, balance: number | null): {
  valid: boolean;
  amountNum?: number;
  error?: string;
} {
  const amountNum = Number(amount);
  if (!Number.isFinite(amountNum) || Number.isNaN(amountNum) || amountNum <= 0) {
    return { valid: false, error: "转账金额必须大于 0" };
  }
  if (balance != null && amountNum > balance) {
    return {
      valid: false,
      error: `余额不足：当前 ${balance.toFixed(2)} USDC`,
    };
  }
  return { valid: true, amountNum };
}

/**
 * Read USDC balance from ATA (SPL token account).
 * Token account layout: mint(32) + owner(32) + amount(u64 little-endian at offset 64).
 */
export async function getUsdcBalance(
  connection: Connection,
  owner: PublicKey,
  usdcMint: PublicKey = DEFAULT_USDC_MINT,
): Promise<number> {
  const tokenAccount = getAssociatedTokenAddressSync(usdcMint, owner);
  const info = await connection.getAccountInfo(tokenAccount, "confirmed");
  if (!info) return 0;
  const amount = Number(info.data.readBigUInt64LE(64));
  return amount / 1_000_000; // USDC has 6 decimals
}

export function createAssociatedTokenAccountInstruction(args: {
  payer: PublicKey;
  ata: PublicKey;
  owner: PublicKey;
  mint: PublicKey;
}): TransactionInstruction {
  return splCreateAssociatedTokenAccountInstruction(
    args.payer,
    args.ata,
    args.owner,
    args.mint,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  );
}

export async function buildUsdcTransferInstructions(args: {
  connection: Connection;
  sender: PublicKey;
  recipient: PublicKey;
  amountUsdc: number;
  usdcMint?: PublicKey;
}): Promise<TransactionInstruction[]> {
  const usdcMint = args.usdcMint ?? DEFAULT_USDC_MINT;
  const senderAta = getAssociatedTokenAddressSync(usdcMint, args.sender);
  const recipientAta = getAssociatedTokenAddressSync(usdcMint, args.recipient);

  const ixs: TransactionInstruction[] = [];
  const recipientAtaInfo = await args.connection.getAccountInfo(
    recipientAta,
    "confirmed",
  );
  if (!recipientAtaInfo) {
    ixs.push(
      createAssociatedTokenAccountInstruction({
        payer: args.sender,
        ata: recipientAta,
        owner: args.recipient,
        mint: usdcMint,
      }),
    );
  }

  const amountRaw = BigInt(Math.floor(args.amountUsdc * 1_000_000));
  if (amountRaw <= BigInt(0)) {
    throw new Error("转账金额过小（低于 0.000001 USDC）");
  }

  ixs.push(
    createTransferInstruction(
      senderAta,
      recipientAta,
      args.sender,
      amountRaw,
      [],
      TOKEN_PROGRAM_ID,
    ),
  );

  return ixs;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {},
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10_000,
    onRetry,
  } = options;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      lastError = e;
      if (attempt === maxRetries) break;
      onRetry?.(attempt, e);
      const delay = Math.min(
        initialDelayMs * Math.pow(2, attempt - 1),
        maxDelayMs,
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastError;
}

