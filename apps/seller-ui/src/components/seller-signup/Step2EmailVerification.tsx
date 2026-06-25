"use client";
import React, { useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Step2Props {
  sellerId: string; // registrationToken from step 1
  onNext: () => void;
}

export const Step2EmailVerification: React.FC<Step2Props> = ({
  sellerId,
  onNext,
}) => {
  const { verifyOtp, resendOtp } = useAuth();
  const [otp, setOtp] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Verify OTP
  const handleVerify = async () => {
    setApiError(null);
    try {
      await verifyOtp.mutateAsync({ registrationToken: sellerId, otp });
      onNext(); // Move to next step on success
    } catch (error: any) {
      setApiError(error?.response?.data?.message || "OTP verification failed.");
    }
  };

  // Resend OTP
  const handleResend = async () => {
    setApiError(null);
    setSuccessMessage(null);
    try {
      await resendOtp.mutateAsync(sellerId);
      setSuccessMessage("OTP has been resent to your email.");
    } catch (error: any) {
      setApiError(error?.response?.data?.message || "Failed to resend OTP.");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white shadow-sm border border-gray-100 rounded-lg p-6 sm:p-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Email Verification
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Enter the OTP sent to your email to verify your account.
        </p>

        {apiError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Error</p>
              <p className="text-sm text-red-600 mt-1">{apiError}</p>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
            {successMessage}
          </div>
        )}

        <div className="mb-6">
          <input
            type="text"
            maxLength={4}
            placeholder="Enter OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm"
          />
        </div>

        <div className="flex justify-between items-center gap-4">
          <button
            onClick={handleResend}
            disabled={resendOtp.isPending}
            className="px-4 py-2 bg-gray-100 text-gray-800 rounded-md text-sm hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendOtp.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin mx-auto" />
            ) : (
              "Resend OTP"
            )}
          </button>

          <button
            onClick={handleVerify}
            disabled={verifyOtp.isPending || otp.length !== 4}
            className="px-4 py-2 bg-black text-white rounded-md text-sm flex items-center justify-center hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {verifyOtp.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              "Verify OTP"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
