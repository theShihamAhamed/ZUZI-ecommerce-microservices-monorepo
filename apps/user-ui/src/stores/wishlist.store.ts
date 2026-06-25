"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { Product, WishlistItem } from "@/types/product";

interface WishlistStore {
  wishlist: WishlistItem[];
  addToWishlist: (
    product: Product,
    user: any,
    location: string,
    deviceInfo: string,
  ) => void;
  addToWishlistWithQuantity: (
    product: Product,
    quantity: number,
    user: any,
    location: string,
    deviceInfo: string,
  ) => void;
  removeFromWishlist: (productId: string) => void;
  increaseWishlistQuantity: (productId: string) => void;
  decreaseWishlistQuantity: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      wishlist: [],
      addToWishlist: (product, user, location, deviceInfo) => {
        get().addToWishlistWithQuantity(
          product,
          1,
          user,
          location,
          deviceInfo,
        );
      },
      addToWishlistWithQuantity: (
        product,
        quantity,
        user,
        location,
        deviceInfo,
      ) => {
        const parsedQuantity = Math.floor(quantity);
        const safeQuantity = Number.isFinite(parsedQuantity)
          ? Math.max(1, parsedQuantity)
          : 1;
        const existingItem = get().wishlist.find(
          (item) => item.id === product.id,
        );

        if (existingItem) {
          set((state) => ({
            wishlist: state.wishlist.map((item) => {
              if (item.id !== product.id) return item;

              const currentQuantity = item.quantity || 1;
              return {
                ...item,
                quantity: currentQuantity + safeQuantity,
              };
            }),
          }));
          return;
        }

        const wishlistItem: WishlistItem = {
          ...product,
          quantity: safeQuantity,
          location,
          deviceInfo,
          userId: user?.id,
          addedAt: new Date().toISOString(),
        };

        set((state) => ({
          wishlist: [...state.wishlist, wishlistItem],
        }));
      },
      removeFromWishlist: (productId) => {
        set((state) => ({
          wishlist: state.wishlist.filter((item) => item.id !== productId),
        }));
      },
      increaseWishlistQuantity: (productId) => {
        set((state) => ({
          wishlist: state.wishlist.map((item) => {
            if (item.id !== productId) return item;

            const currentQuantity = item.quantity || 1;
            return {
              ...item,
              quantity: currentQuantity + 1,
            };
          }),
        }));
      },
      decreaseWishlistQuantity: (productId) => {
        set((state) => ({
          wishlist: state.wishlist
            .map((item) => {
              if (item.id !== productId) return item;

              const currentQuantity = item.quantity || 1;
              return {
                ...item,
                quantity: currentQuantity - 1,
              };
            })
            .filter((item) => (item.quantity ?? 1) > 0),
        }));
      },
      isInWishlist: (productId) => {
        return get().wishlist.some((item) => item.id === productId);
      },
      clearWishlist: () => {
        set({ wishlist: [] });
      },
    }),
    {
      name: "zuzi_wishlist",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
