"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { sidebarData } from "@/constants/sidebar-data";
import { useAuth, useSellerSession } from "@/hooks/useAuth";
import { useSellerUnreadNotificationCount } from "@/hooks/useNotifications";

const getInitials = (value?: string) => {
  if (!value) return "S";

  return value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
};

const getAvatarUrl = (avatar: unknown) => {
  if (!avatar || typeof avatar !== "object" || Array.isArray(avatar)) return "";

  return (avatar as { url?: string }).url || "";
};

export function SellerSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout } = useAuth();
  const { seller, shop, isLoading } = useSellerSession();
  const unreadNotifications = useSellerUnreadNotificationCount(Boolean(seller));
  const displayName = shop?.name || seller?.name || "Seller workspace";
  const secondaryText = seller?.email || shop?.address || "Loading seller";
  const avatarUrl = getAvatarUrl(shop?.avatar) || getAvatarUrl(seller?.avatar);
  const initials = getInitials(displayName);

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      router.replace("/login");
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      className="border-r border-slate-200 bg-white text-slate-700 shadow-sm"
    >
      {/* HEADER */}
      <SidebarHeader className="border-b border-slate-200 px-4 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-emerald-200 bg-emerald-50 text-sm font-bold text-emerald-700">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initials
            )}
          </div>
          <div className="min-w-0 space-y-0.5">
            {isLoading ? (
              <>
                <div className="h-3.5 w-28 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-36 animate-pulse rounded bg-slate-200" />
              </>
            ) : (
              <>
                <h2 className="truncate text-sm font-semibold text-slate-950">
                  {displayName}
                </h2>
                <p className="truncate text-xs text-slate-500">
                  {secondaryText}
                </p>
              </>
            )}
          </div>
        </div>
      </SidebarHeader>

      {/* CONTENT */}
      <SidebarContent>
        {sidebarData.main.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>

            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive =
                    item.href &&
                    (pathname === item.href ||
                      (item.href !== "/dashboard" &&
                        pathname.startsWith(`${item.href}/`)));

                  if (item.disabled) {
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          disabled
                          className="cursor-not-allowed text-slate-400 opacity-100"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          <span className="ml-auto rounded-full border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                            Soon
                          </span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        asChild
                        isActive={Boolean(isActive)}
                        className="text-slate-600 transition hover:bg-emerald-50 hover:text-emerald-800 data-[active=true]:bg-emerald-100 data-[active=true]:font-semibold data-[active=true]:text-emerald-900"
                      >
                        <Link href={item.href || "#"}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                          {item.title === "Notifications" &&
                          (unreadNotifications.data?.unreadCount || 0) > 0 ? (
                            <span className="ml-auto rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              {Math.min(
                                unreadNotifications.data?.unreadCount || 0,
                                99,
                              )}
                            </span>
                          ) : null}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      {/* FOOTER */}
      <SidebarFooter className="border-t border-slate-200">
        <SidebarMenu>
          {sidebarData.footer.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                onClick={item.title === "Logout" ? handleLogout : undefined}
                className="text-slate-600 transition hover:bg-red-50 hover:text-red-700"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
