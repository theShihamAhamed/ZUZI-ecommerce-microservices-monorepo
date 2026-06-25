"use client";
import { Step1AccountDetails } from "@/components/seller-signup/Step1AccountDetails";
import { Step2EmailVerification } from "@/components/seller-signup/Step2EmailVerification";
import { Step3ShopSetup } from "@/components/seller-signup/Step3ShopSetup";
import { Step4StripeConnect } from "@/components/seller-signup/Step4StripeConnect";
import { Stepper } from "@/components/seller-signup/Stepper";
import { useAuth } from "@/hooks/useAuth";
import React, { useState, useEffect } from "react";

const STEPS = [
  "Account Details",
  "Email Verification",
  "Shop Setup",
  "Stripe Connect",
];

export interface SellerFormData {
  fullName: string;
  email: string;
  phone: string;
  country: string;
  password: string;
  confirmPassword: string;
  sellerId: string | null;
  shopName: string;
  shopBio: string;
  businessAddress: string;
  openingHours: string;
  websiteUrl: string;
  shopCategory: string;
  shopId: string | null;
  stripeConnected: boolean;
  stripeAccountId: string | null;
}

const SellerSignup = () => {
  const { sellerStatusQuery } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<SellerFormData>({
    fullName: "",
    email: "",
    phone: "",
    country: "",
    password: "",
    confirmPassword: "",
    sellerId: null,
    shopName: "",
    shopBio: "",
    businessAddress: "",
    openingHours: "",
    websiteUrl: "",
    shopCategory: "",
    shopId: null,
    stripeConnected: false,
    stripeAccountId: null,
  });

  const updateFormData = (data: Partial<SellerFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  };

  const nextStep = () => {
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ✅ Automatically set the step based on seller status
  useEffect(() => {
    if (sellerStatusQuery.isSuccess && sellerStatusQuery.data) {
      const status = sellerStatusQuery.data.status;

      switch (status) {
        case "PENDING":
          setCurrentStep(1);
          break;
        case "EMAIL_VERIFIED":
          setCurrentStep(3);
          break;
        case "SHOP_CREATED":
          setCurrentStep(4);
          break;
        case "ACTIVE":
          setCurrentStep(STEPS.length);
          break;
        default:
          setCurrentStep(1);
      }
    }
  }, [sellerStatusQuery.data, sellerStatusQuery.isSuccess]);

  useEffect(() => {
    if (sellerStatusQuery.data?.status === "ACTIVE") {
      window.location.href = "/";
    }
  }, [sellerStatusQuery.data]);

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      <Stepper currentStep={currentStep} steps={STEPS} />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mt-4">
          {/* 🔄 Show loading while status is being checked */}
          {sellerStatusQuery.isPending ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
              <span className="ml-4 text-gray-600">Checking status...</span>
            </div>
          ) : (
            <>
              {currentStep === 1 && (
                <Step1AccountDetails
                  formData={formData}
                  updateFormData={updateFormData}
                  onNext={nextStep}
                />
              )}
              {currentStep === 2 && (
                <Step2EmailVerification
                  sellerId={formData.sellerId || ""}
                  onNext={nextStep}
                />
              )}
              {currentStep === 3 && (
                <Step3ShopSetup
                  formData={formData}
                  updateFormData={updateFormData}
                  onNext={nextStep}
                  onBack={prevStep}
                />
              )}
              {currentStep === 4 && (
                <Step4StripeConnect
                  formData={formData}
                  updateFormData={updateFormData}
                  onBack={prevStep}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SellerSignup;
