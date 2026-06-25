import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/shared/breadcrumbs";
import { ReviewSubmitView } from "@/components/reviews/review-submit-view";

interface ReviewSubmitPageProps {
  params: Promise<{
    code: string;
  }>;
}

export const metadata: Metadata = {
  title: "Submit Review | Zuzi",
  description: "Submit a verified purchase review for your delivered item.",
};

export default async function ReviewSubmitPage({
  params,
}: ReviewSubmitPageProps) {
  const { code } = await params;

  return (
    <main className="min-h-screen bg-stone-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Profile", href: "/profile" },
            { label: "Orders", href: "/profile?tab=orders" },
            { label: "Submit review" },
          ]}
        />

        <div className="mt-8">
          <ReviewSubmitView code={code} />
        </div>
      </div>
    </main>
  );
}
