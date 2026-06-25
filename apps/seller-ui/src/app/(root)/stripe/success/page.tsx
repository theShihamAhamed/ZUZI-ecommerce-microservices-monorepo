"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function StripeSuccessPage() {
  const router = useRouter();
  const [dots, setDots] = useState("");

  // redirect timer
  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/");
    }, 2500);

    return () => clearTimeout(timer);
  }, [router]);

  // animated dots
  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
          <span className="text-2xl">✔</span>
        </div>

        <h1 className="text-2xl font-semibold text-gray-900">
          Stripe Connected Successfully
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Your payout account is now ready to receive payments.
        </p>

        {/* Progress */}
        <div className="mt-6">
          <div className="h-1 w-full overflow-hidden rounded bg-gray-200">
            <div className="h-full w-full animate-progress bg-green-500" />
          </div>

          <p className="mt-3 text-sm text-gray-500">
            Redirecting to dashboard{dots}
          </p>
        </div>
      </div>

      {/* Tailwind animation */}
      <style jsx>{`
        @keyframes progress {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0%);
          }
        }

        .animate-progress {
          animation: progress 2.5s linear forwards;
        }
      `}</style>
    </div>
  );
}
