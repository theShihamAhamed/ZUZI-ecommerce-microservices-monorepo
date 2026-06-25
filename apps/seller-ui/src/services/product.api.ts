import axiosInstance from "@/lib/axios";
import {
  SellerProductResponse,
  SellerProductsResponse,
  SellerProductsQueryParams,
  SellerProductUpdatePayload,
} from "@/types/product";

/* ------------------ CATEGORIES ------------------ */

export const getCategoriesApi = async () => {
  const res = await axiosInstance.get("/product/api/get-categories");
  return res.data;
};

/* ------------------ DISCOUNT CODES ------------------ */

export const getDiscountCodesApi = async () => {
  const res = await axiosInstance.get("/product/api/get-discount-codes");
  return res.data;
};

export const createDiscountCodeApi = async (data: any) => {
  const res = await axiosInstance.post(
    "/product/api/create-discount-code",
    data,
  );
  return res.data;
};

export const deleteDiscountCodeApi = async (id: string) => {
  const res = await axiosInstance.delete(
    `/product/api/delete-discount-code?id=${id}`,
  );
  return res.data;
};

export const uploadProductImageApi = async (file: File) => {
  const formData = new FormData();
  formData.append("image", file);

  const res = await axiosInstance.post("/product/api/upload-image", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data;
};

/* ------------------ DELETE IMAGE ------------------ */
export const deleteProductImageApi = async (fileId: string) => {
  const res = await axiosInstance.post("/product/api/delete-image", { fileId });
  return res.data;
};

export const createProductApi = async (data: any) => {
  const res = await axiosInstance.post("/product/api/create-product", data);
  return res.data;
};

export const getShopProductsApi = async (
  params: SellerProductsQueryParams = {},
): Promise<SellerProductsResponse> => {
  const {
    page = 1,
    limit = 10,
    q,
    category,
    status,
    stockState,
    eventState,
    sort,
  } = params;
  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (q?.trim()) qs.set("q", q.trim());
  if (category && category !== "all") qs.set("category", category);
  if (status && status !== "all") qs.set("status", status);
  if (stockState && stockState !== "all") qs.set("stockState", stockState);
  if (eventState) qs.set("eventState", eventState);
  if (sort && sort !== "newest") qs.set("sort", sort);

  const res = await axiosInstance.get(
    `/product/api/get-shop-products?${qs.toString()}`,
  );
  return res.data;
};

export const getSellerProductApi = async (
  id: string,
): Promise<SellerProductResponse> => {
  const res = await axiosInstance.get(`/product/api/seller/products/${id}`);
  return res.data;
};

export const updateProductApi = async (
  id: string,
  data: SellerProductUpdatePayload,
): Promise<SellerProductResponse> => {
  const res = await axiosInstance.patch(
    `/product/api/seller/products/${id}`,
    data,
  );
  return res.data;
};

export const deleteProductApi = async (id: string) => {
  const res = await axiosInstance.post(`/product/api/delete-product`, { id });
  return res.data;
};

export const restoreProductApi = async (id: string) => {
  const res = await axiosInstance.patch(
    `/product/api/restore-product?id=${encodeURIComponent(id)}`,
  );
  return res.data;
};
