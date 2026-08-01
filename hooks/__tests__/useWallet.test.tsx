import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WalletProvider, useWallet } from "../useWallet";

const { mockedConnectWallet } = vi.hoisted(() => ({
  mockedConnectWallet: vi.fn(),
}));

vi.mock("@/lib/web3", () => ({
  connectWallet: (...args: unknown[]) => mockedConnectWallet(...args),
}));

const WALLET = "0x1234567890abcdef1234567890abcdef12345678";

function TestConsumer() {
  const { address, error, connect, disconnect } = useWallet();
  return (
    <div>
      <span data-testid="address">{address || "none"}</span>
      <span data-testid="error">{error || "no-error"}</span>
      <button onClick={connect}>Connect</button>
      <button onClick={disconnect}>Disconnect</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <WalletProvider>
      <TestConsumer />
    </WalletProvider>
  );
}

beforeEach(() => {
  mockedConnectWallet.mockReset();
  mockedConnectWallet.mockResolvedValue({
    address: WALLET,
    provider: {},
    signer: {},
  });
});

describe("useWallet", () => {
  it("starts disconnected", () => {
    renderWithProvider();
    expect(screen.getByTestId("address").textContent).toBe("none");
    expect(screen.getByTestId("error").textContent).toBe("no-error");
  });

  it("connects and stores the wallet address", async () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Connect"));

    await waitFor(() => {
      expect(screen.getByTestId("address").textContent).toBe(WALLET);
    });
  });

  it("disconnects and clears the address", async () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Connect"));
    await waitFor(() => {
      expect(screen.getByTestId("address").textContent).toBe(WALLET);
    });

    fireEvent.click(screen.getByText("Disconnect"));
    expect(screen.getByTestId("address").textContent).toBe("none");
  });

  it("surfaces connection errors to the consumer", async () => {
    mockedConnectWallet.mockRejectedValue(new Error("MetaMask is not installed"));
    renderWithProvider();
    fireEvent.click(screen.getByText("Connect"));

    await waitFor(() => {
      expect(screen.getByTestId("error").textContent).toBe(
        "MetaMask is not installed"
      );
    });
    expect(screen.getByTestId("address").textContent).toBe("none");
  });
});
