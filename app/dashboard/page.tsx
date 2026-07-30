"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@/hooks/useWallet";
import ProtectedRoute from "@/components/ProtectedRoute";
import AttendanceStats from "@/components/AttendanceStats";
import MarkAttendance from "@/components/MarkAttendance";
import AttendanceList from "@/components/AttendanceList";

interface AttendanceRecord {
  id: string;
  date: string;
  hashProof: string | null;
  status: "confirmed" | "pending" | "failed";
}

// Demo data for development
const MOCK_RECORDS: AttendanceRecord[] = [
  {
    id: "1",
    date: "2026-07-28T09:00:00Z",
    hashProof: "0x7a9f3c8d2e1b5a4f6c0d8e3f2a1b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b",
    status: "confirmed",
  },
  {
    id: "2",
    date: "2026-07-27T09:00:00Z",
    hashProof: "0x3b2c1d0e9f8a7b6c5d4e3f2a1b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b0c",
    status: "confirmed",
  },
  {
    id: "3",
    date: "2026-07-25T09:00:00Z",
    hashProof: "0x9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a",
    status: "confirmed",
  },
  {
    id: "4",
    date: "2026-07-23T09:00:00Z",
    hashProof: null,
    status: "pending" as const,
  },
];

export default function DashboardPage() {
  const { address } = useWallet();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load attendance data
  useEffect(() => {
    if (!address) {
      setIsLoadingData(false);
      return;
    }

    // Using demo data for now. In production, fetch from /api/attendance
    // when the backend endpoint is created.
    const timer = setTimeout(() => {
      setRecords(MOCK_RECORDS);
      setIsLoadingData(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [address]);

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-900 dark:to-indigo-950">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white/[0.02] rounded-full blur-3xl" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  Attendance Dashboard
                </h1>
                <p className="mt-2 text-blue-100 text-sm sm:text-base max-w-xl">
                  Track your attendance records secured with on-chain proof of
                  participation.
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

        {/* Dashboard Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 pb-12">
          <div className="space-y-6">
            {/* Stats Cards */}
            <AttendanceStats
              totalClasses={12}
              attended={9}
              onChainProofs={7}
              isLoading={isLoadingData}
            />

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Mark Attendance */}
              <div className="lg:col-span-1">
                <MarkAttendance />
              </div>

              {/* Quick info cards */}
              <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Next Class
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        Today, 9:00 AM
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                    </svg>
                    Room 301 - Blockchain Lab
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        Attendance Streak
                      </p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">
                        {records.filter((r) => r.status === "confirmed").length} days
                      </p>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-gradient-to-r from-orange-500 to-rose-500 h-1.5 rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(
                          (records.filter((r) => r.status === "confirmed").length / 10) * 100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                    {10 - records.filter((r) => r.status === "confirmed").length} more to reach 10-day streak
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance History */}
            <AttendanceList records={records} isLoading={isLoadingData} />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
