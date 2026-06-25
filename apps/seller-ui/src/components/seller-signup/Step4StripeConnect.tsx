"use client";
import React, { useState } from "react";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  CreditCard,
} from "lucide-react";
import { SellerFormData } from "@/app/(auth)/sign-up/page";
import { useAuth } from "@/hooks/useAuth";

interface Step4Props {
  formData: SellerFormData;
  updateFormData: (data: Partial<SellerFormData>) => void;
  onBack: () => void;
}

export const Step4StripeConnect: React.FC<Step4Props> = ({
  formData,
  updateFormData,
  onBack,
}) => {
  const { connectStripe } = useAuth();

  const [isConnecting, setIsConnecting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    setApiError(null);

    try {
      const response = await connectStripe.mutateAsync();
      if (response.url) {
        window.location.href = response.url; // redirect to Stripe onboarding
      } else {
        setApiError("Failed to initiate Stripe onboarding. Please try again.");
      }
    } catch (error: any) {
      setApiError(
        error?.response?.data?.message || "An unexpected error occurred.",
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleFinish = () => {
    // No backend call needed, just mark as complete
    setIsComplete(true);
  };

  if (isComplete) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-8 sm:p-12 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Welcome to Zuzi!
          </h2>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Your seller account setup is complete. You can now start adding
            products to your shop.
          </p>
          <div className="space-y-4">
            <button
              onClick={() => (window.location.href = "/seller/dashboard")}
              className="w-full sm:w-auto inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-all"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6 sm:p-8 text-center">
        <div className="mb-8">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-gray-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            Connect your payout method
          </h2>
          <p className="mt-2 text-sm text-gray-600 max-w-md mx-auto">
            Zuzi uses Stripe to securely send you payouts. Connect your Stripe
            account to start receiving payments.
          </p>
        </div>

        {/* API Error Alert */}
        {apiError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600">{apiError}</p>
          </div>
        )}

        <div className="py-8 flex flex-col items-center justify-center">
          <div className="space-y-4">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="inline-flex items-center px-8 py-4 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-[#635BFF] hover:bg-[#5851E3] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#635BFF] disabled:opacity-70 transition-all"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Connecting to Stripe...
                </>
              ) : (
                <>
                  Connect with Stripe
                  <ExternalLink className="ml-2 w-4 h-4" />
                </>
              )}
            </button>
            <p className="text-xs text-gray-500">
              You'll be redirected to Stripe to complete the setup.
            </p>
            <button
              onClick={handleFinish}
              className="text-sm text-gray-500 hover:text-gray-900 font-medium mt-2"
            >
              I'll do this later
            </button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 flex justify-between items-center">
          <button
            onClick={onBack}
            disabled={isConnecting}
            className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </button>
        </div>
      </div>
    </div>
  );
};
