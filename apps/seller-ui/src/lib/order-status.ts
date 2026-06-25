import { SellerOrderStatus, SellerPaymentStatus } from "@/types/order";

export const deliverySteps = [
  {
    status: "Ordered",
    label: "Ordered",
    helper: "Order placed",
  },
  {
    status: "Packed",
    label: "Packed",
    helper: "Seller is preparing your items",
  },
  {
    status: "Shipped",
    label: "Shipped",
    helper: "Package handed to courier",
  },
  {
    status: "OutForDelivery",
    label: "Out for Delivery",
    helper: "Courier is on the way",
  },
  {
    status: "Delivered",
    label: "Delivered",
    helper: "Order completed",
  },
] as const;

export const normalizeOrderStatus = (status: SellerOrderStatus) => {
  if (status === "Paid" || status === "Processing") {
    return "Ordered";
  }

  return status;
};

export const getOrderStatusLabel = (status: SellerOrderStatus) => {
  const normalizedStatus = normalizeOrderStatus(status);

  if (normalizedStatus === "OutForDelivery") {
    return "Out for Delivery";
  }

  return normalizedStatus;
};

export const getStatusStyle = (
  status: SellerOrderStatus | SellerPaymentStatus,
) => {
  if (status === "Succeeded" || status === "Delivered") {
    return "bg-emerald-50 text-emerald-700";
  }

  if (status === "Shipped") {
    return "bg-teal-50 text-teal-700";
  }

  if (status === "OutForDelivery") {
    return "bg-cyan-50 text-cyan-700";
  }

  if (status === "Failed" || status === "Cancelled") {
    return "bg-red-50 text-red-700";
  }

  return "bg-amber-50 text-amber-700";
};
