"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const ResetPasswordPage = () => {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const { verifyResetToken, resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [tokenValid, setTokenValid] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // 🔹 Verify reset token on page load
  useEffect(() => {
    if (!token) {
      router.replace("/login");
      return;
    }

    verifyResetToken.mutate(token, {
      onSuccess: () => setTokenValid(true),
      onError: () => {
        setTokenValid(false);
        setTimeout(() => router.push("/login"), 2000);
      },
    });
  }, [token]);

  // 🔹 Loading while verifying token
  if (verifyResetToken.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!tokenValid) {
    return <p>Session expired. Redirecting...</p>;
  }

  // 🔹 Submit new password
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    resetPassword.mutate(
      { token, password },
      {
        onSuccess: (data) => {
          setSuccess(
            data?.message || "Password reset successfully. Redirecting...",
          );
          setTimeout(() => router.push("/login"), 2000);
        },
        onError: (err: any) => {
          setTokenValid(false);
          setError(
            err?.response?.data?.message || "Invalid or expired reset link",
          );
          setTimeout(() => router.push("/login"), 2000);
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-lg shadow-sm p-8">
        <h2 className="text-2xl font-extrabold text-center text-gray-900">
          Reset password
        </h2>

        <p className="mt-2 text-center text-sm text-gray-600">
          Enter your new password below
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          {/* New Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New password
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-black focus:border-black"
              />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Confirm password
            </label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="pl-10 block w-full rounded-md border border-gray-300 px-3 py-2 focus:ring-black focus:border-black"
              />
            </div>
          </div>

          {/* Error / Success Messages */}
          {error && <p className="text-sm text-red-600 text-center">{error}</p>}
          {success && (
            <p className="text-sm text-green-600 text-center">{success}</p>
          )}

          <button
            type="submit"
            disabled={resetPassword.isPending}
            className="w-full flex justify-center items-center gap-2 py-2 px-4 rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {resetPassword.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Resetting
              </>
            ) : (
              "Set new password"
            )}
          </button>

          {/* Back to login */}
          <button
            type="button"
            onClick={() => router.push("/login")}
            className="w-full mt-2 py-2 px-4 rounded-md text-sm border border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Back to Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
