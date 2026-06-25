"use client";

import { useEffect } from "react";
import { sendKafkaEvent } from "@/actions/send-kafka-event";
import { useAuth } from "@/hooks/useAuth";
import { useDeviceTracking } from "@/hooks/useDeviceTracking";
import { useLocationTracking } from "@/hooks/useLocationTracking";
import { buildShopAnalyticsEvent } from "@/services/analytics-event.service";

interface ShopVisitTrackerProps {
  shopId: string;
}

const getStorageKey = (shopId: string) => `shop_visited:${shopId}`;

const hasTrackedShopVisit = (shopId: string) => {
  try {
    return window.sessionStorage.getItem(getStorageKey(shopId)) === "true";
  } catch {
    return false;
  }
};

const markShopVisitTracked = (shopId: string) => {
  try {
    window.sessionStorage.setItem(getStorageKey(shopId), "true");
  } catch {
    // Analytics should never block the storefront when storage is unavailable.
  }
};

export function ShopVisitTracker({ shopId }: ShopVisitTrackerProps) {
  const { fetchUser } = useAuth();
  const location = useLocationTracking();
  const deviceInfo = useDeviceTracking();

  useEffect(() => {
    if (!shopId || hasTrackedShopVisit(shopId)) return;

    if (
      typeof location === "object" &&
      location &&
      "isLoading" in location &&
      location.isLoading
    ) {
      return;
    }

    markShopVisitTracked(shopId);

    void sendKafkaEvent(
      buildShopAnalyticsEvent({
        shopId,
        user: fetchUser.data,
        location,
        deviceInfo,
      }),
    );
  }, [deviceInfo, fetchUser.data, location, shopId]);

  return null;
}
