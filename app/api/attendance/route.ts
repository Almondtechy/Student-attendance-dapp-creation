import { ethers } from "ethers";
import { attestProofOnChain } from "@/lib/proof";
import { verifySignedRequest, WALLET_REGEX } from "@/lib/auth";
import { toAttendanceJson } from "@/lib/attendance";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get("wallet")?.toLowerCase() ?? "";

  if (!WALLET_REGEX.test(wallet)) {
    return Response.json(
      { error: "A valid wallet address is required" },
      { status: 400 }
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const records = await prisma.attendance.findMany({
      where: { wallet },
      orderBy: { date: "desc" },
    });
    return Response.json(records.map(toAttendanceJson));
  } catch (error) {
    console.error("Failed to fetch attendance:", error);
    return Response.json(
      { error: "Database not available. Make sure DATABASE_URL is set and prisma generate has been run." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
  let body: { wallet?: unknown; message?: unknown; signature?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const wallet = typeof body.wallet === "string" ? body.wallet.toLowerCase() : "";
  const message = typeof body.message === "string" ? body.message : "";
  const signature = typeof body.signature === "string" ? body.signature : "";

  // Prove the requester owns the wallet and the request is fresh
  const check = verifySignedRequest(wallet, message, signature, "Attendance request");
  if (!check.ok) {
    return Response.json({ error: check.error }, { status: check.status });
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    // Prevent double-marking on the same day
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    const existing = await prisma.attendance.findFirst({
      where: { wallet, date: { gte: startOfDay, lt: endOfDay } },
    });
    if (existing) {
      return Response.json(
        { error: "Attendance already marked today" },
        { status: 409 }
      );
    }

    // Create the DB record first, then attempt on-chain attestation so a
    // failed DB insert never leaves an orphaned on-chain proof.
    const proofHash = ethers.solidityPackedKeccak256(
      ["address", "uint256"],
      [wallet, Date.now()]
    );
    const record = await prisma.attendance.create({
      data: { wallet, date: now, hashProof: null },
    });

    const attestedHash = await attestProofOnChain(proofHash, wallet);
    const saved = attestedHash
      ? await prisma.attendance.update({
          where: { id: record.id },
          data: { hashProof: attestedHash },
        })
      : record;

    return Response.json(toAttendanceJson(saved), { status: 201 });
  } catch (error) {
    console.error("Failed to mark attendance:", error);
    return Response.json(
      { error: "Database not available. Make sure DATABASE_URL is set and prisma generate has been run." },
      { status: 503 }
    );
  }
}
