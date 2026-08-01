import { ethers } from "ethers";

export const WALLET_REGEX = /^0x[a-fA-F0-9]{40}$/;
const REQUEST_TTL_MS = 5 * 60 * 1000; // signatures expire after 5 minutes

/**
 * The contract owner's address, derived from the server's PRIVATE_KEY
 * (the same key that attests proofs on-chain). The owner is the admin.
 * Returns null when PRIVATE_KEY isn't configured.
 */
export function getOwnerAddress(): string | null {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) return null;
  try {
    return new ethers.Wallet(privateKey).address.toLowerCase();
  } catch {
    return null;
  }
}

export function isAdminWallet(wallet: string): boolean {
  const owner = getOwnerAddress();
  return !!owner && wallet.toLowerCase() === owner;
}

type VerifyResult = { ok: true } | { ok: false; error: string; status: number };

/**
 * Verifies that `signature` is a fresh signature over
 * `${prefix}: <wallet>:<timestamp>` produced by the wallet itself.
 * This proves wallet ownership and prevents replay.
 */
export function verifySignedRequest(
  wallet: string,
  message: string,
  signature: string,
  prefix: string
): VerifyResult {
  const normalizedWallet = wallet.toLowerCase();

  if (!WALLET_REGEX.test(normalizedWallet)) {
    return { ok: false, error: "A valid wallet address is required", status: 400 };
  }
  if (!message || !signature) {
    return { ok: false, error: "Message and signature are required", status: 400 };
  }

  let recovered: string;
  try {
    recovered = ethers.verifyMessage(message, signature).toLowerCase();
  } catch {
    return { ok: false, error: "Invalid signature", status: 401 };
  }
  if (recovered !== normalizedWallet) {
    return { ok: false, error: "Signature does not match wallet", status: 401 };
  }

  const match = new RegExp(
    `^${prefix}: (0x[a-fA-F0-9]{40}):(\\d+)$`
  ).exec(message);
  if (!match || match[1].toLowerCase() !== normalizedWallet) {
    return {
      ok: false,
      error: `Invalid ${prefix.toLowerCase()} message`,
      status: 401,
    };
  }

  const requestedAt = Number(match[2]);
  if (Math.abs(Date.now() - requestedAt) > REQUEST_TTL_MS) {
    return {
      ok: false,
      error: `${prefix} expired. Please try again.`,
      status: 401,
    };
  }

  return { ok: true };
}
