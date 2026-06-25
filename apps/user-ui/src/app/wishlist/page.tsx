"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { WishlistItemsList } from "@/components/wishlist/wishlist-items-list";
import { useWishlistStore } from "@/stores/wishlist.store";

export default function WishlistPage() {
  const wishlist = useWishlistStore((state) => state.wishlist);
  const itemCount = wishlist.length;

  return (
    <main className="min-h-screen bg-stone-50 py-8 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Wishlist" },
          ]}
        />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">
              Wishlist
            </h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              {itemCount > 0
                ? `${itemCount} saved ${itemCount === 1 ? "item" : "items"} from trusted sellers.`
                : "Save favorite marketplace finds and come back to them later."}
            </p>
          </div>
        </div>

        <div className="mt-8">
          {itemCount > 0 ? (
            <WishlistItemsList items={wishlist} />
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <Heart className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-lg font-bold text-gray-900">
                Your wishlist is empty
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                Explore marketplace picks and save the products you want to
                revisit.
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center justify-center rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
              >
                Continue shopping
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
