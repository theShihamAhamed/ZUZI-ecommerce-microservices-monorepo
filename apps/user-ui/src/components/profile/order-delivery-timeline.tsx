import { Check } from "lucide-react";
import { OrderStatus } from "@/types/order";

const deliverySteps = [
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

export const normalizeOrderStatus = (status: OrderStatus) => {
  if (status === "Paid" || status === "Processing") {
    return "Ordered";
  }

  return status;
};

export const getOrderStatusLabel = (status: OrderStatus) => {
  const normalizedStatus = normalizeOrderStatus(status);

  if (normalizedStatus === "OutForDelivery") {
    return "Out for Delivery";
  }

  if (normalizedStatus === "Cancelled") {
    return "Cancelled";
  }

  if (normalizedStatus === "Refunded") {
    return "Refunded";
  }

  return normalizedStatus;
};

export function OrderDeliveryTimeline({ status }: { status: OrderStatus }) {
  const normalizedStatus = normalizeOrderStatus(status);
  const activeIndex = Math.max(
    0,
    deliverySteps.findIndex((step) => step.status === normalizedStatus),
  );

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-5 md:gap-0">
      {deliverySteps.map((step, index) => {
        const isCompleted = index < activeIndex;
        const isCurrent = index === activeIndex;
        const isAchieved = index <= activeIndex;

        return (
          <div
            key={step.status}
            className="relative flex gap-3 md:flex-col md:items-center md:gap-2"
          >
            {index > 0 ? (
              <div
                className={`absolute left-[15px] top-[-18px] h-5 w-0.5 md:left-[-50%] md:top-4 md:h-0.5 md:w-full ${
                  isAchieved ? "bg-amber-500" : "bg-stone-200"
                }`}
              />
            ) : null}
            <div
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                isCompleted
                  ? "border-amber-500 bg-amber-500 text-white"
                  : isCurrent
                    ? "border-amber-600 bg-amber-50 text-amber-800 ring-4 ring-amber-100"
                    : "border-stone-300 bg-white text-stone-400"
              }`}
            >
              {isCompleted ? <Check className="h-4 w-4" /> : index + 1}
            </div>
            <div className="min-w-0 md:text-center">
              <p
                className={`text-sm ${
                  isCurrent ? "font-extrabold text-gray-900" : "font-bold"
                } ${isAchieved ? "text-gray-900" : "text-gray-400"}`}
              >
                {step.label}
              </p>
              <p
                className={`mt-1 text-xs ${
                  isAchieved ? "text-gray-600" : "text-gray-400"
                }`}
              >
                {step.helper}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
