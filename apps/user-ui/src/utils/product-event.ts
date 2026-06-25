import { Product } from "@/types/product";

export type ProductEventStatus = "active" | "upcoming" | "expired" | "none";

interface ProductEventInfo {
  isEventProduct: boolean;
  status: ProductEventStatus;
  label: string;
  remainingText: string;
  startText: string;
  endText: string;
}

const formatEventDate = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const formatRemainingTime = (targetDate: Date) => {
  const diff = targetDate.getTime() - Date.now();

  if (diff <= 0) return "";

  const totalMinutes = Math.floor(diff / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

export const getProductEventInfo = (
  product: Pick<Product, "isEvent" | "starting_date" | "ending_date">,
): ProductEventInfo => {
  if (!product.isEvent) {
    return {
      isEventProduct: false,
      status: "none",
      label: "",
      remainingText: "",
      startText: "",
      endText: "",
    };
  }

  const startDate = product.starting_date
    ? new Date(product.starting_date)
    : null;
  const endDate = product.ending_date ? new Date(product.ending_date) : null;
  const hasValidStartDate = startDate && !Number.isNaN(startDate.getTime());
  const hasValidEndDate = endDate && !Number.isNaN(endDate.getTime());
  const startText = formatEventDate(product.starting_date);
  const endText = formatEventDate(product.ending_date);

  if (hasValidStartDate && startDate.getTime() > Date.now()) {
    return {
      isEventProduct: true,
      status: "upcoming",
      label: "Starts in",
      remainingText: formatRemainingTime(startDate),
      startText,
      endText,
    };
  }

  if (hasValidEndDate && endDate.getTime() > Date.now()) {
    return {
      isEventProduct: true,
      status: "active",
      label: "Offer ends in",
      remainingText: formatRemainingTime(endDate),
      startText,
      endText,
    };
  }

  return {
    isEventProduct: true,
    status: "expired",
    label: "",
    remainingText: "",
    startText,
    endText,
  };
};
