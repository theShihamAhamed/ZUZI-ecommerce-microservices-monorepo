"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ProfileSidebar,
  ProfileTab,
} from "@/components/profile/profile-sidebar";
import { ProfileOverview } from "@/components/profile/profile-overview";
import { ShippingAddressSection } from "@/components/profile/shipping-address-section";
import { ProfileComingSoon } from "@/components/profile/profile-coming-soon";
import { ProfileOrdersSection } from "@/components/profile/profile-orders-section";
import { MyReviewsSection } from "@/components/profile/my-reviews-section";
import { InboxSection } from "@/components/profile/inbox-section";
import { NotificationSection } from "@/components/profile/notification-section";
import { useLogout, useProfile } from "@/hooks/useProfile";

const profileTabs: ProfileTab[] = [
  "overview",
  "orders",
  "my-reviews",
  "inbox",
  "notifications",
  "shipping-address",
  "change-password",
];

const comingSoonTitles: Record<ProfileTab, string> = {
  overview: "Overview",
  orders: "My Orders",
  "my-reviews": "My Reviews",
  inbox: "Inbox",
  notifications: "Notifications",
  "shipping-address": "Shipping Address",
  "change-password": "Change Password",
};

const getActiveTab = (tab: string | null): ProfileTab => {
  return profileTabs.includes(tab as ProfileTab) ? (tab as ProfileTab) : "overview";
};

const getErrorStatus = (error: unknown) => {
  return (error as any)?.response?.status as number | undefined;
};

const isAuthError = (error: unknown) => {
  const status = getErrorStatus(error);
  return status === 400 || status === 401 || status === 403;
};

function ProfilePageSkeleton() {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
          <div className="h-12 w-12 animate-pulse rounded-full bg-stone-200" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-28 animate-pulse rounded-full bg-stone-200" />
            <div className="h-3 w-40 animate-pulse rounded-full bg-stone-100" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-xl bg-stone-100"
            />
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="h-6 w-48 animate-pulse rounded-full bg-stone-200" />
          <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded-full bg-stone-100" />
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="h-12 animate-pulse rounded-xl bg-stone-100" />
            <div className="h-12 animate-pulse rounded-xl bg-stone-100" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfilePageView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = getActiveTab(searchParams.get("tab"));
  const profileQuery = useProfile();
  const logout = useLogout();
  const shouldRedirectToLogin =
    profileQuery.isError && isAuthError(profileQuery.error);

  useEffect(() => {
    if (shouldRedirectToLogin) {
      router.replace(`/login?redirect=${encodeURIComponent("/profile")}`);
    }
  }, [router, shouldRedirectToLogin]);

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        router.push("/login");
      },
    });
  };

  if (profileQuery.isLoading || shouldRedirectToLogin) {
    return <ProfilePageSkeleton />;
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-gray-700">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-base font-semibold text-gray-900">
          Unable to load your profile
        </h2>
        <p className="mt-2 text-sm text-gray-600">Please try again.</p>
        <button
          type="button"
          onClick={() => profileQuery.refetch()}
          disabled={profileQuery.isFetching}
          className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          {profileQuery.isFetching ? "Trying again..." : "Retry"}
        </button>
      </div>
    );
  }

  const profile = profileQuery.data;

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
      <ProfileSidebar
        activeTab={activeTab}
        profile={profile}
        isLoggingOut={logout.isPending}
        onLogout={handleLogout}
      />

      <div className="min-w-0">
        {activeTab === "overview" ? (
          <ProfileOverview profile={profile} />
        ) : null}

        {activeTab === "shipping-address" ? <ShippingAddressSection /> : null}

        {activeTab === "orders" ? <ProfileOrdersSection /> : null}

        {activeTab === "my-reviews" ? <MyReviewsSection /> : null}

        {activeTab === "inbox" ? <InboxSection profile={profile} /> : null}

        {activeTab === "notifications" ? <NotificationSection /> : null}

        {activeTab !== "overview" &&
        activeTab !== "shipping-address" &&
        activeTab !== "orders" &&
        activeTab !== "my-reviews" &&
        activeTab !== "inbox" &&
        activeTab !== "notifications" ? (
          <ProfileComingSoon title={comingSoonTitles[activeTab]} />
        ) : null}
      </div>
    </div>
  );
}
