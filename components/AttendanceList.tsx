"use client";

import VerifyProofButton from "./VerifyProofButton";
import type { AttendanceRecord } from "@/types/attendance";

interface AttendanceListProps {
  records: AttendanceRecord[];
  isLoading?: boolean;
}

function shortenHash(hash: string): string {
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AttendanceList({
  records,
  isLoading = false,
}: AttendanceListProps) {
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Attendance History
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Your recent attendance records
          </p>
        </div>
        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
          </svg>
        </div>
      </div>

      {records.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
            </svg>
          </div>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            No attendance records yet
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
            Mark your attendance to see it here
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 pb-3">
                  Date
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 pb-3">
                  Proof Hash
                </th>
                <th className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 pb-3">
                  On-Chain
                </th>
                <th className="text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-6 pb-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {records.map((record) => (
                <tr
                  key={record.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {formatDate(record.date)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {record.hashProof ? (
                      <code className="text-xs font-mono bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded-md">
                        {shortenHash(record.hashProof)}
                      </code>
                    ) : (
                      <span className="text-xs text-gray-400 italic">
                        No on-chain proof
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {record.hashProof ? (
                      <VerifyProofButton hashProof={record.hashProof} />
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {record.status === "confirmed" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        Confirmed
                      </span>
                    ) : record.status === "pending" ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                        Pending
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                        Failed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
