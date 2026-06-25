"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  Edit3,
  Eye,
  Loader2,
  PackageOpen,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { ProductPreviewDrawer } from "@/components/products/product-preview-drawer";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useProduct } from "@/hooks/useProduct";
import { SellerProduct, SellerProductOptionGroup } from "@/types/product";
import { getProductThumbnail } from "@/utils/image-assets";
import toast from "react-hot-toast";

const PRODUCT_PLACEHOLDER_IMAGE = "/images/product-placeholder.png";
const PRODUCTS_LIMIT = 10;
const productTableGridClass =
  "2xl:grid-cols-[64px_minmax(180px,1.15fr)_minmax(90px,0.75fr)_120px_78px_78px_58px_88px_92px_78px_136px]";

const statusOptions = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
  { value: "archived", label: "Archived" },
];

const stockStateOptions = [
  { value: "all", label: "All stock" },
  { value: "in-stock", label: "In stock" },
  { value: "low-stock", label: "Low stock" },
  { value: "out-of-stock", label: "Out of stock" },
];

const sortOptions = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "price-low", label: "Price low to high" },
  { value: "price-high", label: "Price high to low" },
  { value: "stock-low", label: "Stock low to high" },
  { value: "stock-high", label: "Stock high to low" },
  { value: "name-az", label: "Name A-Z" },
  { value: "name-za", label: "Name Z-A" },
];

const filterControlClass =
  "h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

const formatPrice = (price: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(price) ? price : 0);

const formatDate = (date?: string) => {
  if (!date) return "Not available";

  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
};

const getStatusLabel = (product: SellerProduct) => {
  if (product.isDeleted) return "Archived";
  if (product.stock <= 0) return "Out of stock";
  return product.status;
};

const getStatusClass = (product: SellerProduct) => {
  if (product.isDeleted) return "bg-slate-100 text-slate-700";
  if (product.stock <= 0) return "bg-red-50 text-red-700";

  switch (product.status) {
    case "Active":
      return "bg-emerald-50 text-emerald-700";
    case "Draft":
      return "bg-slate-100 text-slate-700";
    case "Pending":
    default:
      return "bg-amber-50 text-amber-700";
  }
};

const getOptionGroups = (product: SellerProduct) => {
  const groups: SellerProductOptionGroup[] = [];
  const seenNames = new Set<string>();
  const customGroups = product.custom_properties?.optionGroups;

  if (Array.isArray(customGroups)) {
    customGroups.forEach((group) => {
      if (
        !group.name ||
        !Array.isArray(group.values) ||
        group.values.length === 0
      ) {
        return;
      }

      const key = group.name.toLowerCase();
      if (seenNames.has(key)) return;

      seenNames.add(key);
      groups.push(group);
    });
  }

  if (!seenNames.has("color") && product.colors?.length > 0) {
    groups.push({
      id: "legacy-color",
      name: "Color",
      values: product.colors,
      required: false,
    });
  }

  if (!seenNames.has("size") && product.sizes?.length > 0) {
    groups.push({
      id: "legacy-size",
      name: "Size",
      values: product.sizes,
      required: false,
    });
  }

  return groups;
};

const getOptionsSummary = (product: SellerProduct) => {
  const groups = getOptionGroups(product);

  if (groups.length === 0) return "No options";

  return groups
    .map((group) => `${group.name} (${group.values.length})`)
    .join(", ");
};

