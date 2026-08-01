import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminAttendanceTable from "../AdminAttendanceTable";
import type { AdminAttendanceRecord } from "@/types/attendance";

const records: AdminAttendanceRecord[] = [
  {
    id: "1",
    wallet: "0x1234567890abcdef1234567890abcdef12345678",
    date: "2026-07-28T09:00:00Z",
    hashProof: "0x7a9f3c8d2e1b5a4f6c0d8e3f2a1b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b",
    status: "confirmed",
  },
  {
    id: "2",
    wallet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    date: "2026-07-27T09:00:00Z",
    hashProof: null,
    status: "pending",
  },
];

describe("AdminAttendanceTable", () => {
  it("shows an empty state when there are no records", () => {
    render(<AdminAttendanceTable records={[]} />);
    expect(screen.getByText("No attendance records yet")).toBeInTheDocument();
  });

  it("renders student wallets, truncated proof hashes, and status badges", () => {
    render(<AdminAttendanceTable records={records} />);

    // shortenWallet: slice(0,6) + "..." + slice(-4)
    expect(screen.getByText("0x1234...5678")).toBeInTheDocument();
    expect(screen.getByText("0xabcd...abcd")).toBeInTheDocument();
    // shortenHash: slice(0,10) + "..." + slice(-6)
    expect(screen.getByText("0x7a9f3c8d...3f2a1b")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("No on-chain proof")).toBeInTheDocument();
  });

  it("renders skeleton loaders while loading", () => {
    const { container } = render(
      <AdminAttendanceTable records={[]} isLoading />
    );
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });
});
