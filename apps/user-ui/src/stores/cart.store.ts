"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  addCartItemApi,
  clearCartApi,
  getCartApi,
  removeCartItemApi,
  syncCartApi,
  updateCartItemQuantityApi,
} from "@/services/cart.api";
import { CartItem, Product, SelectedProductOptions } from "@/types/product";
import {
  getCartItemKey,
  getSelectedOptionsKey,
  normalizeSelectedOptions,
} from "@/utils/product-options";

const getStoredCartItemKey = (item: CartItem) =>
  item.selectedOptionsKey || getCartItemKey(item.id, item.selectedOptions);

const matchesCartItem = (
  item: CartItem,
  productId: string,
  selectedOptions?: SelectedProductOptions | null,
) =>
  item.id === productId &&
  getStoredCartItemKey(item) === getCartItemKey(productId, selectedOptions);

const getUserId = (user?: any) => {
  if (!user) return "";
  if (typeof user === "string") return user;
  return typeof user.id === "string" ? user.id : "";
};

const getCartItemPayload = (
  productId: string,
  quantity: number,
  selectedOptions?: SelectedProductOptions | null,
) => {
  const normalizedSelectedOptions = normalizeSelectedOptions(selectedOptions);
  const hasSelectedOptions = Object.keys(normalizedSelectedOptions).length > 0;

  return {
    productId,
    quantity,
    selectedOptions: hasSelectedOptions ? normalizedSelectedOptions : null,
    selectedOptionsKey: getSelectedOptionsKey(normalizedSelectedOptions),
  };
};

const toSyncPayload = (item: CartItem) =>
  getCartItemPayload(item.id, item.quantity || 1, item.selectedOptions);

