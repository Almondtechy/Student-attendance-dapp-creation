import { ethers } from "ethers";
import { attestProofOnChain } from "@/lib/proof";
import { verifySignedRequest, WALLET_REGEX } from "@/lib/auth";
import { toAttendanceJson } from "@/lib/attendance";
import { attendanceLimiter } from "@/lib/rateLimit";

/** True when `error` is a Prisma P2002 (unique constraint violation). */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

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

  // Per-wallet rate limit: cap how often one wallet can hit this endpoint so
  // a spammer can't drain the owner's gas on repeated on-chain attestations.
  // Applied AFTER signature verification so a spammer with a victim's address
  // can't exhaust a wallet it doesn't own (they'd need a valid signature).
  if (!attendanceLimiter.check(wallet)) {
    return Response.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    // Prevent double-marking on the same day. `dateKey` is the UTC day
    // (YYYY-MM-DD); the DB enforces @@unique([wallet, dateKey]) so two
    // concurrent requests can't both insert for the same wallet + day.
    const now = new Date();
    const dateKey = now.toISOString().slice(0, 10);

    const existing = await prisma.attendance.findFirst({
      where: { wallet, dateKey },
    });
    if (existing) {
      return Response.json(
        { error: "Attendance already marked today" },
        { status: 409 }
      );
    }

    // Create the DB record first, then attempt on-chain attestation so a
    // failed DB insert never leaves an orphaned on-chain proof.
    // The hash is derived from the record's `date` (which is stored), so a
    // later retry/backfill reproduces the identical hash.
    const proofHash = ethers.solidityPackedKeccak256(
      ["address", "uint256"],
      [wallet, now.getTime()]
    );

    // Link the record to the student's profile (if they've set one up).
    // This is best-effort — a profile is never required to mark attendance.
    let userId: string | null = null;
    try {
      const user = await prisma.user.findUnique({ where: { wallet } });
      userId = user?.id ?? null;
    } catch {
      userId = null;
    }

    let record;
    try {
      record = await prisma.attendance.create({
        data: { wallet, dateKey, date: now, hashProof: null, userId },
      });
    } catch (error) {
      // P2002 = unique (wallet, dateKey) violation: a concurrent request
      // slipped through the check above. Surface the same friendly 409.
      if (isUniqueConstraintError(error)) {
        return Response.json(
          { error: "Attendance already marked today" },
          { status: 409 }
        );
      }
      throw error;
    }

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
