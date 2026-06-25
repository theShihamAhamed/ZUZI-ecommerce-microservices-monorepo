import axiosInstance from "@/lib/axios";
import {
  SellerShopResponse,
  SellerShopUpdatePayload,
  ShopImageUploadResponse,
} from "@/types/shop";

export const getSellerShopApi = async (): Promise<SellerShopResponse> => {
  const res = await axiosInstance.get<SellerShopResponse>(
    "/product/api/seller/shop",
  );
  return res.data;
};

export const updateSellerShopApi = async (
  data: SellerShopUpdatePayload,
): Promise<SellerShopResponse> => {
  const res = await axiosInstance.patch<SellerShopResponse>(
    "/product/api/seller/shop",
    data,
  );
  return res.data;
};

export const uploadShopImageApi = async (
  file: File,
): Promise<ShopImageUploadResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await axiosInstance.post<ShopImageUploadResponse>(
    "/product/api/upload-image",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data;
};
