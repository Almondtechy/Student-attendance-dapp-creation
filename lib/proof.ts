import { ethers } from "ethers";
import ProofStorageABI from "./abis/ProofStorage.json";

/**
 * Attempts to record an attendance proof on-chain using the server-side
 * signer (the contract owner or an authorized marker from .env).
 *
 * Returns the proof hash when the transaction succeeded, or null when
 * on-chain attestation is not configured (missing PRIVATE_KEY / RPC_URL /
 * NEXT_PUBLIC_PROOF_ADDRESS) or fails — in which case the attendance record
 * stays off-chain in the database.
 */
export async function attestProofOnChain(
  proofHash: string,
  studentAddress: string
): Promise<string | null> {
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.RPC_URL;
  const contractAddress = process.env.NEXT_PUBLIC_PROOF_ADDRESS;

  if (!privateKey || !rpcUrl || !contractAddress) {
    return null;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);
    const contract = new ethers.Contract(
      contractAddress,
      ProofStorageABI.abi,
      wallet
    );
    const tx = await contract.storeProof(proofHash, studentAddress);
    await tx.wait();
    return proofHash;
  } catch (error) {
    console.error("Failed to attest proof on-chain:", error);
    return null;
  }
}
