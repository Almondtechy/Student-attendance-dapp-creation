"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { getProofContract } from "@/lib/contract";
import { ethers } from "ethers";

export default function MarkAttendance() {
  const { address } = useWallet();
  const [isMarking, setIsMarking] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleMarkAttendance = useCallback(async () => {
    if (!address) return;

    setIsMarking(true);
    setError(null);
    setTxHash(null);

    try {
      // Generate a unique hash for this attendance record
      const timestamp = Date.now();
      const message = ethers.solidityPackedKeccak256(
        ["address", "uint256"],
        [address, timestamp]
      );

      // Store proof on-chain
      const contract = await getProofContract();
      const tx = await contract.storeProof(message);

      // Wait for confirmation
      const receipt = await tx.wait();

      setTxHash(receipt?.hash || tx.hash);
      setShowConfirm(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to mark attendance";
      // Don't show "user rejected" as an error - it's user-initiated
      if (message.includes("user rejected") || message.includes("User denied")) {
        setError(null);
      } else if (
        message.includes("Contract address not set") ||
        message.includes("NEXT_PUBLIC_PROOF_ADDRESS")
      ) {
        setError(
          "Contract address not configured. Set NEXT_PUBLIC_PROOF_ADDRESS in your .env file."
        );
      } else {
        setError(message);
      }
    } finally {
      setIsMarking(false);
    }
  }, [address]);

  if (!address) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Mark Attendance
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Store your attendance proof on the blockchain
          </p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
          </svg>
        </div>
      </div>

      {!showConfirm && !txHash && (
        <button
          onClick={() => setShowConfirm(true)}
          disabled={isMarking}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed shadow-lg shadow-blue-600/20"
        >
          {isMarking ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Storing Proof...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
              Mark Attendance
            </span>
          )}
        </button>
      )}

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Confirm Attendance
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                This will store a proof of your attendance on the blockchain. A small gas fee will be required.
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleMarkAttendance}
                  disabled={isMarking}
                  className="flex-1 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white text-sm font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  {isMarking ? "Confirming..." : "Confirm & Pay Gas"}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={isMarking}
                  className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success State */}
      {txHash && !showConfirm && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                Attendance Marked Successfully! 🎉
              </p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 truncate">
                Tx: {txHash}
              </p>
            </div>
          </div>
          <button
            onClick={() => { setTxHash(null); setShowConfirm(false); }}
            className="mt-3 w-full text-sm text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/40 hover:bg-emerald-200 dark:hover:bg-emerald-900/60 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Mark Another
          </button>
        </div>
      )}

      {/* Error State */}
      {error && !showConfirm && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 dark:bg-red-900/40 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                Failed to mark attendance
              </p>
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                {error}
              </p>
            </div>
          </div>
          <button
            onClick={() => setError(null)}
            className="mt-3 text-sm text-red-700 dark:text-red-300 hover:text-red-800 dark:hover:text-red-200 font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
