import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AttendanceList from "../AttendanceList";
import type { AttendanceRecord } from "@/types/attendance";

const records: AttendanceRecord[] = [
  {
    id: "1",
    date: "2026-07-28T09:00:00Z",
    hashProof: "0x7a9f3c8d2e1b5a4f6c0d8e3f2a1b9c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b",
    status: "confirmed",
  },
  {
    id: "2",
    date: "2026-07-27T09:00:00Z",
    hashProof: null,
    status: "pending",
  },
];

describe("AttendanceList", () => {
  it("shows an empty state when there are no records", () => {
    render(<AttendanceList records={[]} />);
    expect(screen.getByText("No attendance records yet")).toBeInTheDocument();
  });

  it("renders records with truncated proof hashes and status badges", () => {
    render(<AttendanceList records={records} />);
    expect(screen.getByText("0x7a9f...2a1b")).toBeInTheDocument();
    expect(screen.getByText("Confirmed")).toBeInTheDocument();
    expect(screen.getByText("Pending")).toBeInTheDocument();
    expect(screen.getByText("No on-chain proof")).toBeInTheDocument();
  });

  it("renders skeleton loaders while loading", () => {
    const { container } = render(<AttendanceList records={[]} isLoading />);
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });
});
