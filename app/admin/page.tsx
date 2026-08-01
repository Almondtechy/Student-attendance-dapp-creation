"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useAdmin } from "@/hooks/useAdmin";
import ProtectedRoute from "@/components/ProtectedRoute";
import MarkerManager from "@/components/MarkerManager";
import AdminAttendanceTable from "@/components/AdminAttendanceTable";
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

export default function AdminPage() {
  const { address, signer } = useWallet();
  const { isAdmin, isLoading: isAdminStatusLoading } = useAdmin();
  const [records, setRecords] = useState<AdminAttendanceRecord[]>([]);
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAdminData = useCallback(async () => {
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
        )}`
      );
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load admin data");
      }

      setRecords(Array.isArray(data.records) ? data.records : []);
      setStats(data.stats ?? EMPTY_STATS);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to load admin data";
      setError(message);
      setRecords([]);
      setStats(EMPTY_STATS);
    } finally {
      setIsLoadingData(false);
    }
  }, [address, signer, isAdmin]);

  useEffect(() => {
    if (address && signer && isAdmin) {
      loadAdminData();
    }
  }, [address, signer, isAdmin, loadAdminData]);

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
