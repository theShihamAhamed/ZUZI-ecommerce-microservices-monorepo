"use client";

import Link from "next/link";
import {
  Bell,
  Inbox,
  Lock,
  LogOut,
  MapPin,
  Package,
  Star,
  UserRound,
} from "lucide-react";
import { CustomerProfile } from "@/types/profile";

export type ProfileTab =
  | "overview"
  | "orders"
  | "my-reviews"
  | "inbox"
  | "notifications"
  | "shipping-address"
  | "change-password";

interface ProfileSidebarProps {
  activeTab: ProfileTab;
  profile: CustomerProfile;
  isLoggingOut: boolean;
  onLogout: () => void;
}

const navigationItems = [
  {
    label: "Overview",
    tab: "overview",
    icon: UserRound,
  },
  {
    label: "My Orders",
    tab: "orders",
    icon: Package,
  },
  {
    label: "My Reviews",
    tab: "my-reviews",
    icon: Star,
  },
  {
    label: "Inbox",
    tab: "inbox",
    icon: Inbox,
  },
  {
    label: "Notifications",
    tab: "notifications",
    icon: Bell,
  },
  {
    label: "Shipping Address",
    tab: "shipping-address",
    icon: MapPin,
  },
  {
    label: "Change Password",
    tab: "change-password",
    icon: Lock,
  },
] as const;

const getInitials = (name: string) => {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
};

const getTabHref = (tab: ProfileTab) => {
  return tab === "overview" ? "/profile" : `/profile?tab=${tab}`;
};

export function ProfileSidebar({
  activeTab,
  profile,
  isLoggingOut,
  onLogout,
}: ProfileSidebarProps) {
  const avatarUrl = profile.avatar?.url || profile.avatarUrl;

  return (
    <aside className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm lg:sticky lg:top-20">
      <div className="flex items-center gap-3 border-b border-stone-200 pb-4">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={profile.name}
            className="h-12 w-12 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
            {getInitials(profile.name)}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">
            {profile.name}
          </p>
          <p className="truncate text-xs text-gray-500">{profile.email}</p>
        </div>
      </div>

      <nav className="mt-4 grid gap-1 sm:grid-cols-2 lg:block lg:space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.tab;

          return (
            <Link
              key={item.tab}
              href={getTabHref(item.tab)}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                isActive
                  ? "bg-amber-50 text-amber-800"
                  : "text-gray-700 hover:bg-stone-50 hover:text-gray-900"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onLogout}
        disabled={isLoggingOut}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <LogOut className="h-4 w-4" />
        {isLoggingOut ? "Logging out..." : "Logout"}
      </button>
    </aside>
  );
}
