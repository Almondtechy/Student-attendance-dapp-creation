import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import StudentProfileCard from "../StudentProfileCard";

const { mockedUseWallet } = vi.hoisted(() => ({
  mockedUseWallet: vi.fn(),
}));

vi.mock("@/hooks/useWallet", () => ({
  useWallet: () => mockedUseWallet(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const WALLET = "0x1234567890abcdef1234567890abcdef12345678";
const signer = { signMessage: vi.fn().mockResolvedValue("0xsig123") };

beforeEach(() => {
  mockedUseWallet.mockReturnValue({ address: WALLET, signer });
  mockFetch.mockReset();
  signer.signMessage.mockClear();
});

describe("StudentProfileCard", () => {
  it("loads and displays the existing profile", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ name: "Ada Lovelace", email: "ada@school.edu" }),
    });

    render(<StudentProfileCard />);

    expect(mockFetch).toHaveBeenCalledWith(
      `/api/profile?wallet=${encodeURIComponent(WALLET)}`
    );

    await waitFor(() => {
      expect(screen.getByLabelText("Full name")).toHaveValue("Ada Lovelace");
    });
    expect(screen.getByLabelText(/Email/)).toHaveValue("ada@school.edu");
    // initials avatar from the name
    expect(screen.getByText("AL")).toBeInTheDocument();
  });

  it("saves the profile with a signed request", async () => {
    // First response = profile GET (no profile yet), second = the PUT save.
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: null, email: null }),
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: "Ada Lovelace", email: "ada@school.edu" }),
    });

    render(<StudentProfileCard />);
    await waitFor(() => {
      expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.change(screen.getByLabelText(/Email/), {
      target: { value: "ada@school.edu" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(signer.signMessage).toHaveBeenCalledWith(
        expect.stringMatching(/^Profile update: /)
      );
    });
    expect(mockFetch).toHaveBeenLastCalledWith(
      "/api/profile",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining(WALLET),
      })
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Profile saved — your attendance is now linked to it/i)
      ).toBeInTheDocument();
    });
  });

  it("shows an error when saving fails", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ name: null, email: null }),
    });

    render(<StudentProfileCard />);
    await waitFor(() => {
      expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "That email is already linked to another student" }),
    });

    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Ada Lovelace" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save profile/i }));

    await waitFor(() => {
      expect(
        screen.getByText("That email is already linked to another student")
      ).toBeInTheDocument();
    });
  });

  it("does not render anything when no wallet is connected", () => {
    mockedUseWallet.mockReturnValue({ address: "", signer: null });
    const { container } = render(<StudentProfileCard />);
    expect(container.firstChild).toBeNull();
  });
});
