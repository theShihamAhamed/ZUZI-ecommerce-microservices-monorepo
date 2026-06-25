import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";

const trustItems = [
  {
    label: "Verified sellers",
    icon: BadgeCheck,
  },
  {
    label: "Secure checkout",
    icon: ShieldCheck,
  },
  {
    label: "Fast discovery",
    icon: Search,
  },
];

export function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-white to-stone-50">
      <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_0.95fr] lg:gap-14">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-stone-800 shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-600" />
              New marketplace experience
            </div>

            <h1 className="mt-6 text-4xl font-extrabold text-gray-900 sm:text-5xl lg:text-6xl">
              Discover products from trusted sellers
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-gray-600 sm:text-lg">
              Explore trending products, verified shops, and exclusive deals
              across multiple categories.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-black px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              >
                Start Shopping
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center rounded-full border border-stone-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              >
                Become a Seller
              </Link>
            </div>

            <div className="mt-8 grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
              {trustItems.map((item) => {
                const Icon = item.icon;

                return (
                  <div
                    key={item.label}
                    className="flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 shadow-sm"
                  >
                    <Icon className="h-4 w-4 text-amber-600" />
                    <span>{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative min-h-[380px] overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 p-6 shadow-lg shadow-stone-200/60 sm:min-h-[460px] sm:p-8">
            <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/50 blur-3xl" />
            <div className="absolute right-8 top-10 h-24 w-24 rounded-full border border-white/70 bg-white/40" />
            <div className="absolute bottom-10 left-8 h-20 w-20 rounded-3xl border border-amber-100 bg-amber-100/70 rotate-12" />
            <div className="absolute bottom-20 right-12 h-14 w-14 rounded-full bg-stone-200/70" />

            <div className="relative flex min-h-[320px] items-center justify-center sm:min-h-[395px]">
              <div className="absolute left-3 top-6 flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm sm:left-8">
                <BadgeCheck className="h-4 w-4 text-amber-600" />
                Verified shops
              </div>

              <div className="absolute right-3 top-24 flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm sm:right-8">
                <Sparkles className="h-4 w-4 text-amber-600" />
                New deals
              </div>

              <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm sm:flex">
                <Truck className="h-4 w-4 text-amber-600" />
                Fast delivery
              </div>

              <div className="relative w-full max-w-[290px] sm:max-w-[340px]">
                <div className="absolute -left-8 top-12 h-16 w-16 rounded-2xl border border-white bg-white/80 shadow-sm" />
                <div className="absolute -right-6 bottom-12 h-14 w-14 rounded-full border border-amber-200 bg-amber-100/90 shadow-sm" />

                <div className="relative mx-auto flex aspect-[4/5] max-h-[330px] flex-col justify-between rounded-[2rem] border border-stone-300 bg-gradient-to-br from-gray-950 via-gray-900 to-stone-800 p-6 text-white shadow-2xl shadow-stone-400/40">
                  <div className="absolute left-1/2 top-6 h-16 w-28 -translate-x-1/2 rounded-b-full border-b-4 border-l-4 border-r-4 border-amber-200/80" />

                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
                      <ShoppingBag className="h-6 w-6 text-amber-200" />
                    </div>
                    <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-gray-950">
                      Zuzi
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-3">
                      <div className="aspect-square rounded-2xl bg-white/15" />
                      <div className="aspect-square rounded-2xl bg-amber-200/90" />
                      <div className="aspect-square rounded-2xl bg-white/15" />
                    </div>
                    <div>
                      <div className="h-3 w-36 rounded-full bg-white/80" />
                      <div className="mt-3 h-3 w-24 rounded-full bg-white/35" />
                    </div>
                  </div>
                </div>

                <div className="absolute -bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-gray-900 shadow-md">
                  <Package className="h-4 w-4 text-amber-600" />
                  Curated finds
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
