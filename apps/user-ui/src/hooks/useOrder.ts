"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  createPaymentSessionApi,
  getMyOrderDetailApi,
  getMyOrdersApi,
  verifyPaymentSessionApi,
} from "@/services/order.api";
import { CreatePaymentSessionInput } from "@/types/order";

export const paymentSessionQueryKey = (sessionId: string) =>
  ["payment-session", sessionId] as const;
export const myOrdersQueryKey = ({
  page,
  limit,
  status,
}: {
  page: number;
  limit: number;
  status?: string;
}) => ["my-orders", page, limit, status || "all"] as const;
export const myOrderDetailQueryKey = (orderId: string) =>
  ["my-order", orderId] as const;

export const useCreatePaymentSession = () => {
  return useMutation({
    mutationFn: (data: CreatePaymentSessionInput) =>
      createPaymentSessionApi(data),
  });
};

export const useVerifyPaymentSession = (
  sessionId: string,
  enabled = true,
) => {
  return useQuery({
    queryKey: paymentSessionQueryKey(sessionId),
    queryFn: () => verifyPaymentSessionApi(sessionId),
    enabled: enabled && Boolean(sessionId),
    retry: false,
    refetchInterval: (query) => {
      const data = query.state.data;

      if (
        data?.valid &&
        data.paymentStatus === "Succeeded" &&
        data.orderCreated === false
      ) {
        return 2000;
      }

      if (data?.valid && data.paymentStatus === "Pending") {
        return 3000;
      }

      return false;
    },
  });
};

export const useMyOrders = ({
  page = 1,
  limit = 10,
  status,
}: {
  page?: number;
  limit?: number;
  status?: string;
} = {}) => {
  return useQuery({
    queryKey: myOrdersQueryKey({ page, limit, status }),
    queryFn: () => getMyOrdersApi({ page, limit, status }),
    retry: 1,
  });
};

export const useMyOrderDetail = (orderId: string, enabled = true) => {
  return useQuery({
    queryKey: myOrderDetailQueryKey(orderId),
    queryFn: () => getMyOrderDetailApi(orderId),
    enabled: enabled && Boolean(orderId),
    retry: false,
  });
};
