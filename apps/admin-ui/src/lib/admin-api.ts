import { gatewayBaseUrl } from "./config";

type RequestOptions = RequestInit & {
  skipRefresh?: boolean;
};

const adminApiBaseUrl = `${gatewayBaseUrl}/admin/api`;

const getErrorMessage = async (response: Response) => {
  try {
    const payload = await response.json();

    return payload.message || payload.error || "Admin request failed";
  } catch {
    return "Admin request failed";
  }
};

export const adminFetch = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { skipRefresh, headers, ...init } = options;
  const response = await fetch(`${adminApiBaseUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (response.status === 401 && !skipRefresh) {
    const refreshResponse = await fetch(`${adminApiBaseUrl}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (refreshResponse.ok) {
      return adminFetch<T>(path, { ...options, skipRefresh: true });
    }
  }

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
};

export const loginAdmin = (email: string, password: string) =>
  adminFetch<{ success: boolean }>("/auth/login", {
    method: "POST",
    skipRefresh: true,
    body: JSON.stringify({ email, password }),
  });

export const logoutAdmin = () =>
  adminFetch<{ success: boolean }>("/auth/logout", {
    method: "POST",
    skipRefresh: true,
  });
