import type { AttendanceRecord } from "@/types/attendance";

export function toAttendanceJson(record: {
  id: string;
  date: Date;
  hashProof: string | null;
}): AttendanceRecord {
  return {
    id: record.id,
    date: record.date.toISOString(),
    hashProof: record.hashProof,
    status: record.hashProof ? "confirmed" : "pending",
  };
}
