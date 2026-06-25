import axiosInstance from "@/lib/axios";
import {
  SellerOrderDetailResponse,
  SellerOrdersResponse,
  SellerOrdersQueryParams,
  SellerOrderStatus,
} from "@/types/order";

export const getSellerOrdersApi = async ({
  page = 1,
  limit = 10,
  q,
  status,
  paymentStatus,
  dateFrom,
  dateTo,
  sort,
}: SellerOrdersQueryParams = {}): Promise<SellerOrdersResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (q?.trim()) {
    params.set("q", q.trim());
  }

  if (status && status !== "all") {
    params.set("status", status);
  }

  if (paymentStatus && paymentStatus !== "all") {
    params.set("paymentStatus", paymentStatus);
  }

  if (dateFrom) {
    params.set("dateFrom", dateFrom);
  }

  if (dateTo) {
    params.set("dateTo", dateTo);
  }

  if (sort && sort !== "newest") {
    params.set("sort", sort);
  }

  const res = await axiosInstance.get<SellerOrdersResponse>(
    `/order/api/seller/orders?${params.toString()}`,
  );

  return res.data;
};

export const getSellerOrderDetailApi = async (
  orderId: string,
): Promise<SellerOrderDetailResponse> => {
  const res = await axiosInstance.get<SellerOrderDetailResponse>(
    `/order/api/seller/orders/${orderId}`,
  );

  return res.data;
};

export const updateSellerOrderStatusApi = async ({
  orderId,
  status,
}: {
  orderId: string;
  status: SellerOrderStatus;
}): Promise<SellerOrderDetailResponse> => {
  const res = await axiosInstance.patch<SellerOrderDetailResponse>(
    `/order/api/seller/orders/${orderId}/status`,
    { status },
  );

  return res.data;
};
