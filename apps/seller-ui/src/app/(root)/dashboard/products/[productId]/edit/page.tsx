"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { ProductForm } from "@/components/products/product-form";
import { useProduct } from "@/hooks/useProduct";
import { SellerProductUpdatePayload } from "@/types/product";
import toast from "react-hot-toast";

export default function EditProductPage() {
  const params = useParams<{ productId: string }>();
  const router = useRouter();
  const productId = params.productId;
  const { getSellerProduct, updateProduct } = useProduct();
  const productQuery = getSellerProduct(productId);
  const product = productQuery.data?.product || null;

  const handleUpdateProduct = async (payload: SellerProductUpdatePayload) => {
    await updateProduct.mutateAsync({
      id: productId,
      data: payload,
    });
    toast.success("Product updated successfully");
    router.push("/dashboard/products");
  };

  if (productQuery.isLoading) {
    return (
      <div className="min-h-screen p-6 text-slate-900">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            Loading product
          </h1>
        </div>
      </div>
    );
  }

  if (productQuery.isError || !product) {
    const status = (productQuery.error as any)?.response?.status;

    return (
      <div className="min-h-screen p-6 text-slate-900">
        <Link
          href="/dashboard/products"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-emerald-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
          <h1 className="mt-4 text-xl font-semibold text-slate-950">
            {status === 404 ? "Product not found" : "Unable to load product"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            {status === 404
              ? "This product is not available for your shop."
              : "Please try again."}
          </p>
          {status !== 404 ? (
            <button
              type="button"
              onClick={() => productQuery.refetch()}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <ProductForm
      mode="edit"
      title="Edit Product"
      currentBreadcrumb={product.title}
      product={product}
      submitLabel="Save changes"
      pendingLabel="Saving..."
      onSubmit={handleUpdateProduct}
    />
  );
}
