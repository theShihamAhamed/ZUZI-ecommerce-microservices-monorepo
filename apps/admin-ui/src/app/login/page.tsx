import Link from "next/link";
import { Suspense } from "react";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { AdminLoginForm } from "@/components/auth/admin-login-form";

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-white">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-amber-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="mt-8 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-300 text-slate-950">
          <LockKeyhole className="h-6 w-6" />
        </div>

        <h1 className="mt-5 text-2xl font-semibold">Admin login</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Sign in with an internal admin account to manage marketplace
          operations.
        </p>

        <Suspense
          fallback={
            <div className="mt-7 rounded-xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              Loading login form...
            </div>
          }
        >
          <AdminLoginForm />
        </Suspense>
      </section>
    </main>
  );
}
