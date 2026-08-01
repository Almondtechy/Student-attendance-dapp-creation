import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MarkAttendance from "../MarkAttendance";

const { mockedUseWallet } = vi.hoisted(() => ({
  mockedUseWallet: vi.fn(),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => mockedUseWallet(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const WALLET = "0x1234567890abcdef1234567890abcdef12345678";

beforeEach(() => {
  mockedUseWallet.mockReturnValue({
    address: WALLET,
    signer: { signMessage: vi.fn().mockResolvedValue("0xsig123") },
  });
  mockFetch.mockReset();
});

describe("MarkAttendance", () => {
  it("signs the request, posts attendance, and shows the success state", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: "rec-1",
        date: "2026-07-31T09:00:00.000Z",
        hashProof: "0xabc123",
        status: "confirmed",
      }),
    });

    const onMarked = vi.fn();
    render(<MarkAttendance onMarked={onMarked} />);

    fireEvent.click(screen.getByRole("button", { name: /mark attendance/i }));
    expect(screen.getByText("Confirm Attendance")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /confirm & record/i }));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/attendance",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.stringContaining(WALLET),
        })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("Attendance Marked Successfully! 🎉")
      ).toBeInTheDocument();
    });

    expect(onMarked).toHaveBeenCalledTimes(1);
    expect(onMarked).toHaveBeenCalledWith(
      expect.objectContaining({ id: "rec-1", status: "confirmed" })
    );
  });

  it("shows a friendly error when attendance was already marked today", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "Attendance already marked today" }),
    });

    render(<MarkAttendance />);

    fireEvent.click(screen.getByRole("button", { name: /mark attendance/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm & record/i }));

    await waitFor(() => {
      expect(
        screen.getByText("You've already marked attendance today.")
      ).toBeInTheDocument();
    });
  });

  it("shows a wallet signature error when the server rejects the signature", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Signature does not match wallet" }),
    });

    render(<MarkAttendance />);

    fireEvent.click(screen.getByRole("button", { name: /mark attendance/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm & record/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/could not verify your wallet signature/i)
      ).toBeInTheDocument();
    });
  });

  it("does not render anything when no wallet is connected", () => {
    mockedUseWallet.mockReturnValue({ address: "" });
    const { container } = render(<MarkAttendance />);
    expect(container.firstChild).toBeNull();
  });
});
