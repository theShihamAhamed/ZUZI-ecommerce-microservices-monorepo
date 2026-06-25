"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Boxes,
  CreditCard,
  LayoutDashboard,
  ListFilter,
  LogOut,
  LucideIcon,
  Menu,
  ScrollText,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Star,
  Store,
  Ticket,
  UsersRound,
  X,
} from "lucide-react";
import { adminFetch, logoutAdmin } from "@/lib/admin-api";
import type { AdminUser } from "@/types/admin";

type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
};

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [{ title: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Main Menu",
    items: [
      { title: "Orders", href: "/orders", icon: ShoppingCart },
      { title: "Payments", href: "/payments", icon: CreditCard },
      { title: "Products", href: "/products", icon: Boxes },
      { title: "Reviews", href: "/reviews", icon: Star },
      { title: "Events", href: "/events", icon: Ticket },
      { title: "Users", href: "/users", icon: UsersRound },
      { title: "Sellers", href: "/sellers", icon: Store },
    ],
  },
  {
    label: "Controllers",
    items: [
      { title: "Loggers", href: "/loggers", icon: ScrollText },
      { title: "Management", href: "/management", icon: ListFilter },
      { title: "Notifications", href: "/notifications", icon: Bell },
    ],
  },
  {
    label: "Customization",
    items: [
      { title: "All Customization", href: "/customization", icon: Settings },
    ],
  },
];

const isRouteActive = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(`${href}/`);

function SidebarContent({
  admin,
  pathname,
  onNavigate,
  onLogout,
}: {
  admin: AdminUser;
  pathname: string;
  onNavigate?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-100">
      <div className="border-b border-slate-800 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300 text-slate-950">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">Zuzi Admin</p>
            <p className="truncate text-xs text-slate-400">{admin.email}</p>
          </div>
        </div>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {group.label}
            </p>
            <div className="mt-2 space-y-1">
              {group.items.map((item) => {
                const active = isRouteActive(pathname, item.href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                      active
                        ? "bg-amber-300 text-slate-950"
                        : "text-slate-300 hover:bg-slate-900 hover:text-amber-200"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800 p-3">
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-red-500/10 hover:text-red-200"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    adminFetch<{ success: boolean; admin: AdminUser }>("/auth/me")
      .then((response) => {
        if (mounted) {
          setAdmin(response.admin);
        }
      })
      .catch(() => {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [pathname, router]);

  const pageTitle = useMemo(() => {
    const activeItem = navGroups
      .flatMap((group) => group.items)
      .find((item) => isRouteActive(pathname, item.href));

    return activeItem?.title || "Admin";
  }, [pathname]);

  const handleLogout = async () => {
    await logoutAdmin().catch(() => undefined);
    router.replace("/login");
  };

  if (isLoading || !admin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-white">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-300">
          Loading admin workspace...
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-slate-800 lg:block">
        <SidebarContent
          admin={admin}
          pathname={pathname}
          onLogout={handleLogout}
        />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin menu"
            className="absolute inset-0 bg-slate-950/70"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[min(20rem,86vw)]">
            <SidebarContent
              admin={admin}
              pathname={pathname}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      <div className="min-w-0 lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-stone-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                aria-label={mobileOpen ? "Close admin menu" : "Open admin menu"}
                onClick={() => setMobileOpen((value) => !value)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white text-slate-700 shadow-sm lg:hidden"
              >
                {mobileOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Admin Console
                </p>
                <h1 className="truncate text-lg font-bold text-slate-950">
                  {pageTitle}
                </h1>
              </div>
            </div>
            <div className="hidden min-w-0 text-right sm:block">
              <p className="truncate text-sm font-semibold text-slate-900">
                {admin.name}
              </p>
              <p className="truncate text-xs text-slate-500">{admin.role}</p>
            </div>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] min-w-0 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