function ProductsTableSkeleton() {
  return (
    <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="max-w-full overflow-x-auto">
        <div className="2xl:min-w-[1120px]">
          <div
            className={`hidden border-b border-slate-200 bg-slate-50 px-4 py-3 2xl:grid ${productTableGridClass} 2xl:gap-2`}
          >
            {Array.from({ length: 11 }, (_, index) => (
              <div
                key={index}
                className="h-3 animate-pulse rounded bg-slate-200"
              />
            ))}
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className={`grid min-w-0 gap-4 p-4 2xl:grid ${productTableGridClass} 2xl:items-center 2xl:gap-2`}
              >
                <div className="h-16 w-16 animate-pulse rounded-xl bg-slate-200" />
                {Array.from({ length: 10 }, (_, columnIndex) => (
                  <div
                    key={columnIndex}
                    className="h-4 min-w-0 animate-pulse rounded bg-slate-200"
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProductListPage() {
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [stockStateFilter, setStockStateFilter] = useState("all");
  const [sort, setSort] = useState("newest");
  const [previewProduct, setPreviewProduct] = useState<SellerProduct | null>(
    null,
  );
  const [productPendingDelete, setProductPendingDelete] =
    useState<SellerProduct | null>(null);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 350);
  const { getShopProducts, deleteProduct, restoreProduct } = useProduct();
  const queryParams = useMemo(
    () => ({
      page,
      limit: PRODUCTS_LIMIT,
      q: debouncedSearchTerm,
      category: categoryFilter,
      status: statusFilter,
      stockState: stockStateFilter,
      sort,
    }),
    [
      categoryFilter,
      debouncedSearchTerm,
      page,
      sort,
      statusFilter,
      stockStateFilter,
    ],
  );
  const { data, isLoading, isError, isFetching, refetch } =
    getShopProducts(queryParams);
  const products = data?.products || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;
  const totalProducts =
    pagination?.totalItems ?? pagination?.totalCount ?? products.length;
  const categoryOptions = data?.filters?.categories || [];
  const hasActiveFilters =
    searchTerm.trim().length > 0 ||
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    stockStateFilter !== "all" ||
    sort !== "newest";
  const hasPreviousPage = pagination?.hasPreviousPage ?? page > 1;
  const hasNextPage = pagination?.hasNextPage ?? page < totalPages;

  const productStats = useMemo(
    () => ({
      total: totalProducts,
      active: products.filter((product) => product.status === "Active").length,
      outOfStock: products.filter((product) => product.stock <= 0).length,
    }),
    [products, totalProducts],
  );

  const resetPageAndSet = (setter: (value: string) => void, value: string) => {
    setPage(1);
    setter(value);
  };

  const clearFilters = () => {
    setPage(1);
    setSearchTerm("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setStockStateFilter("all");
    setSort("newest");
  };

  const confirmDeleteProduct = async () => {
    if (!productPendingDelete) return;

    const product = productPendingDelete;
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success("Product deleted. You can restore it within 24 hours.");
      setProductPendingDelete(null);
      if (previewProduct?.id === product.id) {
        setPreviewProduct(null);
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to delete product";
      toast.error(message);
    }
  };

  const handleRestoreProduct = async (product: SellerProduct) => {
    try {
      await restoreProduct.mutateAsync(product.id);
      toast.success("Product restored");
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to restore product";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen min-w-0 max-w-full space-y-6 overflow-x-hidden p-4 text-slate-900 sm:p-6">
      <header className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-2xl font-semibold text-slate-950">
            Products
          </h1>
          <p className="mt-2 max-w-3xl break-words text-sm text-slate-500">
            Manage listings, stock, pricing, and product options from one place.
          </p>
        </div>
        <Link
          href="/dashboard/create-product"
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Create product
        </Link>
      </header>

      <section className="grid min-w-0 gap-3 md:grid-cols-3">
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total products
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {productStats.total}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Active on page
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {productStats.active}
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Out of stock
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {productStats.outOfStock}
          </p>
        </div>
      </section>

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-950">
              All products
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {pagination
                ? `${totalProducts} products found`
                : "Loading product list"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {isFetching && !isLoading ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Updating
              </span>
            ) : null}
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                <XCircle className="h-4 w-4" />
                Clear filters
              </button>
            ) : null}
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <SlidersHorizontal className="h-4 w-4" />
            Search and filters
          </div>
          <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(145px,1fr))]">
            <label className="relative min-w-0">
              <span className="sr-only">Search products</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={searchTerm}
                onChange={(event) => {
                  setPage(1);
                  setSearchTerm(event.target.value);
                }}
                placeholder="Search title, slug, category..."
                className={`${filterControlClass} w-full pl-9`}
              />
            </label>

            <label className="min-w-0">
              <span className="sr-only">Category filter</span>
              <select
                value={categoryFilter}
                onChange={(event) =>
                  resetPageAndSet(setCategoryFilter, event.target.value)
                }
                className={`${filterControlClass} w-full`}
              >
                <option value="all">All categories</option>
                {categoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="sr-only">Status filter</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  resetPageAndSet(setStatusFilter, event.target.value)
                }
                className={`${filterControlClass} w-full`}
              >
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0">
              <span className="sr-only">Stock filter</span>
              <select
                value={stockStateFilter}
                onChange={(event) =>
                  resetPageAndSet(setStockStateFilter, event.target.value)
                }
                className={`${filterControlClass} w-full`}
              >
                {stockStateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="min-w-0 xl:col-span-2">
              <span className="sr-only">Sort products</span>
              <select
                value={sort}
                onChange={(event) => resetPageAndSet(setSort, event.target.value)}
                className={`${filterControlClass} w-full`}
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    Sort: {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {isLoading ? <ProductsTableSkeleton /> : null}

        {isError ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center">
            <AlertCircle className="mx-auto h-8 w-8 text-red-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-950">
              Unable to load products
            </h3>
            <p className="mt-2 text-sm text-slate-500">Please try again.</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </button>
          </div>
        ) : null}

        {!isLoading && !isError && products.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <PackageOpen className="mx-auto h-10 w-10 text-slate-400" />
            <h3 className="mt-4 text-lg font-semibold text-slate-950">
              {hasActiveFilters
                ? "No products match your filters"
                : "No products yet"}
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {hasActiveFilters
                ? "Try a different search, filter, or sort combination."
                : "Create your first listing to start selling through the marketplace."}
            </p>
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={clearFilters}
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
              >
                <XCircle className="h-4 w-4" />
                Clear filters
              </button>
            ) : (
              <Link
                href="/dashboard/create-product"
                className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
              >
                <Plus className="h-4 w-4" />
                Create product
              </Link>
            )}
          </div>
        ) : null}

        {!isLoading && !isError && products.length > 0 ? (
          <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="max-w-full overflow-x-auto">
              <div className="2xl:min-w-[1120px]">
                <div
                  className={`hidden border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 2xl:grid ${productTableGridClass} 2xl:items-center 2xl:gap-2`}
                >
                  <span>Image</span>
                  <span>Product</span>
                  <span>Slug</span>
                  <span>Category</span>
                  <span>Regular</span>
                  <span>Sale</span>
                  <span>Stock</span>
                  <span>Status</span>
                  <span>Options</span>
                  <span>Updated</span>
                  <span className="text-right">Actions</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {products.map((product) => {
                    const thumbnail =
                      getProductThumbnail(product) ||
                      PRODUCT_PLACEHOLDER_IMAGE;

                    return (
                      <article
                        key={product.id}
                        className={`grid min-w-0 gap-4 p-4 2xl:grid ${productTableGridClass} 2xl:items-center 2xl:gap-2`}
                      >
                        <button
                          type="button"
                          onClick={() => setPreviewProduct(product)}
                          className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                          aria-label={`Preview ${product.title}`}
                        >
                          <img
                            src={thumbnail}
                            alt={product.title}
                            className="h-full w-full object-cover"
                          />
                        </button>

                        <div className="min-w-0">
                          <button
                            type="button"
                            onClick={() => setPreviewProduct(product)}
                            className="line-clamp-2 text-left text-sm font-semibold text-slate-950 transition hover:text-emerald-700"
                          >
                            {product.title}
                          </button>
                          <p className="mt-1 line-clamp-2 text-xs text-slate-500 2xl:hidden">
                            {product.short_description}
                          </p>
                        </div>

                        <p className="min-w-0 truncate text-sm text-slate-500">
                          {product.slug}
                        </p>

                        <div className="min-w-0 text-sm text-slate-700">
                          <p className="truncate font-semibold">
                            {product.category || "Uncategorized"}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {product.subCategory || "No subcategory"}
                          </p>
                        </div>

                        <p className="text-sm font-semibold text-slate-700">
                          {formatPrice(product.regular_price)}
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {formatPrice(product.sale_price)}
                        </p>
                        <p className="text-sm font-semibold text-slate-700">
                          {product.stock}
                        </p>

                        <div>
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${getStatusClass(
                              product,
                            )}`}
                          >
                            {getStatusLabel(product)}
                          </span>
                        </div>

                        <p className="min-w-0 break-words text-xs text-slate-400 2xl:line-clamp-2">
                          {getOptionsSummary(product)}
                        </p>

                        <p className="text-xs text-slate-500">
                          {formatDate(product.updatedAt)}
                        </p>

                        <div className="flex min-w-0 flex-nowrap justify-start gap-2 2xl:justify-end">
                          <button
                            type="button"
                            onClick={() => setPreviewProduct(product)}
                            aria-label={`Preview ${product.title}`}
                            title="Preview product"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <Link
                            href={`/dashboard/products/${product.id}/edit`}
                            aria-label={`Edit ${product.title}`}
                            title="Edit product"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-300/30"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Link>
                          {product.isDeleted ? (
                            <button
                              type="button"
                              onClick={() => handleRestoreProduct(product)}
                              disabled={restoreProduct.isPending}
                              aria-label={`Restore ${product.title}`}
                              title="Restore product"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-100 text-emerald-700 transition hover:border-emerald-200 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setProductPendingDelete(product)}
                              disabled={deleteProduct.isPending}
                              aria-label={`Delete ${product.title}`}
                              title="Delete product"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 2xl:hidden">
                          Updated {formatDate(product.updatedAt)}
                        </p>
                      </article>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {pagination && totalPages > 1 ? (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Page {pagination.currentPage} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={!hasPreviousPage || isFetching}
              >
                Previous
              </button>
              <button
                type="button"
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() =>
                  setPage((current) => Math.min(totalPages, current + 1))
                }
                disabled={!hasNextPage || isFetching}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <ProductPreviewDrawer
        product={previewProduct}
        onClose={() => setPreviewProduct(null)}
      />

      {productPendingDelete ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-6 backdrop-blur-sm">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-product-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="delete-product-title"
                    className="text-lg font-semibold text-slate-950"
                  >
                    Delete product?
                  </h2>
                  <p className="mt-1 line-clamp-2 text-sm font-medium text-slate-600">
                    {productPendingDelete.title}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProductPendingDelete(null)}
                disabled={deleteProduct.isPending}
                aria-label="Close delete product dialog"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 space-y-3 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-900">
              <p>This product will be hidden from public listings immediately.</p>
              <p>You can restore it from the Archived filter within 24 hours.</p>
              <p>After 24 hours, the cleanup job permanently deletes it.</p>
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setProductPendingDelete(null)}
                disabled={deleteProduct.isPending}
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={deleteProduct.isPending}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deleteProduct.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete product
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
