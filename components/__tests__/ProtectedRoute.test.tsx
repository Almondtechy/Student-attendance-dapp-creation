import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ProtectedRoute from "../ProtectedRoute";

const { mockedUseWallet } = vi.hoisted(() => ({
  mockedUseWallet: vi.fn(),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => mockedUseWallet(),
}));

describe("ProtectedRoute", () => {
  it("shows a connect prompt when no wallet is connected", () => {
    mockedUseWallet.mockReturnValue({
      address: "",
      connect: vi.fn(),
      isConnecting: false,
    });

    render(
      <ProtectedRoute>
        <div>Secret dashboard content</div>
      </ProtectedRoute>
    );

    expect(
      screen.getByText("Dashboard Access Restricted")
    ).toBeInTheDocument();
    expect(
      screen.queryByText("Secret dashboard content")
    ).not.toBeInTheDocument();
  });

  it("renders children when a wallet is connected", () => {
    mockedUseWallet.mockReturnValue({
      address: "0x1234567890abcdef1234567890abcdef12345678",
      connect: vi.fn(),
      isConnecting: false,
    });

    render(
      <ProtectedRoute>
        <div>Secret dashboard content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText("Secret dashboard content")).toBeInTheDocument();
    expect(
      screen.queryByText("Dashboard Access Restricted")
    ).not.toBeInTheDocument();
  });
});
