"use client";

import React from "react";
import { Bell, Search, ShoppingCart, Heart, User, LogOut } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { useLogout } from "@/hooks/useProfile";
import { useUnreadNotificationCount } from "@/hooks/useNotifications";
import { useCartStore } from "@/stores/cart.store";
import { useWishlistStore } from "@/stores/wishlist.store";
import { useRouter } from "next/navigation";

const Header = () => {
  const { fetchUser } = useAuth();
  const logout = useLogout();
  const router = useRouter();

  const user = fetchUser.data;
  const isLoading = fetchUser.isLoading;
  const unreadNotifications = useUnreadNotificationCount(Boolean(user));

  const cart = useCartStore((state) => state.cart);
  const wishlist = useWishlistStore((state) => state.wishlist);
  const cartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const wishlistCount = wishlist.reduce(
    (sum, item) => sum + (item.quantity || 1),
    0,
  );

  const handleLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        router.push("/login");
      },
    });
  };

  return (
    <div className="flex flex-col w-full relative z-50">
      <div className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Logo */}
            <Link
              href="/"
              className="text-3xl font-bold tracking-tight text-gray-900"
            >
              Zuzi
            </Link>

            {/* Search */}
            <div className="hidden md:flex flex-1 max-w-2xl mx-8">
              <div className="relative w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-amber-600" />
                <input
                  type="text"
                  placeholder="Search for products..."
                  className="w-full pl-11 pr-4 py-2.5 rounded-full border border-stone-200 bg-stone-50 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400"
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-6">
              {/* Wishlist */}
              <Link
                href="/wishlist"
                aria-label="View wishlist"
                className="relative p-2 text-gray-600 hover:text-amber-700"
              >
                <Heart className="h-6 w-6" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full px-1.5">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link
                href="/cart"
                aria-label="View cart"
                className="relative p-2 text-gray-600 hover:text-amber-700"
              >
                <ShoppingCart className="h-6 w-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-xs font-bold rounded-full px-1.5">
                    {cartCount}
                  </span>
                )}
              </Link>

              {user ? (
                <Link
                  href="/profile?tab=notifications"
                  aria-label="View notifications"
                  className="relative p-2 text-gray-600 hover:text-amber-700"
                >
                  <Bell className="h-6 w-6" />
                  {(unreadNotifications.data?.unreadCount || 0) > 0 ? (
                    <span className="absolute -top-1 -right-1 rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
                      {Math.min(unreadNotifications.data?.unreadCount || 0, 99)}
                    </span>
                  ) : null}
                </Link>
              ) : null}

              {/* Auth Section */}
              {isLoading ? (
                // Skeleton while checking auth
                <div className="h-8 w-24 bg-stone-200 rounded-full animate-pulse" />
              ) : user ? (
                // Logged In
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <Link
                    href="/profile"
                    aria-label="Open profile"
                    className="h-9 w-9 rounded-full bg-black text-white flex items-center justify-center text-sm font-semibold uppercase"
                  >
                    {user.name?.charAt(0)}
                  </Link>

                  {/* Name */}
                  <span className="hidden md:inline text-sm font-medium text-gray-700">
                    {user.name}
                  </span>

                  {/* Logout */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={logout.isPending}
                    className="p-2 rounded-full hover:bg-amber-50"
                    title="Logout"
                  >
                    <LogOut className="h-5 w-5 text-gray-700 hover:text-amber-700" />
                  </button>
                </div>
              ) : (
                // Not logged in
                <Link
                  href="/login"
                  className="flex items-center gap-2 text-sm font-medium text-white bg-black px-5 py-2.5 rounded-full hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
                >
                  <User className="h-4 w-4" />
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
