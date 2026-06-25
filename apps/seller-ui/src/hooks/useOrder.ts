"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSellerOrderDetailApi,
  getSellerOrdersApi,
  updateSellerOrderStatusApi,
} from "@/services/order.api";
import {
  SellerOrdersQueryParams,
  SellerOrderStatus,
} from "@/types/order";

export const sellerOrdersQueryKey = (params: SellerOrdersQueryParams) =>
  ["seller-orders", params] as const;

export const sellerOrderDetailQueryKey = (orderId: string) =>
  ["seller-order", orderId] as const;

export const useSellerOrders = (params: SellerOrdersQueryParams = {}) => {
  return useQuery({
    queryKey: sellerOrdersQueryKey(params),
    queryFn: () => getSellerOrdersApi(params),
    placeholderData: (previousData) => previousData,
    retry: 1,
  });
};

export const useSellerOrderDetail = (orderId: string) => {
  return useQuery({
    queryKey: sellerOrderDetailQueryKey(orderId),
    queryFn: () => getSellerOrderDetailApi(orderId),
    enabled: Boolean(orderId),
    retry: false,
  });
};

export const useUpdateSellerOrderStatus = (orderId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (status: SellerOrderStatus) =>
      updateSellerOrderStatusApi({ orderId, status }),
    onSuccess: (data) => {
      queryClient.setQueryData(sellerOrderDetailQueryKey(orderId), data);
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
    },
  });
};
