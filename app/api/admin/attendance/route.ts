import { verifySignedRequest, isAdminWallet } from "@/lib/auth";
import { toAttendanceJson } from "@/lib/attendance";
import type { AdminAttendanceRecord } from "@/types/attendance";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase() ?? "";
  const message = searchParams.get("message") ?? "";
  const signature = searchParams.get("signature") ?? "";

  // Must be a fresh signature from the requesting wallet
  const check = verifySignedRequest(wallet, message, signature, "Admin access");
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: check.status });
  }

  // Only the contract owner (admin) may view all attendance
  if (!isAdminWallet(wallet)) {
    return Response.json(
      { error: "Not authorized — only the contract owner can view admin data" },
      { status: 403 }
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const rows = (await prisma.attendance.findMany({
      orderBy: { date: "desc" },
    })) as Array<{
      id: string;
      date: Date;
      hashProof: string | null;
      wallet: string;
    }>;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const records: AdminAttendanceRecord[] = rows.map((row) => ({
      ...toAttendanceJson(row),
      wallet: row.wallet,
    }));

    const stats = {
      totalStudents: new Set(rows.map((r) => r.wallet)).size,
      totalRecords: rows.length,
      todayRecords: rows.filter((r) => r.date >= today).length,
    };

    return Response.json({ records, stats });
  } catch (error) {
    console.error("Failed to fetch admin attendance:", error);
    return Response.json(
      { error: "Database not available. Make sure DATABASE_URL is set and prisma generate has been run." },
      { status: 503 }
    );
  }
}
