import axiosInstance from "@/lib/axios";
import {
  SellerPaymentsQueryParams,
  SellerPaymentsResponse,
  SellerPaymentsSummaryResponse,
} from "@/types/payment";

export const getSellerPaymentsSummaryApi =
  async (): Promise<SellerPaymentsSummaryResponse> => {
    const res = await axiosInstance.get<SellerPaymentsSummaryResponse>(
      "/order/api/seller/payments/summary",
    );

    return res.data;
  };

export const getSellerPaymentsApi = async ({
  page = 1,
  limit = 10,
  status,
  sort,
  dateFrom,
  dateTo,
}: SellerPaymentsQueryParams = {}): Promise<SellerPaymentsResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (sort && sort !== "newest") {
    params.set("sort", sort);
  }

  if (dateFrom) {
    params.set("dateFrom", dateFrom);
  }

  if (dateTo) {
    params.set("dateTo", dateTo);
  }

  const res = await axiosInstance.get<SellerPaymentsResponse>(
    `/order/api/seller/payments?${params.toString()}`,
  );

  return res.data;
};
