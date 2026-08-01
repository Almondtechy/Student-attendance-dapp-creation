import { describe, it, expect, vi, beforeEach } from "vitest";
import { ethers } from "ethers";
import { POST, GET } from "../route";

const { prismaMock, attestMock, limiterMock } = vi.hoisted(() => ({
  prismaMock: {
    attendance: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  attestMock: vi.fn(),
  limiterMock: { check: vi.fn(() => true) },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/proof", () => ({ attestProofOnChain: attestMock }));
vi.mock("@/lib/rateLimit", () => ({ attendanceLimiter: limiterMock }));

const WALLET = ethers.Wallet.createRandom();
const WALLET_ADDRESS = WALLET.address;

/** Builds a genuinely signed "Attendance request: <wallet>:<ts>" body. */
function signedBody(timestamp: number = Date.now()) {
  const message = `Attendance request: ${WALLET_ADDRESS}:${timestamp}`;
  const signature = WALLET.signMessageSync(message);
  return { wallet: WALLET_ADDRESS, message, signature };
}

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of Object.values(prismaMock.attendance)) {
    fn.mockReset();
  }
  attestMock.mockReset();
  limiterMock.check.mockReset();
  limiterMock.check.mockReturnValue(true);
});

describe("POST /api/attendance", () => {
  describe("signature verification", () => {
    it("rejects an invalid wallet address", async () => {
      const res = await post({
        wallet: "not-an-address",
        message: "Attendance request: not-an-address:123",
        signature: "0x",
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "A valid wallet address is required",
      });
    });

    it("rejects a missing message or signature", async () => {
      const res = await post({ wallet: WALLET_ADDRESS });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({
        error: "Message and signature are required",
      });
    });

    it("rejects a malformed signature", async () => {
      const { message } = signedBody();
      const res = await post({
        wallet: WALLET_ADDRESS,
        message,
        signature: "0xdeadbeef",
      });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: "Invalid signature" });
    });

    it("rejects a signature produced by a different wallet", async () => {
      const otherWallet = ethers.Wallet.createRandom();
      const message = `Attendance request: ${WALLET_ADDRESS}:${Date.now()}`;
      const signature = otherWallet.signMessageSync(message);
      const res = await post({ wallet: WALLET_ADDRESS, message, signature });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        error: "Signature does not match wallet",
      });
    });

    it("rejects a valid signature over the wrong message format", async () => {
      const message = "some random message";
      const signature = WALLET.signMessageSync(message);
      const res = await post({ wallet: WALLET_ADDRESS, message, signature });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        error: "Invalid attendance request message",
      });
    });

    it("rejects a valid signature whose message names a different wallet", async () => {
      const otherWallet = ethers.Wallet.createRandom();
      const message = `Attendance request: ${otherWallet.address}:${Date.now()}`;
      const signature = WALLET.signMessageSync(message);
      const res = await post({ wallet: WALLET_ADDRESS, message, signature });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        error: "Invalid attendance request message",
      });
    });

    it("rejects a malformed JSON body", async () => {
      const res = await POST(
        new Request("http://localhost/api/attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{not valid json",
        })
      );
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "Invalid JSON body" });
    });

    it("accepts a valid fresh signature and records attendance", async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(null);
      prismaMock.attendance.create.mockResolvedValue({
        id: "rec-1",
        wallet: WALLET_ADDRESS.toLowerCase(),
        date: new Date(),
        hashProof: null,
      });
      attestMock.mockResolvedValue("0xabc123");
      prismaMock.attendance.update.mockResolvedValue({
        id: "rec-1",
        wallet: WALLET_ADDRESS.toLowerCase(),
        date: new Date(),
        hashProof: "0xabc123",
      });

      const res = await post(signedBody());
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body).toMatchObject({
        id: "rec-1",
        status: "confirmed",
        hashProof: "0xabc123",
      });
      expect(attestMock).toHaveBeenCalledTimes(1);
      expect(prismaMock.attendance.create).toHaveBeenCalledTimes(1);
      expect(prismaMock.attendance.update).toHaveBeenCalledTimes(1);
    });
  });

  describe("TTL expiry", () => {
    it("rejects a signature older than the 5-minute TTL", async () => {
      const staleTimestamp = Date.now() - 6 * 60 * 1000;
      const res = await post(signedBody(staleTimestamp));
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({
        error: "Attendance request expired. Please try again.",
      });
    });

    it("accepts a signature within the TTL window", async () => {
      const freshTimestamp = Date.now() - 60 * 1000;
      prismaMock.attendance.findFirst.mockResolvedValue(null);
      prismaMock.attendance.create.mockResolvedValue({
        id: "rec-2",
        wallet: WALLET_ADDRESS.toLowerCase(),
        date: new Date(),
        hashProof: null,
      });
      attestMock.mockResolvedValue(null);

      const res = await post(signedBody(freshTimestamp));
      expect(res.status).toBe(201);
    });
  });

  describe("rate limiting", () => {
    it("returns 429 when the per-wallet rate limit is exceeded", async () => {
      limiterMock.check.mockReturnValue(false);

      const res = await post(signedBody());
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({
        error: "Too many requests. Please try again later.",
      });
      expect(prismaMock.attendance.create).not.toHaveBeenCalled();
      expect(attestMock).not.toHaveBeenCalled();
    });

    it("checks the rate limiter after signature verification", async () => {
      const res = await post({ wallet: "not-an-address" });
      expect(res.status).toBe(400);
      // Signature validation happens first — the limiter is never consulted
      // for requests that fail wallet/signature checks.
      expect(limiterMock.check).not.toHaveBeenCalled();
    });
  });

  describe("duplicate-day protection", () => {
    it("returns 409 when attendance was already marked today", async () => {
      prismaMock.attendance.findFirst.mockResolvedValue({
        id: "rec-old",
        wallet: WALLET_ADDRESS.toLowerCase(),
        date: new Date(),
        hashProof: "0xold",
      });

      const res = await post(signedBody());
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({
        error: "Attendance already marked today",
      });
      expect(prismaMock.attendance.create).not.toHaveBeenCalled();
      expect(attestMock).not.toHaveBeenCalled();
    });

    it("returns 409 when a concurrent insert violates the unique (wallet, dateKey) constraint", async () => {
      // Race: findFirst sees nothing, but create hits the DB's unique
      // constraint because another request inserted first.
      prismaMock.attendance.findFirst.mockResolvedValue(null);
      prismaMock.attendance.create.mockRejectedValue({ code: "P2002" });

      const res = await post(signedBody());
      expect(res.status).toBe(409);
      expect(await res.json()).toEqual({
        error: "Attendance already marked today",
      });
      expect(attestMock).not.toHaveBeenCalled();
    });
  });

  describe("off-chain fallback", () => {
    it("returns a pending record when on-chain attestation is unavailable", async () => {
      prismaMock.attendance.findFirst.mockResolvedValue(null);
      prismaMock.attendance.create.mockResolvedValue({
        id: "rec-3",
        wallet: WALLET_ADDRESS.toLowerCase(),
        date: new Date(),
        hashProof: null,
      });
      attestMock.mockResolvedValue(null);

      const res = await post(signedBody());
      expect(res.status).toBe(201);
      const body = await res.json();
      expect(body.status).toBe("pending");
      expect(body.hashProof).toBeNull();
      expect(prismaMock.attendance.update).not.toHaveBeenCalled();
    });
  });

  describe("database errors", () => {
    it("returns 503 when the database is unavailable", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      prismaMock.attendance.findFirst.mockRejectedValue(
        new Error("db connection refused")
      );
      const res = await post(signedBody());
      expect(res.status).toBe(503);
      expect((await res.json()).error).toMatch(/Database not available/i);
      consoleSpy.mockRestore();
    });
  });
});

