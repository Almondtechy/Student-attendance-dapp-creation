export type AttendanceStatus = "confirmed" | "pending" | "failed";

export interface AttendanceRecord {
  id: string;
  date: string;
  hashProof: string | null;
  status: AttendanceStatus;
}

export interface AdminAttendanceRecord extends AttendanceRecord {
  wallet: string;
  studentName?: string | null;
  studentEmail?: string | null;
}
