"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";

interface StudentProfile {
  name: string | null;
  email: string | null;
}

const NAME_MAX = 100;

export default function StudentProfileCard() {
  const { address, signer } = useWallet();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!address) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/profile?wallet=${encodeURIComponent(address)}`);
      const data = (await res.json()) as StudentProfile;
      if (!res.ok) throw new Error((data as { error?: string }).error ?? "Failed to load profile");
      setProfile(data);
      setName(data.name ?? "");
      setEmail(data.email ?? "");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load profile";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSave = useCallback(async () => {
    if (!address || !signer) return;
    setIsSaving(true);
    setError(null);
    setSaved(false);
    try {
      const timestamp = Date.now();
      const message = `Profile update: ${address}:${timestamp}`;
      const signature = await signer.signMessage(message);

      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: address, message, signature, name, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save profile");
      }

      setProfile(data as StudentProfile);
      setName(data.name ?? "");
      setEmail(data.email ?? "");
      setSaved(true);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save profile";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }, [address, signer, name, email]);

  if (!address) return null;

  const initials =
    profile?.name?.trim()
      ?.split(/\s+/)
      .map((part) => part[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "ST";

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Card header */}
      <div className="relative bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 px-6 py-6">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-20 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        </div>
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/25 flex items-center justify-center text-white text-lg font-bold shadow-lg">
            {initials}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white">Student Profile</h3>
            <p className="text-xs text-purple-100 mt-0.5 font-mono truncate">
              {address.slice(0, 6)}...{address.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-10 w-full bg-gray-200 dark:bg-gray-700 rounded-lg" />
            <div className="h-10 w-28 bg-gray-200 dark:bg-gray-700 rounded-lg" />
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleSave();
            }}
            className="space-y-4"
          >
            <div>
              <label
                htmlFor="profile-name"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Full name
              </label>
              <input
                id="profile-name"
                type="text"
                value={name}
                maxLength={NAME_MAX}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ada Lovelace"
                className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500 transition-all"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
              >
                Email{" "}
                <span className="text-gray-400 dark:text-gray-500 font-normal">
                  (optional)
                </span>
              </label>
              <input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@school.edu"
                className="w-full text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-600 rounded-xl px-4 py-2.5 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/60 focus:border-purple-500 transition-all"
              />
            </div>

            {saved && (
              <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Profile saved — your attendance is now linked to it.
              </p>
            )}

            {error && (
              <p className="text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="w-full bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-400 text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 shadow-lg shadow-purple-600/20 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : profile?.name ? "Update Profile" : "Save Profile"}
            </button>

            <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
              Your wallet will sign a request to prove you own this profile.
              Admins will see your name instead of just your wallet address.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
