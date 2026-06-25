import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSellerShopApi,
  updateSellerShopApi,
  uploadShopImageApi,
} from "@/services/shop.api";
import { SellerShopUpdatePayload } from "@/types/shop";

export const sellerShopQueryKey = ["seller-shop"] as const;
const sellerSessionQueryKey = ["seller"] as const;

export const useSellerShop = () => {
  return useQuery({
    queryKey: sellerShopQueryKey,
    queryFn: getSellerShopApi,
    retry: 1,
  });
};

export const useUpdateSellerShop = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SellerShopUpdatePayload) => updateSellerShopApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellerShopQueryKey });
      queryClient.invalidateQueries({ queryKey: sellerSessionQueryKey });
    },
  });
};

export const useUploadShopImage = () => {
  return useMutation({
    mutationFn: uploadShopImageApi,
  });
};
