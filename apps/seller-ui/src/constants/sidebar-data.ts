import {
  Bell,
  Calendar,
  CalendarPlus,
  CreditCard,
  Inbox,
  LayoutDashboard,
  LogOut,
  Package,
  PlusSquare,
  Settings,
  ShoppingCart,
  Star,
  TicketPercent,
  User,
  type LucideIcon,
} from "lucide-react";

interface SidebarItem {
  title: string;
  icon: LucideIcon;
  href?: string;
  disabled?: boolean;
}

interface SidebarGroup {
  label: string;
  items: SidebarItem[];
}

interface SidebarData {
  main: SidebarGroup[];
  footer: SidebarItem[];
}

export const sidebarData: SidebarData = {
  main: [
    {
      label: "Main Menu",
      items: [
        { title: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
        { title: "Orders", icon: ShoppingCart, href: "/dashboard/orders" },
        { title: "Payments", icon: CreditCard, href: "/dashboard/payments" },
        { title: "Reviews", icon: Star, href: "/dashboard/reviews" },
      ],
    },
    {
      label: "Products",
      items: [
        {
          title: "Create Product",
          icon: PlusSquare,
          href: "/dashboard/create-product",
        },
        { title: "All Products", icon: Package, href: "/dashboard/products" },
        {
          title: "Discount Codes",
          icon: TicketPercent,
          href: "/dashboard/discount-codes",
        },
      ],
    },
    {
      label: "Events",
      items: [
        {
          title: "Create Event",
          icon: CalendarPlus,
          href: "/dashboard/create-event",
        },
        { title: "All Events", icon: Calendar, href: "/dashboard/events" },
      ],
    },
    {
      label: "Controllers",
      items: [
        { title: "Inbox", icon: Inbox, href: "/dashboard/inbox" },
        { title: "Settings", icon: Settings, href: "/dashboard/settings" },
        {
          title: "Notifications",
          icon: Bell,
          href: "/dashboard/notifications",
        },
      ],
    },
    {
      label: "Extras",
      items: [
        { title: "Account/Profile", icon: User, disabled: true },
      ],
    },
  ],

  footer: [
    { title: "Logout", icon: LogOut, href: "/login" },
  ],
};
