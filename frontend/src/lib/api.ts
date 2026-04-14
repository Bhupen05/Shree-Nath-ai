export type DashboardResponse = {
  success: boolean;
  kpis: {
    totalStockValue: number;
    pendingBillsValue: number;
    lowStockCount: number;
    todaysSales: number;
  };
  recentActivity: Array<{
    id: string;
    createdAt: string;
    action: string;
    employeeName: string;
    metadata: Record<string, unknown> | null;
  }>;
};

export type TopProductsResponse = {
  success: boolean;
  products: Array<{
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    revenue: number;
  }>;
};

export type LowStockResponse = {
  success: boolean;
  products: Array<{
    id: string;
    sku: string;
    name: string;
    reorderLevel: number;
    currentQty: number;
  }>;
};

export type ActivityLogsResponse = {
  success: boolean;
  activityLogs: Array<{
    id: string;
    createdAt: string;
    action: string;
    entityType: string | null;
    employee: {
      id: string;
      fullName: string;
      empCode: string;
    } | null;
    metadata: Record<string, unknown> | null;
  }>;
};

export type EmployeesResponse = {
  success: boolean;
  employees: Array<{
    id: string;
    empCode: string;
    fullName: string;
    phone: string | null;
    email: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
    roles: string[];
    createdAt: string;
  }>;
};

export type BillsResponse = {
  success: boolean;
  bills: Array<{
    id: string;
    billNumber: string;
    billType: string;
    status: string;
    totalAmount: number | string;
    paidAmount: number | string;
    billDate: string;
    customer?: { name: string } | null;
    supplier?: { name: string } | null;
  }>;
};

export type SalesReportResponse = {
  success: boolean;
  summary: {
    totalBills: number;
    grossSales: number;
    totalCollected: number;
    overdueBills: number;
  };
  bills: Array<{
    id: string;
    billNumber: string;
    totalAmount: number | string;
    paidAmount: number | string;
    billDate: string;
    status: string;
    customer?: { name: string } | null;
  }>;
};

export type ReorderSuggestionsResponse = {
  success: boolean;
  suggestions: Array<{
    productId: string;
    sku: string;
    name: string;
    currentQty: number;
    reorderLevel: number;
    suggestedOrderQty: number;
    preferredSupplier: string | null;
  }>;
};

export type VoiceLookupResponse = {
  success: boolean;
  fulfilled: boolean;
  message: string;
  demandLogId?: string;
  product?: {
    id: string;
    sku: string;
    name: string;
    totalStock: number;
    locations: Array<{
      stockEntryId: string;
      quantity: number;
      room: string;
      cabinet: string;
      section: string;
    }>;
  };
};

export type SearchProductsResponse = {
  success: boolean;
  products: Array<{
    id: string;
    sku: string;
    name: string;
    brand?: string | null;
    totalStock: number;
    vehicles: Array<{
      id: string;
      make: string;
      model: string;
    }>;
  }>;
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/v1";

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  login: (identifier: string, password: string) =>
    request<{
      success: boolean;
      accessToken: string;
      employee: {
        id: string;
        empCode: string;
        fullName: string;
        roles: string[];
      };
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password })
    }),
  getDashboard: (token: string) => request<DashboardResponse>("/dashboard/kpis", {}, token),
  getTopProducts: (token: string) =>
    request<TopProductsResponse>("/dashboard/top-products", {}, token),
  getLowStock: (token: string) => request<LowStockResponse>("/dashboard/low-stock", {}, token),
  getBills: (token: string) => request<BillsResponse>("/bills?billType=SALES", {}, token),
  getEmployees: (token: string) => request<EmployeesResponse>("/employees", {}, token),
  getActivityLogs: (token: string) =>
    request<ActivityLogsResponse>("/activity-logs?limit=20", {}, token),
  getReorderSuggestions: (token: string) =>
    request<ReorderSuggestionsResponse>("/ai/reorder-suggestions", {}, token),
  runVoiceLookup: (queryText: string) =>
    request<VoiceLookupResponse>("/ai/voice/webhook", {
      method: "POST",
      body: JSON.stringify({ queryText })
    }),
  getSalesReport: (token: string) =>
    request<SalesReportResponse>("/reports/sales", {}, token),
  searchProducts: (token: string, q: string) =>
    request<SearchProductsResponse>(`/products/search?q=${encodeURIComponent(q)}`, {}, token)
};

export function buildApiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}
