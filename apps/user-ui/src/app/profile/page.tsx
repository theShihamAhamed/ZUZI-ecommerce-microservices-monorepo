import { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ProfilePageView } from "@/components/profile/profile-page-view";

export const metadata: Metadata = {
  title: "Profile | Zuzi",
  description: "Manage your Zuzi customer profile and shipping addresses.",
};

function ProfilePageFallback() {
  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
        <div className="h-14 animate-pulse rounded-xl bg-stone-100" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="h-10 animate-pulse rounded-xl bg-stone-100"
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="h-6 w-48 animate-pulse rounded-full bg-stone-200" />
        <div className="mt-4 h-4 w-full max-w-md animate-pulse rounded-full bg-stone-100" />
        <div className="mt-8 h-32 animate-pulse rounded-xl bg-stone-100" />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Profile" },
          ]}
        />

        <div className="mt-6 mb-8">
          <h1 className="text-3xl font-extrabold tracking-normal text-gray-900 sm:text-4xl">
            My Profile
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-gray-600 sm:text-base">
            Manage your account details and saved shipping addresses.
          </p>
        </div>

        <Suspense fallback={<ProfilePageFallback />}>
          <ProfilePageView />
        </Suspense>
      </div>
    </main>
  );
}