describe("GET /api/attendance", () => {
  it("rejects a missing wallet param", async () => {
    const res = await GET(new Request("http://localhost/api/attendance"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: "A valid wallet address is required",
    });
  });

  it("returns the student's records for a valid wallet", async () => {
    prismaMock.attendance.findMany.mockResolvedValue([
      {
        id: "rec-1",
        wallet: WALLET_ADDRESS.toLowerCase(),
        date: new Date("2026-07-30T10:00:00.000Z"),
        hashProof: "0xabc",
      },
    ]);

    const res = await GET(
      new Request(`http://localhost/api/attendance?wallet=${WALLET_ADDRESS}`)
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0]).toMatchObject({
      id: "rec-1",
      status: "confirmed",
      hashProof: "0xabc",
    });
    expect(prismaMock.attendance.findMany).toHaveBeenCalledWith({
      where: { wallet: WALLET_ADDRESS.toLowerCase() },
      orderBy: { date: "desc" },
    });
  });

  it("returns 503 when the database is unavailable", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.attendance.findMany.mockRejectedValue(
      new Error("db connection refused")
    );
    const res = await GET(
      new Request(`http://localhost/api/attendance?wallet=${WALLET_ADDRESS}`)
    );
    expect(res.status).toBe(503);
    expect((await res.json()).error).toMatch(/Database not available/i);
    consoleSpy.mockRestore();
  });
});
