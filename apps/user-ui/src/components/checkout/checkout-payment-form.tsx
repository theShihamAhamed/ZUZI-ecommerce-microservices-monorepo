"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";

interface CheckoutPaymentFormProps {
  sessionId: string;
  onError: (message: string) => void;
}

export function CheckoutPaymentForm({
  sessionId,
  onError,
}: CheckoutPaymentFormProps) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsSubmitting(true);
    onError("");

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success?sessionId=${encodeURIComponent(
          sessionId,
        )}`,
      },
      redirect: "if_required",
    });

    setIsSubmitting(false);

    if (result.error) {
      onError(result.error.message || "Payment could not be completed.");
      return;
    }

    router.push(`/checkout/success?sessionId=${encodeURIComponent(sessionId)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        options={{
          layout: "tabs",
        }}
      />

      <button
        type="submit"
        disabled={!stripe || !elements || isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Lock className="h-4 w-4" />
        )}
        {isSubmitting ? "Confirming payment..." : "Pay securely"}
      </button>
    </form>
  );
}
