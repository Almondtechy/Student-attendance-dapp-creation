import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AttendanceStats from "../AttendanceStats";

describe("AttendanceStats", () => {
  it("renders the stat labels and values", () => {
    render(
      <AttendanceStats totalClasses={12} attended={9} onChainProofs={7} />
    );
    expect(screen.getByText("Total Classes")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("Attended")).toBeInTheDocument();
    expect(screen.getByText("9")).toBeInTheDocument();
    expect(screen.getByText("On-Chain Proofs")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("computes the attendance rate percentage", () => {
    render(
      <AttendanceStats totalClasses={10} attended={7} onChainProofs={5} />
    );
    expect(screen.getByText("70%")).toBeInTheDocument();
  });

  it("shows 0% when there are no classes", () => {
    render(<AttendanceStats totalClasses={0} attended={0} onChainProofs={0} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("renders skeleton loaders while loading", () => {
    const { container } = render(
      <AttendanceStats totalClasses={0} attended={0} onChainProofs={0} isLoading />
    );
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });
});
