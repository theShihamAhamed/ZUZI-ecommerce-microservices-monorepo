"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { CartSync } from "@/components/cart/cart-sync";
import { WebSocketProvider } from "@/providers/websocket-provider";

export default function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <CartSync />
      <WebSocketProvider>{children}</WebSocketProvider>
    </QueryClientProvider>
  );
}
