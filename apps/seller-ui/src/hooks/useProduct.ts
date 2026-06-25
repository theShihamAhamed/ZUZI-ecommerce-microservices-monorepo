import {
  createDiscountCodeApi,
  createProductApi,
  deleteDiscountCodeApi,
  deleteProductImageApi,
  deleteProductApi,
  getCategoriesApi,
  getDiscountCodesApi,
  getSellerProductApi,
  getShopProductsApi,
  restoreProductApi,
  updateProductApi,
  uploadProductImageApi,
} from "@/services/product.api";
import {
  SellerProductsQueryParams,
  SellerProductUpdatePayload,
} from "@/types/product";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export const productQueryKeys = {
  categories: ["categories"] as const,
  discountCodes: ["discount-codes"] as const,
  shopProducts: (params: SellerProductsQueryParams) =>
    ["shop-products", params] as const,
  shopProductsRoot: ["shop-products"] as const,
  sellerProduct: (id: string) => ["seller-product", id] as const,
};

export const useProduct = () => {
  const queryClient = useQueryClient();

  /* ------------------ GET CATEGORIES ------------------ */
  const getCategories = useQuery({
    queryKey: productQueryKeys.categories,
    queryFn: getCategoriesApi,
    retry: 2,
    staleTime: 1000 * 60 * 5,
  });

  /* ------------------ GET DISCOUNT CODES ------------------ */
  const getDiscountCodes = useQuery({
    queryKey: productQueryKeys.discountCodes,
    queryFn: getDiscountCodesApi,
  });

  /* ------------------ CREATE DISCOUNT CODE ------------------ */
  const createDiscountCode = useMutation({
    mutationFn: createDiscountCodeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.discountCodes });
    },
  });

  /* ------------------ DELETE DISCOUNT CODE ------------------ */
  const deleteDiscountCode = useMutation({
    mutationFn: deleteDiscountCodeApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productQueryKeys.discountCodes });
    },
  });

  /* ------------------ UPLOAD IMAGE ------------------ */
  const uploadImage = useMutation({
    mutationFn: uploadProductImageApi,
  });

  const deleteImage = useMutation({
    mutationFn: deleteProductImageApi,
  });

  const createProduct = useMutation({
    mutationFn: createProductApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.shopProductsRoot,
      });
    },
  });

  const updateProduct = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: SellerProductUpdatePayload;
    }) =>
      updateProductApi(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.shopProductsRoot,
      });
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.sellerProduct(variables.id),
      });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: (id: string) => deleteProductApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.shopProductsRoot,
      });
    },
  });

  const restoreProduct = useMutation({
    mutationFn: (id: string) => restoreProductApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.shopProductsRoot,
      });
    },
  });

  /* ------------------ GET SHOP PRODUCTS ------------------ */
  const getShopProducts = (params: SellerProductsQueryParams = {}) =>
    useQuery({
      queryKey: productQueryKeys.shopProducts(params),
      queryFn: () => getShopProductsApi(params),
      placeholderData: (previousData) => previousData,
    });

  const getSellerProduct = (id: string) =>
    useQuery({
      queryKey: productQueryKeys.sellerProduct(id),
      queryFn: () => getSellerProductApi(id),
      enabled: Boolean(id),
    });

  return {
    getCategories,
    getDiscountCodes,
    createDiscountCode,
    deleteDiscountCode,
    uploadImage,
    deleteImage,
    createProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    getShopProducts,
    getSellerProduct,
  };
};
