import axios from "axios";
import type { AxiosRequestConfig } from "axios";

const API_URL = process.env.NEXT_PUBLIC_SERVER_URI;

type RetryRequestConfig = AxiosRequestConfig & {
  _retry?: boolean;
};

const axiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: {
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
  request: RetryRequestConfig;
}[] = [];

const retryQueuedRequests = () => {
  refreshSubscribers.forEach(({ resolve, request }) => {
    resolve(axiosInstance(request));
  });
  refreshSubscribers = [];
};

const rejectQueuedRequests = (error: unknown) => {
  refreshSubscribers.forEach(({ reject }) => {
    reject(error);
  });
  refreshSubscribers = [];
};

// Handle API requests
axiosInstance.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as RetryRequestConfig | undefined;
    const isAccessTokenExpired =
      error.response?.status === 400 &&
      error.response?.data?.message === "Access token expired";

    // prevent infinite retry loop
    if (
      (error.response?.status === 401 || isAccessTokenExpired) &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/login-user") &&
      !originalRequest.url?.includes("/refresh-token")
    ) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          refreshSubscribers.push({
            resolve,
            reject,
            request: originalRequest,
          });
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_SERVER_URI}/api/refresh-token`,
          {},
          { withCredentials: true },
        );

        isRefreshing = false;
        retryQueuedRequests();

        return axiosInstance(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        rejectQueuedRequests(refreshError);
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
