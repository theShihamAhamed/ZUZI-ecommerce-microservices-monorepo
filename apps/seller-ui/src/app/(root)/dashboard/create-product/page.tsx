"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ProductForm } from "@/components/products/product-form";
import { productQueryKeys } from "@/hooks/useProduct";
import { createProductApi } from "@/services/product.api";
import { SellerProductUpdatePayload } from "@/types/product";
import toast from "react-hot-toast";

export default function CreateProductPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createProduct = useMutation({
    mutationFn: createProductApi,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: productQueryKeys.shopProductsRoot,
      });
    },
  });

  const handleCreateProduct = async (payload: SellerProductUpdatePayload) => {
    await createProduct.mutateAsync(payload);
    toast.success("Product created successfully");
    router.push("/dashboard/products");
  };

  return (
    <ProductForm
      mode="create"
      title="Create Product"
      currentBreadcrumb="Create Product"
      submitLabel="Create product"
      pendingLabel="Creating..."
      onSubmit={handleCreateProduct}
    />
  );
}

