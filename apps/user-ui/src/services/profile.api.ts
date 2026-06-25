import axiosInstance from "@/libs/axios";
import {
  CustomerProfile,
  ProfileImageUploadResponse,
  ProfileResponse,
  ShippingAddress,
  ShippingAddressInput,
  ShippingAddressResponse,
  ShippingAddressesResponse,
  UpdateProfileInput,
} from "@/types/profile";

const getGatewayUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_SERVER_URI;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URI is not configured");
  }

  return apiUrl.replace(/\/$/, "");
};

export const getMeApi = async (): Promise<CustomerProfile> => {
  const res = await axiosInstance.get<ProfileResponse>("/me");
  return res.data.user;
};

export const updateMeApi = async (
  data: UpdateProfileInput,
): Promise<CustomerProfile> => {
  const res = await axiosInstance.patch<ProfileResponse>("/me", data);
  return res.data.user;
};

export const uploadProfileAvatarApi = async (
  file: File,
): Promise<ProfileImageUploadResponse> => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await axiosInstance.post<ProfileImageUploadResponse>(
    `${getGatewayUrl()}/product/api/upload-image`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );

  return res.data;
};

export const logoutApi = async () => {
  const res = await axiosInstance.post("/logout");
  return res.data;
};

export const getShippingAddressesApi = async (): Promise<
  ShippingAddress[]
> => {
  const res =
    await axiosInstance.get<ShippingAddressesResponse>("/me/addresses");
  return res.data.addresses;
};

export const createShippingAddressApi = async (
  data: ShippingAddressInput,
): Promise<ShippingAddress> => {
  const res = await axiosInstance.post<ShippingAddressResponse>(
    "/me/addresses",
    data,
  );
  return res.data.address;
};

export const updateShippingAddressApi = async ({
  id,
  data,
}: {
  id: string;
  data: ShippingAddressInput;
}): Promise<ShippingAddress> => {
  const res = await axiosInstance.patch<ShippingAddressResponse>(
    `/me/addresses/${id}`,
    data,
  );
  return res.data.address;
};

export const deleteShippingAddressApi = async (id: string) => {
  const res = await axiosInstance.delete(`/me/addresses/${id}`);
  return res.data;
};

export const setDefaultShippingAddressApi = async (
  id: string,
): Promise<ShippingAddress> => {
  const res = await axiosInstance.patch<ShippingAddressResponse>(
    `/me/addresses/${id}/default`,
  );
  return res.data.address;
};
