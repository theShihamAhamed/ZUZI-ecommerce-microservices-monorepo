"use client";

import { useState } from "react";
import { AlertCircle, MapPin, Plus, RefreshCw } from "lucide-react";
import { AddressCard } from "@/components/profile/address-card";
import { AddressFormModal } from "@/components/profile/address-form-modal";
import { ShippingAddressFormData } from "@/constants/profile.schema";
import {
  useCreateShippingAddress,
  useDeleteShippingAddress,
  useSetDefaultShippingAddress,
  useShippingAddresses,
  useUpdateShippingAddress,
} from "@/hooks/useProfile";
import { ShippingAddress, ShippingAddressInput } from "@/types/profile";

type AddressModalState =
  | {
      mode: "create";
    }
  | {
      mode: "edit";
      address: ShippingAddress;
    }
  | null;

const getErrorMessage = (error: unknown) => {
  return (
    (error as any)?.response?.data?.message ||
    "Unable to update shipping addresses right now."
  );
};

const normalizeAddressFormData = (
  data: ShippingAddressFormData,
): ShippingAddressInput => ({
  fullName: data.fullName,
  phone: data.phone,
  addressLine1: data.addressLine1,
  addressLine2: data.addressLine2 || null,
  city: data.city,
  state: data.state || null,
  postalCode: data.postalCode,
  country: data.country,
  isDefault: data.isDefault || false,
});

function AddressSkeleton() {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="h-5 w-36 animate-pulse rounded-full bg-stone-200" />
      <div className="mt-4 space-y-3">
        <div className="h-3 w-28 animate-pulse rounded-full bg-stone-100" />
        <div className="h-3 w-full animate-pulse rounded-full bg-stone-100" />
        <div className="h-3 w-3/4 animate-pulse rounded-full bg-stone-100" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-9 w-20 animate-pulse rounded-full bg-stone-100" />
        <div className="h-9 w-24 animate-pulse rounded-full bg-stone-100" />
      </div>
    </div>
  );
}

export function ShippingAddressSection() {
  const [modalState, setModalState] = useState<AddressModalState>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const addressesQuery = useShippingAddresses();
  const createAddress = useCreateShippingAddress();
  const updateAddress = useUpdateShippingAddress();
  const deleteAddress = useDeleteShippingAddress();
  const setDefaultAddress = useSetDefaultShippingAddress();

  const addresses = addressesQuery.data || [];
  const mutationError =
    createAddress.error ||
    updateAddress.error ||
    deleteAddress.error ||
    setDefaultAddress.error;
  const isSubmitting = createAddress.isPending || updateAddress.isPending;

  const closeModal = () => {
    if (!isSubmitting) {
      setModalState(null);
    }
  };

  const handleSubmitAddress = (data: ShippingAddressFormData) => {
    setStatusMessage("");
    const payload = normalizeAddressFormData(data);

    if (modalState?.mode === "edit") {
      updateAddress.mutate(
        {
          id: modalState.address.id,
          data: payload,
        },
        {
          onSuccess: () => {
            setModalState(null);
            setStatusMessage("Shipping address updated.");
          },
        },
      );
      return;
    }

    createAddress.mutate(payload, {
      onSuccess: () => {
        setModalState(null);
        setStatusMessage("Shipping address added.");
      },
    });
  };

  const handleDeleteAddress = (address: ShippingAddress) => {
    const confirmed = window.confirm(
      "Delete this shipping address from your profile?",
    );

    if (!confirmed) {
      return;
    }

    setStatusMessage("");
    deleteAddress.mutate(address.id, {
      onSuccess: () => {
        setStatusMessage("Shipping address deleted.");
      },
    });
  };

  const handleSetDefaultAddress = (address: ShippingAddress) => {
    setStatusMessage("");
    setDefaultAddress.mutate(address.id, {
      onSuccess: () => {
        setStatusMessage("Default shipping address updated.");
      },
    });
  };

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Shipping Address
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage the destinations saved to your customer account.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setStatusMessage("");
            setModalState({ mode: "create" });
          }}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 sm:mt-0 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          Add new address
        </button>
      </div>

      {statusMessage ? (
        <p className="rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
          {statusMessage}
        </p>
      ) : null}

      {mutationError ? (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {getErrorMessage(mutationError)}
        </p>
      ) : null}

      {addressesQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <AddressSkeleton key={index} />
          ))}
        </div>
      ) : null}

      {addressesQuery.isError ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-stone-100 text-gray-700">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-gray-900">
            Unable to load shipping addresses
          </h3>
          <p className="mt-2 text-sm text-gray-600">Please try again.</p>
          <button
            type="button"
            onClick={() => addressesQuery.refetch()}
            disabled={addressesQuery.isFetching}
            className="mt-5 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            {addressesQuery.isFetching ? "Trying again..." : "Retry"}
          </button>
        </div>
      ) : null}

      {!addressesQuery.isLoading &&
      !addressesQuery.isError &&
      addresses.length === 0 ? (
        <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <MapPin className="h-7 w-7" />
          </div>
          <h3 className="mt-5 text-lg font-bold text-gray-900">
            No shipping addresses yet
          </h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-gray-600">
            Add a destination to make checkout smoother later.
          </p>
          <button
            type="button"
            onClick={() => setModalState({ mode: "create" })}
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800"
          >
            <Plus className="h-4 w-4" />
            Add new address
          </button>
        </div>
      ) : null}

      {!addressesQuery.isLoading &&
      !addressesQuery.isError &&
      addresses.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((address) => (
            <AddressCard
              key={address.id}
              address={address}
              isDeleting={
                deleteAddress.isPending && deleteAddress.variables === address.id
              }
              isSettingDefault={
                setDefaultAddress.isPending &&
                setDefaultAddress.variables === address.id
              }
              onEdit={(selectedAddress) => {
                setStatusMessage("");
                setModalState({
                  mode: "edit",
                  address: selectedAddress,
                });
              }}
              onDelete={handleDeleteAddress}
              onSetDefault={handleSetDefaultAddress}
            />
          ))}
        </div>
      ) : null}

      {modalState ? (
        <AddressFormModal
          mode={modalState.mode}
          address={modalState.mode === "edit" ? modalState.address : undefined}
          isSubmitting={isSubmitting}
          onClose={closeModal}
          onSubmit={handleSubmitAddress}
        />
      ) : null}
    </section>
  );
}
