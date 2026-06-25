import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ProfileOrderDetail } from "@/components/profile/profile-order-detail";

interface ProfileOrderPageProps {
  params: Promise<{
    orderId: string;
  }>;
}

export const metadata: Metadata = {
  title: "Order Details | Zuzi",
  description: "View your order details and delivery progress.",
};

export default async function ProfileOrderPage({
  params,
}: ProfileOrderPageProps) {
  const { orderId } = await params;

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Profile", href: "/profile" },
            { label: "Orders", href: "/profile?tab=orders" },
            { label: "Order details" },
          ]}
        />

        <div className="mt-8">
          <ProfileOrderDetail orderId={orderId} />
        </div>
      </div>
    </main>
  );
}
