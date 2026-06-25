"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  addCartItemApi,
  CartItemPayload,
  clearCartApi,
  getCartApi,
  getCartSummaryApi,
  removeCartItemApi,
  syncCartApi,
  updateCartItemQuantityApi,
} from "@/services/cart.api";
import { CartSummaryInput } from "@/services/cart.api";

export const cartQueryKey = ["cart"] as const;

export const useBackendCart = (enabled = true) => {
  return useQuery({
    queryKey: cartQueryKey,
    queryFn: getCartApi,
    enabled,
    retry: 1,
  });
};

export const useAddCartItem = () => {
  return useMutation({
    mutationFn: (data: CartItemPayload) => addCartItemApi(data),
  });
};

export const useUpdateCartItemQuantity = () => {
  return useMutation({
    mutationFn: (data: CartItemPayload) => updateCartItemQuantityApi(data),
  });
};

export const useRemoveCartItem = () => {
  return useMutation({
    mutationFn: (
      data: Pick<
        CartItemPayload,
        "productId" | "selectedOptions" | "selectedOptionsKey"
      >,
    ) => removeCartItemApi(data),
  });
};

export const useClearBackendCart = () => {
  return useMutation({
    mutationFn: clearCartApi,
  });
};

export const useSyncCart = () => {
  return useMutation({
    mutationFn: (items: CartItemPayload[]) => syncCartApi(items),
  });
};

export const useCartSummary = () => {
  return useMutation({
    mutationFn: (data: CartSummaryInput) => getCartSummaryApi(data),
  });
};
