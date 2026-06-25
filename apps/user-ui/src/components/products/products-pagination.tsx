"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProductPagination } from "@/types/product";

interface ProductsPaginationProps {
  pagination?: ProductPagination;
  onPageChange: (page: number) => void;
}

export function ProductsPagination({
  pagination,
  onPageChange,
}: ProductsPaginationProps) {
  if (!pagination || pagination.totalPages <= 1) {
    return null;
  }

  const currentPage = Math.min(pagination.page, pagination.totalPages);

  return (
    <nav
      aria-label="Products pagination"
      className="mt-8 flex items-center justify-center gap-3"
    >
      <button
        type="button"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={!pagination.hasPreviousPage}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-gray-800 shadow-sm transition hover:border-amber-300 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-45"
      >
        <ChevronLeft className="h-4 w-4" />
        Previous
      </button>

      <span className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm">
        Page {currentPage} of {pagination.totalPages}
      </span>

      <button
        type="button"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!pagination.hasNextPage}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-sm font-bold text-gray-800 shadow-sm transition hover:border-amber-300 hover:text-amber-800 disabled:cursor-not-allowed disabled:opacity-45"
      >
        Next
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
