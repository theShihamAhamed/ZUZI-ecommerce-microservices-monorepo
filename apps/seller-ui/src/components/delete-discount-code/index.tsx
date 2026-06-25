"use client";

import { X, Trash2 } from "lucide-react";
import { useProduct } from "@/hooks/useProduct";
import toast from "react-hot-toast";
import React from "react";

interface DeleteDiscountCodeProps {
  discountCodeId: string;
  onClose: () => void;
  onConfirm?: () => void; // optional callback after successful delete
}

const DeleteDiscountCode: React.FC<DeleteDiscountCodeProps> = ({
  discountCodeId,
  onClose,
  onConfirm,
}) => {
  const { deleteDiscountCode } = useProduct();

  const handleDelete = () => {
    deleteDiscountCode.mutate(discountCodeId, {
      onSuccess: () => {
        toast.success("Discount code deleted successfully");
        onConfirm?.();
        onClose();
      },
      onError: () => {
        toast.error("Failed to delete discount code");
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h3 className="text-lg font-semibold text-slate-950">
            Delete Discount Code
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close delete discount modal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="mt-4">
          <p className="text-slate-600">
            Are you sure you want to delete this discount code?
          </p>

          {/* Warning Text */}
          <div className="mt-4 rounded-xl border border-red-100 bg-red-50 p-3">
            <p className="text-sm text-red-700">
              This action cannot be undone.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={deleteDiscountCode.isPending}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition ${
              deleteDiscountCode.isPending
                ? "cursor-not-allowed bg-red-400"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {deleteDiscountCode.isPending ? (
              <>
                <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></span>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={16} />
                Delete
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteDiscountCode;
