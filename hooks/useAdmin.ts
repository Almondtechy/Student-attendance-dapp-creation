"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";

interface AdminStatus {
  ownerAddress: string | null;
}

export function useAdmin() {
  const { address } = useWallet();
  const [ownerAddress, setOwnerAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadOwner = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/status");
      const data = (await res.json()) as AdminStatus;
      setOwnerAddress(data?.ownerAddress ?? null);
    } catch {
      setOwnerAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOwner();
  }, [loadOwner]);

  const isAdmin =
    !!address &&
    !!ownerAddress &&
    address.toLowerCase() === ownerAddress.toLowerCase();

  return { ownerAddress, isAdmin, isLoading };
}
