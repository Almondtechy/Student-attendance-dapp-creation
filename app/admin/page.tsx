"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAdmin } from "@/hooks/useAdmin";
import ProtectedRoute from "@/components/ProtectedRoute";
import MarkerManager from "@/components/MarkerManager";
import AdminAttendanceTable, {
  type AdminPagination,
} from "@/components/AdminAttendanceTable";
import type { AdminAttendanceRecord } from "@/types/attendance";

interface AdminStats {
  totalStudents: number;
  totalRecords: number;
  todayRecords: number;
}

const EMPTY_STATS: AdminStats = {
  totalStudents: 0,
  totalRecords: 0,
  todayRecords: 0,
};

const PAGE_SIZE = 10;

export default function AdminPage() {
  const { address, signer } = useWallet();
  const { isAdmin, isLoading: isAdminStatusLoading } = useAdmin();
  const [records, setRecords] = useState<AdminAttendanceRecord[]>([]);
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [pagination, setPagination] = useState<AdminPagination | null>(null);
  const [page, setPage] = useState(1);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryResult, setRetryResult] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const loadAdminData = useCallback(
    async (targetPage?: number) => {
      if (!address || !signer || !isAdmin) return;
      setIsLoadingData(true);
      setError(null);
      try {
        const timestamp = Date.now();
        const message = `Admin access: ${address}:${timestamp}`;
        const signature = await signer.signMessage(message);

        const res = await fetch(
          `/api/admin/attendance?wallet=${encodeURIComponent(
            address
          )}&message=${encodeURIComponent(message)}&signature=${encodeURIComponent(
            signature
          )}&page=${targetPage ?? page}&pageSize=${PAGE_SIZE}`
        );
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load admin data");
        }

        setRecords(Array.isArray(data.records) ? data.records : []);
        setStats(data.stats ?? EMPTY_STATS);
        setPagination(data.pagination ?? null);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Failed to load admin data";
        setError(message);
        setRecords([]);
        setStats(EMPTY_STATS);
        setPagination(null);
      } finally {
        setIsLoadingData(false);
      }
    },
    [address, signer, isAdmin, page]
  );

  const handlePageChange = useCallback(
    (nextPage: number) => {
      if (nextPage < 1) return;
      setPage(nextPage);
      void loadAdminData(nextPage);
    },
    [loadAdminData]
  );

  const handleExport = useCallback(async () => {
    if (!address || !signer || !isAdmin) return;
    setIsExporting(true);
    try {
      const timestamp = Date.now();
      const message = `Admin access: ${address}:${timestamp}`;
      const signature = await signer.signMessage(message);

      const res = await fetch(
        `/api/admin/attendance/export?wallet=${encodeURIComponent(
          address
        )}&message=${encodeURIComponent(message)}&signature=${encodeURIComponent(
          signature
        )}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to export attendance");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to export attendance";
      setError(message);
    } finally {
      setIsExporting(false);
    }
  }, [address, signer, isAdmin]);

  const handleRetryAttestations = useCallback(async () => {
    if (!address || !signer || !isAdmin) return;
    setIsRetrying(true);
    setRetryResult(null);
    try {
      const timestamp = Date.now();
      const message = `Admin attest: ${address}:${timestamp}`;
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/admin/attest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, message, signature }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to retry attestations");
      }

      setRetryResult(
        `Attested ${data.attested} of ${data.pending} pending record(s)` +
          (data.failed.length > 0 ? `; ${data.failed.length} still failed` : "")
      );
      await loadAdminData();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to retry attestations";
      setRetryResult(`Error: ${message}`);
    } finally {
      setIsRetrying(false);
    }
  }, [address, signer, isAdmin, loadAdminData]);

  useEffect(() => {
    if (address && signer && isAdmin) {
      loadAdminData(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, signer, isAdmin]);

  const statCards = [
    {
      label: "Total Students",
      value: stats.totalStudents,
      gradient: "from-blue-500 to-cyan-500",
      shadow: "shadow-blue-500/20",
    },
    {
      label: "Total Records",
      value: stats.totalRecords,
      gradient: "from-violet-500 to-purple-500",
      shadow: "shadow-violet-500/20",
    },
    {
      label: "Marked Today",
      value: stats.todayRecords,
      gradient: "from-emerald-500 to-green-500",
      shadow: "shadow-emerald-500/20",
    },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
          </div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Admin Dashboard
                </h1>
                <p className="mt-2 text-violet-100 text-sm sm:text-base max-w-xl">
                  Authorize teachers and review every student&apos;s on-chain
                  attendance proofs.
                </p>
              </div>
              {address && (
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-2.5">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm font-mono text-white/90">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-12">
          {isAdminStatusLoading ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-10 text-center">
              <div className="animate-pulse space-y-4">
                <div className="h-6 w-48 mx-auto bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="h-10 w-64 mx-auto bg-gray-200 dark:bg-gray-700 rounded" />
              </div>
            </div>
          ) : !isAdmin ? (
            /* Not admin — access denied */
            <div className="flex flex-col items-center justify-center min-h-[50vh] px-6">
              <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8 text-center">
                <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Access Restricted
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  Only the contract owner (the account that deployed
                  ProofStorage and holds the server PRIVATE_KEY) can access the
                  admin dashboard.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Failed to load admin data
                  </p>
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    {error}
                  </p>
                </div>
              )}

              {/* Attestation retry / backfill */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Retry pending attestations
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Re-attempts on-chain attestation for every pending record
                    (records that were saved off-chain when the RPC was down).
                  </p>
                  {retryResult && (
                    <p className="text-xs mt-1 text-blue-600 dark:text-blue-400">
                      {retryResult}
                    </p>
                  )}
                </div>
                <button
                  onClick={handleRetryAttestations}
                  disabled={isRetrying}
                  className="self-start sm:self-auto shrink-0 inline-flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-600/20 disabled:cursor-not-allowed"
                >
                  {isRetrying ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Retrying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                      </svg>
                      Retry Pending
                    </>
                  )}
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {statCards.map((stat) => (
                  <div
                    key={stat.label}
                    className={`relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1`}
                  >
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.gradient} rounded-t-2xl`}
                    />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Marker management + attendance */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1">
                  <MarkerManager />
                </div>
                <div className="lg:col-span-2">
                  <AdminAttendanceTable
                    records={records}
                    isLoading={isLoadingData}
                    pagination={pagination ?? undefined}
                    onPageChange={handlePageChange}
                    onExport={handleExport}
                    isExporting={isExporting}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
