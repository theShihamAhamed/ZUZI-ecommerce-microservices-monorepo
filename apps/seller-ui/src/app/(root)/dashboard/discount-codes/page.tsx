"use client";

import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { Loader2, Plus, TicketPercent, Trash, X } from "lucide-react";
import DeleteDiscountCode from "@/components/delete-discount-code";
import { useProduct } from "@/hooks/useProduct";
import { useState } from "react";

interface DiscountCodeFormValues {
  public_name: string;
  discountType: "percentage" | "flat";
  discountValue: string;
  discountCode: string;
}

const inputClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15";

export default function DiscountCodesPage() {
  const [showModal, setShowModal] = useState(false);
  const { getDiscountCodes, createDiscountCode } = useProduct();
  const discountCodes = getDiscountCodes.data?.discount_code || [];
  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    id: string | null;
  }>({
    open: false,
    id: null,
  });
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<DiscountCodeFormValues>({
    defaultValues: {
      public_name: "",
      discountType: "percentage",
      discountValue: "",
      discountCode: "",
    },
  });

  const onSubmit = (data: DiscountCodeFormValues) => {
    if (discountCodes.length >= 8) {
      toast.error("You can only create up to 8 discount codes");
      return;
    }

    createDiscountCode.mutate(data, {
      onSuccess: () => {
        toast.success("Discount code created successfully");
        reset();
        setShowModal(false);
      },
      onError: () => {
        toast.error("Failed to create discount code");
      },
    });
  };

  return (
    <div className="min-h-screen space-y-6 p-4 text-slate-900 sm:p-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">
            Products
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-950">
            Discount Codes
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Create and manage limited seller discounts for your products.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex w-fit items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500"
        >
          <Plus className="h-4 w-4" />
          Create Discount
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Your discount codes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {getDiscountCodes.isPending
                ? "Loading discounts"
                : `${discountCodes.length} codes available`}
            </p>
          </div>
        </div>

        {getDiscountCodes.isPending ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-8 text-sm font-semibold text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin text-emerald-600" />
            Loading discounts...
          </div>
        ) : discountCodes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
            <TicketPercent className="mx-auto h-10 w-10 text-emerald-600" />
            <h3 className="mt-4 text-lg font-semibold text-slate-950">
              No discount codes yet
            </h3>
            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              Create a code when you want to promote a product or reward repeat
              customers.
            </p>
          </div>
        ) : (
          <div className="max-w-full overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Value</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {discountCodes.map((discount: any) => (
                  <tr key={discount?.id} className="transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {discount?.public_name}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {discount?.discountType === "percentage"
                        ? "Percentage"
                        : "Flat"}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {discount?.discountType === "percentage"
                        ? `${discount.discountValue}%`
                        : `$${discount.discountValue}`}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                        {discount?.discountCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteModal({ open: true, id: discount.id })
                        }
                        aria-label={`Delete ${discount?.public_name}`}
                        title="Delete discount code"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-600 transition hover:border-red-200 hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300/30"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Create Discount Code
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Codes are applied to products from the seller tools.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                aria-label="Close create discount modal"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Title
                </label>
                <input
                  className={inputClass}
                  placeholder="Summer sale"
                  {...register("public_name", { required: "Title is required" })}
                />
                {errors.public_name ? (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {errors.public_name.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Discount Type
                </label>
                <Controller
                  control={control}
                  name="discountType"
                  render={({ field }) => (
                    <select {...field} className={inputClass}>
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount ($)</option>
                    </select>
                  )}
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Discount Value
                </label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  placeholder="10"
                  {...register("discountValue", {
                    required: "Value is required",
                  })}
                />
                {errors.discountValue ? (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {errors.discountValue.message}
                  </p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                  Discount Code
                </label>
                <input
                  className={inputClass}
                  placeholder="SUMMER10"
                  {...register("discountCode", {
                    required: "Code is required",
                  })}
                />
                {errors.discountCode ? (
                  <p className="mt-1 text-xs font-medium text-red-600">
                    {errors.discountCode.message}
                  </p>
                ) : null}
              </div>

              <button
                type="submit"
                disabled={createDiscountCode.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {createDiscountCode.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Create
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : null}

      {deleteModal.open && deleteModal.id ? (
        <DeleteDiscountCode
          discountCodeId={deleteModal.id}
          onClose={() => setDeleteModal({ open: false, id: null })}
        />
      ) : null}
    </div>
  );
}
