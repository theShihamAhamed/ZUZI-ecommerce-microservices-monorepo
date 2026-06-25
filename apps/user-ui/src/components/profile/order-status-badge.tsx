import { OrderStatus, PaymentStatus } from "@/types/order";
import { getOrderStatusLabel } from "@/components/profile/order-delivery-timeline";

const orderStatusStyles: Record<OrderStatus, string> = {
  Ordered: "bg-amber-50 text-amber-800",
  Packed: "bg-amber-100 text-amber-900",
  Paid: "bg-amber-50 text-amber-800",
  Processing: "bg-amber-50 text-amber-800",
  Shipped: "bg-blue-50 text-blue-700",
  OutForDelivery: "bg-violet-50 text-violet-700",
  Delivered: "bg-green-50 text-green-700",
  Cancelled: "bg-red-50 text-red-700",
  Refunded: "bg-stone-100 text-stone-700",
};

const paymentStatusStyles: Record<PaymentStatus, string> = {
  Pending: "bg-stone-100 text-stone-700",
  Succeeded: "bg-green-50 text-green-700",
  Failed: "bg-red-50 text-red-700",
  Refunded: "bg-stone-100 text-stone-700",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        orderStatusStyles[status] || orderStatusStyles.Ordered
      }`}
    >
      {getOrderStatusLabel(status)}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
        paymentStatusStyles[status] || paymentStatusStyles.Pending
      }`}
    >
      {status}
    </span>
  );
}
