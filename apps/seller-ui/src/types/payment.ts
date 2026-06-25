import { SellerOrderPagination } from "@/types/order";

export type SellerCommissionStatus =
  | "Pending"
  | "Earned"
  | "Reversed"
  | "Refunded";

export interface SellerPaymentsQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  sort?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface SellerPaymentsSummary {
  grossSales: number;
  totalCommission: number;
  sellerReceivable: number;
  pendingCommission: number;
  earnedCommission: number;
  pendingReceivable: number;
  earnedReceivable: number;
  totalRecords: number;
}

export interface SellerPaymentListItem {
  id: string;
  orderId: string;
  orderNumber?: string | null;
  orderGroupId?: string | null;
  paymentReference?: string | null;
  commissionBase: number;
  commissionAmount: number;
  sellerReceivableAmount: number;
  currency: string;
  status: SellerCommissionStatus;
  createdAt: string;
  recognizedAt?: string | null;
  orderStatus?: string | null;
  paymentStatus?: string | null;
}

export interface SellerPaymentsResponse {
  success: boolean;
  payments: SellerPaymentListItem[];
  pagination: SellerOrderPagination;
}

export interface SellerPaymentsSummaryResponse {
  success: boolean;
  summary: SellerPaymentsSummary;
}
