import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_SERVER_URI;

const axiosInstance = axios.create({
  baseURL: `${API_URL}`,
  withCredentials: true,
});

let isRefreshing = false;
let refreshSubscribers: (() => void)[] = [];

const publicRoutes = [
  "/login-seller",
  "/api/login-seller",
  "/api/seller/status",
  "/seller-registration",
  "/seller-verify-otp",
  "/seller-resend-otp",
  "/user-registration",
  "/verify-otp",
];

const handleLogout = () => {
  if (
    window.location.pathname !== "/login" &&
    window.location.pathname !== "/sign-up"
  ) {
    window.location.href = "/login";
  }
};

const subscribeTokenRefresh = (callback: () => void) => {
  refreshSubscribers.push(callback);
};

const onRefreshSuccess = () => {
  refreshSubscribers.forEach((callback) => callback());
  refreshSubscribers = [];
};

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isPublicRoute = publicRoutes.some((route) =>
      originalRequest.url?.includes(route),
    );

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isPublicRoute
    ) {
      if (isRefreshing) {
        return new Promise((resolve) => {
          subscribeTokenRefresh(() => resolve(axiosInstance(originalRequest)));
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        await axios.post(
          `${API_URL}/api/refresh-token`,
          {},
          { withCredentials: true },
        );

        isRefreshing = false;
        onRefreshSuccess();

        return axiosInstance(originalRequest);
      } catch (err) {
        isRefreshing = false;
        refreshSubscribers = [];
        handleLogout();
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  },
);

export default axiosInstance;
