export const isObjectIdLike = (value: string) => /^[a-f\d]{24}$/i.test(value);

export const getQueryString = (value: unknown) => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return typeof value === "string" ? value : undefined;
};

export const getPositiveNumber = (value: unknown, fallback: number) => {
  const parsed = Number(getQueryString(value));

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.floor(parsed);
};

export const getPagination = (total: number, page: number, limit: number) => {
  const totalPages = Math.ceil(total / limit);

  return {
    total,
    totalCount: total,
    totalItems: total,
    currentPage: page,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
};

export const getListParams = (query: Record<string, unknown>) => {
  const page = getPositiveNumber(query.page, 1);
  const limit = Math.min(getPositiveNumber(query.limit, 12), 50);

  return {
    page,
    limit,
    skip: (page - 1) * limit,
    q: (getQueryString(query.q) || "").trim(),
    status: getQueryString(query.status),
    sort: getQueryString(query.sort),
    from: getDateQuery(query.from),
    to: getDateQuery(query.to, true),
  };
};

export const getDateQuery = (value: unknown, endOfDay = false) => {
  const rawValue = getQueryString(value);

  if (!rawValue) return undefined;

  const date = new Date(rawValue);

  if (Number.isNaN(date.getTime())) return undefined;

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    date.setHours(23, 59, 59, 999);
  }

  return date;
};

export const getAllowedFilter = <T extends string>(
  value: string | undefined,
  allowedValues: readonly T[],
) => {
  return value && allowedValues.includes(value as T) ? (value as T) : undefined;
};

export const roundMoney = (amount: number) =>
  Number((Number.isFinite(amount) ? amount : 0).toFixed(2));
