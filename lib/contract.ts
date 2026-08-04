import { ethers } from "ethers";
import ProofStorageABI from "./abis/ProofStorage.json";

export const getProofContract = async () => {
  if (typeof window === "undefined") {
    throw new Error("Must be used in browser");
  }
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  const contractAddress = process.env.NEXT_PUBLIC_PROOF_ADDRESS;
  if (!contractAddress) {
    throw new Error("Contract address not set in .env");
  }
  return new ethers.Contract(contractAddress, ProofStorageABI.abi, signer);
};

/**
 * Read-only on-chain check: returns true when `hash` is recorded in the
 * deployed ProofStorage contract. Uses the connected wallet's provider, so
 * no gas is spent and no transaction is sent.
 */
export const verifyProofOnChain = async (hash: string): Promise<boolean> => {
  if (typeof window === "undefined") {
    throw new Error("Must be used in browser");
  }
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed");
  }
  const provider = new ethers.BrowserProvider(window.ethereum);
  const contractAddress = process.env.NEXT_PUBLIC_PROOF_ADDRESS;
  if (!contractAddress) {
    throw new Error("Contract address not set in .env");
  }
  const contract = new ethers.Contract(
    contractAddress,
    ProofStorageABI.abi,
    provider
  );
  return contract.verifyProof(hash);
};
