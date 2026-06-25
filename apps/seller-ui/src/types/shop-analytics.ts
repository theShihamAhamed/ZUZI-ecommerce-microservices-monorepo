export interface SellerShopDailyVisit {
  date: string;
  totalVisits: number;
  loggedInVisits: number;
  guestVisits: number;
}

export interface SellerShopAnalytics {
  shopId: string;
  totalVisits: number;
  loggedInVisits: number;
  guestVisits: number;
  lastVisitedAt: string | null;
  daily: SellerShopDailyVisit[];
}

export interface SellerShopAnalyticsResponse {
  success: boolean;
  analytics: SellerShopAnalytics;
}
