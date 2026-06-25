"use client";

import {
  CheckCircle2,
  Edit3,
  Loader2,
  MapPin,
  Phone,
  Trash2,
} from "lucide-react";
import { ShippingAddress } from "@/types/profile";

interface AddressCardProps {
  address: ShippingAddress;
  isDeleting: boolean;
  isSettingDefault: boolean;
  onEdit: (address: ShippingAddress) => void;
  onDelete: (address: ShippingAddress) => void;
  onSetDefault: (address: ShippingAddress) => void;
}

export function AddressCard({
  address,
  isDeleting,
  isSettingDefault,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-bold text-gray-900">
              {address.fullName}
            </h3>
            {address.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-800">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Default
              </span>
            ) : null}
          </div>
          <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4 shrink-0 text-stone-400" />
            {address.phone}
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2 text-sm text-gray-600">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
        <div className="min-w-0 space-y-1 break-words">
          <p>{address.addressLine1}</p>
          {address.addressLine2 ? <p>{address.addressLine2}</p> : null}
          <p>
            {[address.city, address.state, address.postalCode]
              .filter(Boolean)
              .join(", ")}
          </p>
          <p>{address.country}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2 border-t border-stone-100 pt-4">
        <button
          type="button"
          onClick={() => onEdit(address)}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-stone-50"
        >
          <Edit3 className="h-4 w-4" />
          Edit
        </button>

        {!address.isDefault ? (
          <button
            type="button"
            onClick={() => onSetDefault(address)}
            disabled={isSettingDefault}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-amber-50 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSettingDefault ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Set default
          </button>
        ) : null}

        <button
          type="button"
          onClick={() => onDelete(address)}
          disabled={isDeleting}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-2 text-sm font-semibold text-gray-900 transition hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete
        </button>
      </div>
    </article>
  );
}
