"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useCartStore } from "@/stores/cart.store";

export function CartSync() {
  const { fetchUser } = useAuth();
  const user = fetchUser.data;
  const hasHydratedStorage = useCartStore((state) => state.hasHydratedStorage);
  const syncedUserId = useCartStore((state) => state.syncedUserId);
  const syncCartWithBackend = useCartStore((state) => state.syncCartWithBackend);
  const hydrateCartFromBackend = useCartStore(
    (state) => state.hydrateCartFromBackend,
  );
  const activeSyncUserId = useRef<string | null>(null);

  useEffect(() => {
    const userId = user?.id;

    if (!hasHydratedStorage || !userId) {
      activeSyncUserId.current = null;
      return;
    }

    if (activeSyncUserId.current === userId) return;

    activeSyncUserId.current = userId;

    if (syncedUserId !== userId) {
      void syncCartWithBackend(user);
      return;
    }

    void hydrateCartFromBackend(user);
  }, [
    hasHydratedStorage,
    hydrateCartFromBackend,
    syncCartWithBackend,
    syncedUserId,
    user,
  ]);

  return null;
}