interface CartStore {
  cart: CartItem[];
  syncedUserId: string | null;
  hasHydratedStorage: boolean;
  appliedCouponCode: string;
  discountAmount: number;
  trustedSubtotal: number | null;
  trustedTotal: number | null;
  couponMessage: string;
  couponError: string;
  setHasHydratedStorage: (hasHydratedStorage: boolean) => void;
  setCartFromBackend: (cart: CartItem[], userId: string) => void;
  setAppliedCoupon: (data: {
    couponCode: string;
    subtotal: number;
    discountAmount: number;
    total: number;
    message: string;
  }) => void;
  clearCoupon: (message?: string) => void;
  hydrateCartFromBackend: (user?: any) => Promise<void>;
  syncCartWithBackend: (user?: any) => Promise<void>;
  addToCart: (
    product: Product,
    user: any,
    location: string,
    deviceInfo: string,
    selectedOptions?: SelectedProductOptions | null,
  ) => void;
  addToCartWithQuantity: (
    product: Product,
    quantity: number,
    user: any,
    location: string,
    deviceInfo: string,
    selectedOptions?: SelectedProductOptions | null,
  ) => void;
  removeFromCart: (
    productId: string,
    selectedOptions?: SelectedProductOptions | null,
    user?: any,
  ) => Promise<void>;
  increaseQuantity: (
    productId: string,
    selectedOptions?: SelectedProductOptions | null,
    user?: any,
  ) => void;
  decreaseQuantity: (
    productId: string,
    selectedOptions?: SelectedProductOptions | null,
    user?: any,
  ) => void;
  clearCart: (user?: any) => Promise<void>;
  isInCart: (
    productId: string,
    selectedOptions?: SelectedProductOptions | null,
  ) => boolean;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      cart: [],
      syncedUserId: null,
      hasHydratedStorage: false,
      appliedCouponCode: "",
      discountAmount: 0,
      trustedSubtotal: null,
      trustedTotal: null,
      couponMessage: "",
      couponError: "",
      setHasHydratedStorage: (hasHydratedStorage) => {
        set({ hasHydratedStorage });
      },
      setCartFromBackend: (cart, userId) => {
        set({ cart, syncedUserId: userId });
      },
      setAppliedCoupon: ({
        couponCode,
        subtotal,
        discountAmount,
        total,
        message,
      }) => {
        set({
          appliedCouponCode: couponCode,
          discountAmount,
          trustedSubtotal: subtotal,
          trustedTotal: total,
          couponMessage: message,
          couponError: "",
        });
      },
      clearCoupon: (message = "") => {
        set({
          appliedCouponCode: "",
          discountAmount: 0,
          trustedSubtotal: null,
          trustedTotal: null,
          couponMessage: message,
          couponError: "",
        });
      },
      hydrateCartFromBackend: async (user) => {
        const userId = getUserId(user);
        if (!userId) return;

        const response = await getCartApi();
        get().setCartFromBackend(response.cart, userId);
      },
      syncCartWithBackend: async (user) => {
        const userId = getUserId(user);
        if (!userId) return;

        const localCart = get().cart;

        if (localCart.length === 0) {
          await get().hydrateCartFromBackend(userId);
          return;
        }

        try {
          const response = await syncCartApi(localCart.map(toSyncPayload));
          get().setCartFromBackend(response.cart, userId);
        } catch {
          await get().hydrateCartFromBackend(userId);
        }
      },
      addToCart: (product, user, location, deviceInfo, selectedOptions) => {
        get().addToCartWithQuantity(
          product,
          1,
          user,
          location,
          deviceInfo,
          selectedOptions,
        );
      },
      addToCartWithQuantity: (
        product,
        quantity,
        user,
        location,
        deviceInfo,
        selectedOptions,
      ) => {
        const parsedQuantity = Math.floor(quantity);
        const safeQuantity = Number.isFinite(parsedQuantity)
          ? Math.max(1, parsedQuantity)
          : 1;
        const normalizedSelectedOptions =
          normalizeSelectedOptions(selectedOptions);
        const hasSelectedOptions =
          Object.keys(normalizedSelectedOptions).length > 0;
        const selectedOptionsKey = getSelectedOptionsKey(
          normalizedSelectedOptions,
        );
        const selectedOptionsValue = hasSelectedOptions
          ? normalizedSelectedOptions
          : null;
        const userId = getUserId(user);
        const existingItem = get().cart.find((item) =>
          matchesCartItem(item, product.id, selectedOptionsValue),
        );
        const couponMessage = get().appliedCouponCode
          ? "Cart changed. Apply coupon again."
          : get().couponMessage;

        if (existingItem) {
          set((state) => ({
            cart: state.cart.map((item) => {
              if (!matchesCartItem(item, product.id, selectedOptionsValue)) {
                return item;
              }

              const currentQuantity = item.quantity || 1;
              return {
                ...item,
                quantity: currentQuantity + safeQuantity,
              };
            }),
            syncedUserId: userId ? state.syncedUserId : null,
            appliedCouponCode: "",
            discountAmount: 0,
            trustedSubtotal: null,
            trustedTotal: null,
            couponMessage,
            couponError: "",
          }));
        } else {
          set((state) => ({
            cart: [
              ...state.cart,
              {
                ...product,
                quantity: safeQuantity,
                location,
                deviceInfo,
                userId: userId || undefined,
                addedAt: new Date().toISOString(),
                selectedOptions: selectedOptionsValue,
                selectedOptionsKey,
              },
            ],
            syncedUserId: userId ? state.syncedUserId : null,
            appliedCouponCode: "",
            discountAmount: 0,
            trustedSubtotal: null,
            trustedTotal: null,
            couponMessage,
            couponError: "",
          }));
        }

        if (!userId) return;

        void addCartItemApi(
          getCartItemPayload(product.id, safeQuantity, selectedOptionsValue),
        ).catch(() => get().hydrateCartFromBackend(userId));
      },
      removeFromCart: async (productId, selectedOptions, user) => {
        const previousCart = get().cart;
        const couponMessage = get().appliedCouponCode
          ? "Cart changed. Apply coupon again."
          : get().couponMessage;

        set((state) => ({
          cart: state.cart.filter(
            (item) => !matchesCartItem(item, productId, selectedOptions),
          ),
          appliedCouponCode: "",
          discountAmount: 0,
          trustedSubtotal: null,
          trustedTotal: null,
          couponMessage,
          couponError: "",
        }));

        const userId = getUserId(user);
        if (!userId) return;

        try {
          const response = await removeCartItemApi(
            getCartItemPayload(productId, 1, selectedOptions),
          );
          get().setCartFromBackend(response.cart, userId);
        } catch (error) {
          try {
            await get().hydrateCartFromBackend(userId);
          } catch {
            set({ cart: previousCart });
          }
          throw error;
        }
      },
      increaseQuantity: (productId, selectedOptions, user) => {
        let nextQuantity = 0;
        const couponMessage = get().appliedCouponCode
          ? "Cart changed. Apply coupon again."
          : get().couponMessage;

        set((state) => ({
          cart: state.cart.map((item) => {
            if (!matchesCartItem(item, productId, selectedOptions)) return item;

            const currentQuantity = item.quantity || 1;
            nextQuantity = currentQuantity + 1;
            return {
              ...item,
              quantity: nextQuantity,
            };
          }),
          appliedCouponCode: "",
          discountAmount: 0,
          trustedSubtotal: null,
          trustedTotal: null,
          couponMessage,
          couponError: "",
        }));

        const userId = getUserId(user);
        if (!userId || nextQuantity <= 0) return;

        void updateCartItemQuantityApi(
          getCartItemPayload(productId, nextQuantity, selectedOptions),
        ).catch(() => get().hydrateCartFromBackend(userId));
      },
      decreaseQuantity: (productId, selectedOptions, user) => {
        let nextQuantity = 0;
        const couponMessage = get().appliedCouponCode
          ? "Cart changed. Apply coupon again."
          : get().couponMessage;

        set((state) => ({
          cart: state.cart
            .map((item) => {
              if (!matchesCartItem(item, productId, selectedOptions)) {
                return item;
              }

              const currentQuantity = item.quantity || 1;
              nextQuantity = currentQuantity - 1;
              return {
                ...item,
                quantity: nextQuantity,
              };
            })
            .filter((item) => (item.quantity ?? 1) > 0),
          appliedCouponCode: "",
          discountAmount: 0,
          trustedSubtotal: null,
          trustedTotal: null,
          couponMessage,
          couponError: "",
        }));

        const userId = getUserId(user);
        if (!userId) return;

        const payload = getCartItemPayload(productId, 1, selectedOptions);
        const request =
          nextQuantity > 0
            ? updateCartItemQuantityApi({
                ...payload,
                quantity: nextQuantity,
              })
            : removeCartItemApi(payload);

        void request.catch(() => get().hydrateCartFromBackend(userId));
      },
      clearCart: async (user) => {
        const userId = getUserId(user);
        set((state) => ({
          cart: [],
          syncedUserId: userId ? state.syncedUserId : null,
          appliedCouponCode: "",
          discountAmount: 0,
          trustedSubtotal: null,
          trustedTotal: null,
          couponMessage: "",
          couponError: "",
        }));

        if (!userId) return;

        try {
          await clearCartApi();
        } catch {
          await get().hydrateCartFromBackend(userId);
        }
      },
      isInCart: (productId, selectedOptions) => {
        return get().cart.some((item) =>
          matchesCartItem(item, productId, selectedOptions),
        );
      },
    }),
    {
      name: "zuzi_cart",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
        syncedUserId: state.syncedUserId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydratedStorage(true);
      },
    },
  ),
);
