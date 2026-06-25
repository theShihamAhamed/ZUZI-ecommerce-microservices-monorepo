"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createShippingAddressApi,
  deleteShippingAddressApi,
  getMeApi,
  getShippingAddressesApi,
  logoutApi,
  setDefaultShippingAddressApi,
  updateMeApi,
  updateShippingAddressApi,
  uploadProfileAvatarApi,
} from "@/services/profile.api";
import {
  ShippingAddressInput,
  UpdateProfileInput,
} from "@/types/profile";

export const profileQueryKey = ["profile"] as const;
export const shippingAddressesQueryKey = ["shipping-addresses"] as const;

export const useProfile = () => {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: getMeApi,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: UpdateProfileInput) => updateMeApi(data),
    onSuccess: (profile) => {
      queryClient.setQueryData(profileQueryKey, profile);
      queryClient.setQueryData(["user"], profile);
    },
  });
};

export const useUploadProfileAvatar = () => {
  return useMutation({
    mutationFn: (file: File) => uploadProfileAvatarApi(file),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logoutApi,
    onSuccess: () => {
      queryClient.clear();
    },
  });
};

export const useShippingAddresses = (enabled = true) => {
  return useQuery({
    queryKey: shippingAddressesQueryKey,
    queryFn: getShippingAddressesApi,
    enabled,
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
};

export const useCreateShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ShippingAddressInput) =>
      createShippingAddressApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: shippingAddressesQueryKey,
      });
    },
  });
};

export const useUpdateShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: ShippingAddressInput;
    }) => updateShippingAddressApi({ id, data }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: shippingAddressesQueryKey,
      });
    },
  });
};

export const useDeleteShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteShippingAddressApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: shippingAddressesQueryKey,
      });
    },
  });
};

export const useSetDefaultShippingAddress = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => setDefaultShippingAddressApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: shippingAddressesQueryKey,
      });
    },
  });
};
