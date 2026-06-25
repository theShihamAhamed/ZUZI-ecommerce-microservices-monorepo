"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const VerifyEmailContent = () => {
  const [isValidToken, setIsValidToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string[]>(["", "", "", ""]);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const timerRef = useRef<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const registrationToken = searchParams.get("token");

  const { verifyOtp, resendOtp, verifyToken } = useAuth();

  const checkToken = async () => {
    if (!registrationToken) {
      router.replace("/login");
      return;
    }

    try {
      await verifyToken.mutateAsync(registrationToken);
      setIsValidToken(true);
    } catch (err) {
      setIsValidToken(false);
      setTimeout(() => router.replace("/login"), 2000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkToken();
  }, [registrationToken]);

  useEffect(() => {
    if (!shouldRedirect) return;

    const id = setTimeout(() => {
      router.replace("/");
    }, 2000);

    return () => clearTimeout(id);
  }, [shouldRedirect]);

  const startTimer = () => {
    setCanResend(false);
    setTimer(60);

    // Clear existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Store interval id in timerRef
    timerRef.current = window.setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];

    // Handle paste
    if (value.length > 1) {
      const pasted = value.slice(0, 4).split("");
      for (let i = 0; i < 4; i++) {
        newCode[i] = pasted[i] || "";
      }
      setCode(newCode);
      inputRefs.current[Math.min(pasted.length, 3)]?.focus();
      return;
    }

    newCode[index] = value;
    setCode(newCode);

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  useEffect(() => {
    if (verifyOtp.isError) {
      setCode(["", "", "", ""]);
      inputRefs.current[0]?.focus();
    }
  }, [verifyOtp.isError]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = () => {
    if (!registrationToken) return;

    const otp = code.join("");
    if (otp.length !== 4) return;

    verifyOtp.mutate(
      { registrationToken, otp },
      {
        onSuccess: () => {
          router.push("/login");
        },
        onError: async () => {
          try {
            await verifyToken.mutateAsync(registrationToken);
          } catch {
            setIsValidToken(false);
            setShouldRedirect(true);
          }
        },
      },
    );
  };

  /* ---------------- Resend OTP ---------------- */
  const handleResendOtp = async () => {
    if (!registrationToken) return;

    if (resendOtp.isError) resendOtp.reset();
    if (verifyOtp.isError) verifyOtp.reset();

    resendOtp.mutate(
      { registrationToken },
      {
        onSuccess: () => {
          startTimer();
        },

        onError: async () => {
          try {
            await verifyToken.mutateAsync(registrationToken);
          } catch {
            setIsValidToken(false);
            setShouldRedirect(true);
          }
        },
      },
    );
  };

  if (loading) return <p>Loading...</p>;
  if (!isValidToken) {
    return <p>Session expired. Redirecting...</p>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-stone-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-stone-200 rounded-lg shadow-lg shadow-stone-200/60 p-8">
        <h2 className="text-2xl font-extrabold text-center text-gray-900">
          Verify your email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Enter the 4-digit code sent to your email
        </p>

        {/* OTP Inputs */}
        <div className="mt-8 flex justify-center gap-4">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-14 h-14 text-center text-xl font-semibold border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-400 transition"
            />
          ))}
        </div>

        {/* Timer + Resend */}
        <div className="mt-6 flex justify-between items-center text-sm text-gray-600">
          <span>
            {canResend
              ? "You can request again"
              : `Resend available in 00:${timer.toString().padStart(2, "0")}`}
          </span>

          <button
            onClick={handleResendOtp}
            disabled={!canResend || resendOtp.isPending}
            className="text-sm font-medium text-gray-900 hover:text-amber-700 disabled:text-gray-400"
          >
            {resendOtp.isPending ? "Sending..." : "Resend OTP"}
          </button>
        </div>

        {/* Backend Error */}
        {verifyOtp.isError && (
          <p className="mt-4 text-sm text-red-600 text-center">
            {(verifyOtp.error as any)?.response?.data?.message ||
              "Invalid verification code"}
          </p>
        )}

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={verifyOtp.isPending || code.some((d) => !d)}
          className="mt-8 w-full flex justify-center items-center gap-2 py-2 px-4 rounded-md bg-black text-white text-sm font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
        >
          {verifyOtp.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Verifying
            </>
          ) : (
            "Verify email"
          )}
        </button>
        {resendOtp.isError && (
          <p className="mt-2 text-sm text-red-600 text-center">
            {(resendOtp.error as any)?.response?.data?.message ||
              "Unable to resend OTP. Try again later."}
          </p>
        )}
      </div>
    </div>
  );
};

const VerifyEmail = () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <VerifyEmailContent />
    </Suspense>
  );
};

export default VerifyEmail;
