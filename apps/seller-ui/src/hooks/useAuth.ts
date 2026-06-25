import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SellerFormData } from "@/app/(auth)/sign-up/page";
import {
  createShopApi,
  registerSellerApi,
  resendSellerOtpApi,
  verifySellerOtpApi,
  connectStripeApi,
  getSellerStatusApi,
  fetchSellerAPI,
  loginSellerApi,
  logoutSellerApi,
} from "@/services/auth.api";

const sellerSessionQueryKey = ["seller"] as const;

export const useSellerSession = (enabled = true) => {
  const fetchSeller = useQuery({
    queryKey: sellerSessionQueryKey,
    queryFn: fetchSellerAPI,
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
  const seller = fetchSeller.data?.seller || fetchSeller.data?.user || null;
  const shop = fetchSeller.data?.shop || seller?.shop || null;

  return {
    fetchSeller,
    seller,
    shop,
    isLoading: fetchSeller.isLoading,
    isAuthenticated: Boolean(seller),
    refetch: fetchSeller.refetch,
  };
};

export const useAuth = () => {
  const queryClient = useQueryClient();

  // STEP 1: REGISTER SELLER
  const registerSeller = useMutation({
    mutationFn: (data: SellerFormData) => registerSellerApi(data),
  });

  // STEP 2: VERIFY OTP
  const verifyOtp = useMutation({
    mutationFn: ({
      registrationToken,
      otp,
    }: {
      registrationToken: string;
      otp: string;
    }) => verifySellerOtpApi(registrationToken, otp),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellerSessionQueryKey });
    },
  });

  // STEP 2 ALT: RESEND OTP
  const resendOtp = useMutation({
    mutationFn: (registrationToken: string) =>
      resendSellerOtpApi(registrationToken),
  });

  // FETCH USER DATA
  const fetchSeller = useQuery({
    queryKey: sellerSessionQueryKey,
    queryFn: fetchSellerAPI,
    enabled: false,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });

  // STEP 3: CREATE SHOP (sellerId from cookie/session)
  const createShop = useMutation({
    mutationFn: (shopData: any) => createShopApi(shopData),
  });

  // STEP 4: CONNECT STRIPE (sellerId from cookie/session)
  const connectStripe = useMutation({
    mutationFn: () => connectStripeApi(),
  });

  const sellerStatusQuery = useQuery({
    queryKey: ["seller-status"],
    queryFn: getSellerStatusApi,
    retry: false,
  });

  // LOGIN
  const login = useMutation({
    mutationFn: loginSellerApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sellerSessionQueryKey });
    },
  });

  const logout = useMutation({
    mutationFn: logoutSellerApi,
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: sellerSessionQueryKey });
    },
  });

  return {
    registerSeller,
    verifyOtp,
    resendOtp,
    login,
    fetchSeller,
    createShop,
    connectStripe,
    sellerStatusQuery,
    logout,
  };
};
