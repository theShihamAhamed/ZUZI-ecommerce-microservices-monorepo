import axiosInstance from "@/lib/axios";
import { SellerShopAnalyticsResponse } from "@/types/shop-analytics";

export const getSellerShopAnalyticsApi =
  async (): Promise<SellerShopAnalyticsResponse> => {
    const res = await axiosInstance.get<SellerShopAnalyticsResponse>(
      "/product/api/seller/shop/analytics",
    );

    return res.data;
  };
