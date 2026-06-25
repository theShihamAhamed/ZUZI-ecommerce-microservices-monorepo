import axiosInstance from "@/libs/axios";
import { CartItem, SelectedProductOptions } from "@/types/product";

export interface CartItemPayload {
  productId: string;
  quantity: number;
  selectedOptions?: SelectedProductOptions | null;
  selectedOptionsKey?: string;
}

export interface CartResponse {
  success: boolean;
  cart: CartItem[];
  subtotal: number;
}

export interface CartSummaryInput {
  items?: CartItemPayload[];
  couponCode?: string;
}

export interface CartCouponSummary {
  code: string;
  valid: boolean;
  message: string;
  eligibleSubtotal: number;
  discountAmount: number;
}

export interface CartSummaryData {
  subtotal: number;
  discountAmount: number;
  total: number;
  currency: string;
  coupon: CartCouponSummary | null;
  items: Array<{
    productId: string;
    title: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    discountAmount: number;
    total: number;
    selectedOptions?: SelectedProductOptions | null;
  }>;
}

export interface CartSummaryResponse {
  success: boolean;
  data: CartSummaryData;
}

const getCartApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_SERVER_URI;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URI is not configured");
  }

  return `${apiUrl}/order/api/cart`;
};

export const getCartApi = async (): Promise<CartResponse> => {
  const res = await axiosInstance.get<CartResponse>(getCartApiBaseUrl());
  return res.data;
};

export const addCartItemApi = async (
  data: CartItemPayload,
): Promise<CartResponse> => {
  const res = await axiosInstance.post<CartResponse>(
    `${getCartApiBaseUrl()}/items`,
    data,
  );

  return res.data;
};

export const updateCartItemQuantityApi = async (
  data: CartItemPayload,
): Promise<CartResponse> => {
  const res = await axiosInstance.patch<CartResponse>(
    `${getCartApiBaseUrl()}/items`,
    data,
  );

  return res.data;
};

export const removeCartItemApi = async (
  data: Pick<
    CartItemPayload,
    "productId" | "selectedOptions" | "selectedOptionsKey"
  >,
): Promise<CartResponse> => {
  const res = await axiosInstance.delete<CartResponse>(
    `${getCartApiBaseUrl()}/items`,
    {
      data,
    },
  );

  return res.data;
};

export const clearCartApi = async (): Promise<CartResponse> => {
  const res = await axiosInstance.delete<CartResponse>(getCartApiBaseUrl());
  return res.data;
};

export const syncCartApi = async (
  items: CartItemPayload[],
): Promise<CartResponse> => {
  const res = await axiosInstance.post<CartResponse>(
    `${getCartApiBaseUrl()}/sync`,
    { items },
  );

  return res.data;
};

export const getCartSummaryApi = async (
  data: CartSummaryInput,
): Promise<CartSummaryResponse> => {
  const res = await axiosInstance.post<CartSummaryResponse>(
    `${getCartApiBaseUrl()}/summary`,
    data,
  );

  return res.data;
};
