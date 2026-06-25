import axiosInstance from "@/lib/axios";
import {
  CreateSellerEventPayload,
  SellerEventResponse,
  SellerEventsQueryParams,
  SellerEventsResponse,
  UpdateSellerEventPayload,
} from "@/types/event";

export const getSellerEventsApi = async (
  params: SellerEventsQueryParams = {},
): Promise<SellerEventsResponse> => {
  const { page = 1, limit = 10, q, status, sort } = params;
  const qs = new URLSearchParams();

  qs.set("page", String(page));
  qs.set("limit", String(limit));
  if (q?.trim()) qs.set("q", q.trim());
  if (status && status !== "all") qs.set("status", status);
  if (sort && sort !== "newest") qs.set("sort", sort);

  const res = await axiosInstance.get(
    `/product/api/seller/events?${qs.toString()}`,
  );
  return res.data;
};

export const getSellerEventApi = async (
  eventId: string,
): Promise<SellerEventResponse> => {
  const res = await axiosInstance.get(`/product/api/seller/events/${eventId}`);
  return res.data;
};

export const createSellerEventApi = async (
  data: CreateSellerEventPayload,
): Promise<SellerEventResponse> => {
  const res = await axiosInstance.post("/product/api/seller/events", data);
  return res.data;
};

export const updateSellerEventApi = async (
  eventId: string,
  data: UpdateSellerEventPayload,
): Promise<SellerEventResponse> => {
  const res = await axiosInstance.patch(
    `/product/api/seller/events/${eventId}`,
    data,
  );
  return res.data;
};

export const deleteSellerEventApi = async (eventId: string) => {
  const res = await axiosInstance.delete(
    `/product/api/seller/events/${eventId}`,
  );
  return res.data;
};

export const restoreSellerEventApi = async (eventId: string) => {
  const res = await axiosInstance.patch(
    `/product/api/seller/events/${eventId}/restore`,
  );
  return res.data;
};
