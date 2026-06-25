"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { SignupFormData, signupSchema } from "@/constants/auth.schema";
import Link from "next/link";
import GoogleAuthButton from "@/components/forms/GoogleAuthButton";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

const Signup = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
    },
  });
  const router = useRouter();

  const { registerUser } = useAuth();

  const onSubmit = (data: SignupFormData) => {
    registerUser.mutate(data, {
      onSuccess: (res) => {
        router.push(`/verify-email?token=${res.registrationToken}`);
      },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-stone-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Join Zuzi and start shopping today
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg shadow-stone-200/60 sm:rounded-lg sm:px-10 border border-stone-200">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            {/* 🔴 Backend Error */}
            {registerUser.isError && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                {(registerUser.error as any)?.response?.data?.message ||
                  "Something went wrong. Please try again."}
              </div>
            )}

            {/* ✅ Success Message */}
            {registerUser.isSuccess && (
              <div className="rounded-md bg-green-50 p-3 text-sm text-green-700">
                OTP sent to your email. Please verify your account.
              </div>
            )}

            <div>
              <label
                htmlFor="fullName"
                className="block text-sm font-medium text-gray-700"
              >
                Full Name
              </label>
              <div className="mt-1">
                <input
                  id="fullName"
                  type="text"
                  className={`block w-full px-3 py-2 border ${
                    errors.fullName ? "border-red-300" : "border-stone-300"
                  } rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-400`}
                  {...register("fullName")}
                />
                {errors.fullName && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.fullName.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700"
              >
                Email address
              </label>
              <div className="mt-1">
                <input
                  id="email"
                  type="email"
                  className={`block w-full px-3 py-2 border ${
                    errors.email ? "border-red-300" : "border-stone-300"
                  } rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-400`}
                  {...register("email")}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.email.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700"
              >
                Password
              </label>
              <div className="mt-1">
                <input
                  id="password"
                  type="password"
                  className={`block w-full px-3 py-2 border ${
                    errors.password ? "border-red-300" : "border-stone-300"
                  } rounded-md shadow-sm focus:outline-none focus:ring-amber-500 focus:border-amber-400`}
                  {...register("password")}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.password.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={registerUser.isPending}
                className="w-full flex justify-center py-2 px-4 rounded-md text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50"
              >
                {registerUser.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Create Account"
                )}
              </button>
            </div>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-stone-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <div className="mt-6">
              <GoogleAuthButton text="Continue with Google" />
            </div>

            <p className="mt-6 text-center text-sm text-gray-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-gray-900 hover:text-amber-700 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
