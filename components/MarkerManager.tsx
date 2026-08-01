"use client";

import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { useWallet } from "@/hooks/useWallet";
import { getProofContract } from "@/lib/contract";

const AUTHORIZED_TOPIC = ethers.id("MarkerAuthorized(address)");
const REVOKED_TOPIC = ethers.id("MarkerRevoked(address)");

export default function MarkerManager() {
  const { provider, signer } = useWallet();
  const [markers, setMarkers] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

  const contractAddress = process.env.NEXT_PUBLIC_PROOF_ADDRESS;

  const loadMarkers = useCallback(async () => {
    if (!provider || !contractAddress) {
      setNotConfigured(true);
      return;
    }
    setNotConfigured(false);
    try {
      // Derive the current marker set from MarkerAuthorized / MarkerRevoked events
      const logs = await provider.getLogs({
        address: contractAddress,
        topics: [[AUTHORIZED_TOPIC, REVOKED_TOPIC]],
        fromBlock: 0,
        toBlock: "latest",
      });

      const authorized = new Set<string>();
      const revoked = new Set<string>();
      for (const log of logs) {
        const marker = ethers.getAddress("0x" + log.topics[1].slice(26));
        if (log.topics[0] === AUTHORIZED_TOPIC) {
          authorized.add(marker);
        } else if (log.topics[0] === REVOKED_TOPIC) {
          revoked.add(marker);
        }
      }

      setMarkers([...authorized].filter((m) => !revoked.has(m)).sort());
      setError(null);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to load markers";
      setError(message);
    }
  }, [provider, contractAddress]);

  useEffect(() => {
    loadMarkers();
  }, [loadMarkers]);

  const runTx = useCallback(
    async (action: (contract: ethers.Contract) => Promise<ethers.TransactionResponse>) => {
      setIsBusy(true);
      setError(null);
      setTxHash(null);
      try {
        const contract = await getProofContract();
        const tx = await action(contract);
        const receipt = await tx.wait();
        setTxHash(receipt?.hash || tx.hash);
        await loadMarkers();
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Transaction failed";
        // User-initiated rejection is not an error
        if (
          message.includes("user rejected") ||
          message.includes("User denied") ||
          message.includes("ACTION_REJECTED")
        ) {
          setError(null);
        } else {
          setError(message);
        }
      } finally {
        setIsBusy(false);
      }
    },
    [loadMarkers]
  );

  const handleAuthorize = () => {
    const marker = input.trim();
    if (!ethers.isAddress(marker)) {
      setError("Enter a valid Ethereum address");
      return;
    }
    runTx((contract) => contract.authorizeMarker(marker));
    setInput("");
  };

  const handleRevoke = (marker: string) => {
    runTx((contract) => contract.revokeMarker(marker));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Manage Markers (Teachers)
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Authorize teachers to record on-chain attendance proofs
          </p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM3 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 9.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
          </svg>
        </div>
      </div>

      {notConfigured ? (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            Marker management requires a deployed ProofStorage contract. Set
            NEXT_PUBLIC_PROOF_ADDRESS in your .env file to enable it.
          </p>
        </div>
      ) : (
        <>
          <div className="flex gap-2 mb-6">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="0x... teacher wallet address"
              disabled={isBusy}
              className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
            />
            <button
              onClick={handleAuthorize}
              disabled={isBusy}
              className="bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-600/20 disabled:cursor-not-allowed"
            >
              {isBusy ? "Authorizing..." : "Authorize"}
            </button>
          </div>

          {signer ? (
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
              You are signing as{" "}
              <span className="font-mono">{signer.address.slice(0, 6)}...{signer.address.slice(-4)}</span>
            </p>
          ) : null}

          {txHash && (
            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Transaction confirmed ✓
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                Tx: {txHash}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Failed to update markers
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
          )}

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Current markers ({markers.length})
            </p>
            {markers.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500">
                No markers authorized yet. Only the contract owner can
                authorize markers.
              </p>
            ) : (
              <ul className="space-y-2">
                {markers.map((marker) => (
                  <li
                    key={marker}
                    className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-2.5"
                  >
                    <code className="text-xs font-mono text-gray-700 dark:text-gray-300">
                      {marker.slice(0, 6)}...{marker.slice(-4)}
                    </code>
                    <button
                      onClick={() => handleRevoke(marker)}
                      disabled={isBusy}
                      className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
