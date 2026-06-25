"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getSellerPaymentsApi,
  getSellerPaymentsSummaryApi,
} from "@/services/payment.api";
import { SellerPaymentsQueryParams } from "@/types/payment";

export const sellerPaymentsQueryKey = (params: SellerPaymentsQueryParams) =>
  ["seller-payments", params] as const;

export const sellerPaymentsSummaryQueryKey = ["seller-payments-summary"] as const;

export const useSellerPaymentsSummary = () => {
  return useQuery({
    queryKey: sellerPaymentsSummaryQueryKey,
    queryFn: getSellerPaymentsSummaryApi,
    retry: 1,
  });
};

export const useSellerPayments = (
  params: SellerPaymentsQueryParams = {},
) => {
  return useQuery({
    queryKey: sellerPaymentsQueryKey(params),
    queryFn: () => getSellerPaymentsApi(params),
    placeholderData: (previousData) => previousData,
    retry: 1,
  });
};
