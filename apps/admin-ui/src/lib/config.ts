const DEFAULT_GATEWAY_URL = "http://localhost:8090";

export const gatewayBaseUrl =
  process.env.NEXT_PUBLIC_SERVER_URI || DEFAULT_GATEWAY_URL;

export const adminServiceHealthUrl = `${gatewayBaseUrl}/admin/api/health`;
