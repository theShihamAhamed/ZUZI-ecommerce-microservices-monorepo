"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { CartItemsList } from "@/components/cart/cart-items-list";
import { CartSummary } from "@/components/cart/cart-summary";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { useCartStore } from "@/stores/cart.store";

export default function CartPage() {
  const cart = useCartStore((state) => state.cart);
  const itemCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  return (
    <main className="min-h-screen bg-stone-50 py-8 sm:py-10 lg:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Cart" },
          ]}
        />

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Cart</h1>
            <p className="mt-2 text-sm text-gray-600 sm:text-base">
              {itemCount > 0
                ? `${itemCount} ${itemCount === 1 ? "item" : "items"} ready for review.`
                : "Your selected products will appear here before checkout."}
            </p>
          </div>
        </div>

        <div className="mt-8">
          {cart.length > 0 ? (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
              <CartItemsList items={cart} />
              <CartSummary cart={cart} />
            </div>
          ) : (
            <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                <ShoppingCart className="h-7 w-7" />
              </div>
              <h2 className="mt-5 text-lg font-bold text-gray-900">
                Your cart is empty
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
                Add products from trusted sellers and review them here before
                checkout.
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
