import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAdmin } from "../useAdmin";

const { mockedUseWallet } = vi.hoisted(() => ({
  mockedUseWallet: vi.fn(),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => mockedUseWallet(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const OWNER = "0x1234567890abcdef1234567890abcdef12345678";

beforeEach(() => {
  mockFetch.mockReset();
  mockedUseWallet.mockReset();
});

describe("useAdmin", () => {
  it("returns isAdmin=true when the connected wallet is the owner", async () => {
    mockedUseWallet.mockReturnValue({ address: OWNER });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ownerAddress: OWNER }),
    });

    const { result } = renderHook(() => useAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.ownerAddress).toBe(OWNER);
  });

  it("returns isAdmin=false when the wallet is not the owner", async () => {
    mockedUseWallet.mockReturnValue({
      address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ownerAddress: OWNER }),
    });

    const { result } = renderHook(() => useAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isAdmin).toBe(false);
  });

  it("returns isAdmin=false when no wallet is connected", async () => {
    mockedUseWallet.mockReturnValue({ address: "" });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ ownerAddress: OWNER }),
    });

    const { result } = renderHook(() => useAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isAdmin).toBe(false);
  });

  it("handles a failed status fetch gracefully", async () => {
    mockedUseWallet.mockReturnValue({ address: OWNER });
    mockFetch.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useAdmin());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.ownerAddress).toBeNull();
  });
});
