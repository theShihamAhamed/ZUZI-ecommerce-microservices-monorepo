import { SellerSidebar } from "@/components/shared/sidebar/Sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function SellerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full overflow-x-hidden bg-[#f6f8f5]">
        <SellerSidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_34rem)]">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
