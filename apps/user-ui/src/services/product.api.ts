import {
  EventProductsParams,
  EventProductsResponse,
  ProductDetailResponse,
  ProductFilters,
  ProductsResponse,
  SearchProductsParams,
  SearchProductsResponse,
  TopShopsParams,
  TopShopsResponse,
} from "@/types/product";
import {
  ShopDetailResponse,
  ShopEventsParams,
  ShopFilters,
  ShopProductsParams,
  ShopProductsResponse,
  ShopsResponse,
} from "@/types/shop";

interface GetProductsParams
  extends Pick<
    ProductFilters,
    | "page"
    | "limit"
    | "category"
    | "subCategory"
    | "excludeSlug"
    | "excludeProductId"
  > {
  type?: string;
}

const getApiUrl = () => {
  const apiUrl = process.env.NEXT_PUBLIC_SERVER_URI;

  if (!apiUrl) {
    throw new Error("NEXT_PUBLIC_SERVER_URI is not configured");
  }

  return apiUrl;
};

const appendQueryParam = (
  query: URLSearchParams,
  key: string,
  value: string | number | undefined,
) => {
  if (value !== undefined && value !== "") {
    query.set(key, String(value));
  }
};

export const getProductsApi = async ({
  page = 1,
  limit = 12,
  type = "suggested",
  category,
  subCategory,
  excludeSlug,
  excludeProductId,
}: GetProductsParams = {}): Promise<ProductsResponse> => {
  const apiUrl = getApiUrl();

  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    type,
  });

  appendQueryParam(query, "category", category);
  appendQueryParam(query, "subCategory", subCategory);
  appendQueryParam(query, "excludeSlug", excludeSlug);
  appendQueryParam(query, "excludeProductId", excludeProductId);

  const response = await fetch(`${apiUrl}/product/api/get-products?${query}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch suggested products");
  }

  return response.json();
};

export const getRelatedProductsApi = async ({
  category,
  subCategory,
  excludeSlug,
  excludeProductId,
  limit = 12,
}: Pick<
  GetProductsParams,
  "category" | "subCategory" | "excludeSlug" | "excludeProductId" | "limit"
>): Promise<ProductsResponse> => {
  return getProductsApi({
    page: 1,
    limit,
    type: "suggested",
    category,
    subCategory,
    excludeSlug,
    excludeProductId,
  });
};

export const getFilteredProductsApi = async ({
  page = 1,
  limit = 12,
  category,
  subCategory,
  brand,
  minPrice,
  maxPrice,
  rating,
  color,
  size,
  sort,
  excludeSlug,
  excludeProductId,
}: ProductFilters = {}): Promise<ProductsResponse> => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  appendQueryParam(query, "category", category);
  appendQueryParam(query, "subCategory", subCategory);
  appendQueryParam(query, "brand", brand);
  appendQueryParam(query, "minPrice", minPrice);
  appendQueryParam(query, "maxPrice", maxPrice);
  appendQueryParam(query, "rating", rating);
  appendQueryParam(query, "color", color);
  appendQueryParam(query, "size", size);
  appendQueryParam(query, "sort", sort);
  appendQueryParam(query, "excludeSlug", excludeSlug);
  appendQueryParam(query, "excludeProductId", excludeProductId);

  const response = await fetch(
    `${apiUrl}/product/api/get-filtered-products?${query}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to fetch filtered products");
  }

  return response.json();
};

export const searchProductsApi = async ({
  q = "",
  page = 1,
  limit = 12,
  category,
  sort,
}: SearchProductsParams = {}): Promise<SearchProductsResponse> => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams({
    q,
    page: String(page),
    limit: String(limit),
  });

  appendQueryParam(query, "category", category);
  appendQueryParam(query, "sort", sort);

  const response = await fetch(
    `${apiUrl}/product/api/search-products?${query}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to search products");
  }

  return response.json();
};

export const getEventProductsApi = async ({
  page = 1,
  limit = 12,
  category,
  subCategory,
  status = "all",
}: EventProductsParams = {}): Promise<EventProductsResponse> => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });

  appendQueryParam(query, "category", category);
  appendQueryParam(query, "subCategory", subCategory);

  const response = await fetch(`${apiUrl}/product/api/events?${query}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch event products");
  }

  return response.json();
};

export const getTopShopsApi = async ({
  limit = 10,
  category,
}: TopShopsParams = {}): Promise<TopShopsResponse> => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams({
    limit: String(limit),
  });

  appendQueryParam(query, "category", category);

  const response = await fetch(`${apiUrl}/product/api/top-shops?${query}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch top shops");
  }

  return response.json();
};

export const getShopsApi = async ({
  page = 1,
  limit = 24,
  category,
  q,
}: ShopFilters = {}): Promise<ShopsResponse> => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });

  appendQueryParam(query, "category", category);
  appendQueryParam(query, "q", q);

  const response = await fetch(`${apiUrl}/product/api/shops?${query}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Unable to fetch shops");
  }

  return response.json();
};

export const getShopDetailApi = async (
  shopId: string,
): Promise<ShopDetailResponse | null> => {
  const apiUrl = getApiUrl();

  const response = await fetch(
    `${apiUrl}/product/api/shops/${encodeURIComponent(shopId)}`,
    {
      credentials: "include",
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to fetch shop detail");
  }

  return response.json();
};

export const getShopProductsApi = async (
  shopId: string,
  { page = 1, limit = 12, sort = "popular" }: ShopProductsParams = {},
): Promise<ShopProductsResponse> => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    sort,
  });

  const response = await fetch(
    `${apiUrl}/product/api/shops/${encodeURIComponent(shopId)}/products?${query}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to fetch shop products");
  }

  return response.json();
};

export const getShopEventsApi = async (
  shopId: string,
  { page = 1, limit = 12, status = "all" }: ShopEventsParams = {},
): Promise<ShopProductsResponse> => {
  const apiUrl = getApiUrl();
  const query = new URLSearchParams({
    page: String(page),
    limit: String(limit),
    status,
  });

  const response = await fetch(
    `${apiUrl}/product/api/shops/${encodeURIComponent(shopId)}/events?${query}`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw new Error("Unable to fetch shop offers");
  }

  return response.json();
};

export const getProductDetailApi = async (
  slug: string,
): Promise<ProductDetailResponse | null> => {
  const apiUrl = getApiUrl();

  const response = await fetch(
    `${apiUrl}/product/api/get-product/${encodeURIComponent(slug)}`,
    {
      credentials: "include",
      cache: "no-store",
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Unable to fetch product detail");
  }

  return response.json();
};
