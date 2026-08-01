import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import MarkerManager from "../MarkerManager";

const { mockedUseWallet } = vi.hoisted(() => ({
  mockedUseWallet: vi.fn(),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => mockedUseWallet(),
}));

const mockGetProofContract = vi.fn();
vi.mock("@/lib/contract", () => ({
  getProofContract: (...args: unknown[]) => mockGetProofContract(...args),
}));

const WALLET = "0x1234567890abcdef1234567890abcdef12345678";

beforeEach(() => {
  mockedUseWallet.mockReset();
  mockedUseWallet.mockReturnValue({
    address: WALLET,
    provider: null,
    signer: { address: WALLET },
  });
  mockGetProofContract.mockReset();
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_PROOF_ADDRESS;
});

describe("MarkerManager", () => {
  it("shows a setup notice when no contract address is configured", () => {
    render(<MarkerManager />);
    expect(
      screen.getByText(/requires a deployed ProofStorage contract/i)
    ).toBeInTheDocument();
  });

  it("lists markers derived from MarkerAuthorized events", async () => {
    process.env.NEXT_PUBLIC_PROOF_ADDRESS = WALLET;

    const { ethers } = await import("ethers");
    const authorizedTopic = ethers.id("MarkerAuthorized(address)");
    const revokedTopic = ethers.id("MarkerRevoked(address)");

    const getLogs = vi.fn().mockResolvedValue([
      {
        topics: [
          authorizedTopic,
          "0x000000000000000000000000aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        ],
        data: "0x",
      },
    ]);

    mockedUseWallet.mockReturnValue({
      address: WALLET,
      provider: { getLogs },
      signer: { address: WALLET },
    });

    render(<MarkerManager />);

    await waitFor(() => {
      expect(getLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          address: WALLET,
          topics: [[authorizedTopic, revokedTopic]],
        })
      );
    });

    // ethers.getAddress checksums the all-a marker to 0xaAaA..., then the
    // component slices it to the truncated display format
    await waitFor(() => {
      expect(screen.getByText("0xaAaA...aaAa")).toBeInTheDocument();
    });
  });

  it("validates the marker address before authorizing", async () => {
    process.env.NEXT_PUBLIC_PROOF_ADDRESS = WALLET;

    mockedUseWallet.mockReturnValue({
      address: WALLET,
      provider: { getLogs: vi.fn().mockResolvedValue([]) },
      signer: { address: WALLET },
    });

    render(<MarkerManager />);

    const input = screen.getByPlaceholderText(/teacher wallet address/i);
    fireEvent.change(input, { target: { value: "not-an-address" } });
    fireEvent.click(screen.getByText("Authorize"));

    expect(
      screen.getByText("Enter a valid Ethereum address")
    ).toBeInTheDocument();
    expect(mockGetProofContract).not.toHaveBeenCalled();
  });
});
