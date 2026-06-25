import { AxiosError } from "axios";
import axiosInstance from "@/libs/axios";
import {
  CreatePaymentSessionInput,
  CreatePaymentSessionResponse,
  MyOrderDetailResponse,
  MyOrdersResponse,
  VerifyPaymentSessionResponse,
} from "@/types/order";

const getOrderApiBaseUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_SERVER_URI;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URI is not configured");
  }

  return `${apiUrl}/order/api`;
};

export const createPaymentSessionApi = async (
  data: CreatePaymentSessionInput,
): Promise<CreatePaymentSessionResponse> => {
  const res = await axiosInstance.post<CreatePaymentSessionResponse>(
    `${getOrderApiBaseUrl()}/create-payment-session`,
    data,
  );

  return res.data;
};

export const verifyPaymentSessionApi = async (
  sessionId: string,
): Promise<VerifyPaymentSessionResponse> => {
  try {
    const res = await axiosInstance.get<VerifyPaymentSessionResponse>(
      `${getOrderApiBaseUrl()}/verifying-payment-session`,
      {
        params: { sessionId },
      },
    );

    return res.data;
  } catch (error) {
    const axiosError = error as AxiosError<VerifyPaymentSessionResponse>;

    if (axiosError.response?.status === 404 && axiosError.response.data) {
      return axiosError.response.data;
    }

    throw error;
  }
};

export const getMyOrdersApi = async ({
  page = 1,
  limit = 10,
  status,
}: {
  page?: number;
  limit?: number;
  status?: string;
} = {}): Promise<MyOrdersResponse> => {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));

  if (status) {
    params.set("status", status);
  }

  const res = await axiosInstance.get<MyOrdersResponse>(
    `${getOrderApiBaseUrl()}/my-orders?${params.toString()}`,
  );

  return res.data;
};

export const getMyOrderDetailApi = async (
  orderId: string,
): Promise<MyOrderDetailResponse> => {
  const res = await axiosInstance.get<MyOrderDetailResponse>(
    `${getOrderApiBaseUrl()}/my-orders/${orderId}`,
  );

  return res.data;
};
