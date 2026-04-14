import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DataState } from "../components/ui/DataState";
import { MetricCard } from "../components/ui/MetricCard";
import { SectionCard } from "../components/ui/SectionCard";
import { api } from "../lib/api";
import { salesTrend } from "../lib/mock-data";
import { useAuthStore } from "../store/auth-store";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function DashboardPage() {
  const token = useAuthStore((state) => state.token)!;

  const dashboardQuery = useQuery({
    queryKey: ["dashboard", token],
    queryFn: () => api.getDashboard(token)
  });

  const topProductsQuery = useQuery({
    queryKey: ["top-products", token],
    queryFn: () => api.getTopProducts(token)
  });

  const lowStockQuery = useQuery({
    queryKey: ["low-stock", token],
    queryFn: () => api.getLowStock(token)
  });

  const kpis = dashboardQuery.data?.kpis;

  return (
    <div className="page-grid">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Dashboard & KPIs</p>
          <h1>One screen for stock, receivables, movement, and action items.</h1>
        </div>
        <p className="hero-copy">
          The page structure follows the documentation layout: KPI strip, sales trend, top
          products, and a recent activity feed.
        </p>
      </section>

      <div className="metric-grid">
        <MetricCard
          label="Total Stock Value"
          value={formatCurrency(kpis?.totalStockValue ?? 0)}
          hint="Real-time from stock entries"
        />
        <MetricCard
          label="Pending Bills"
          value={formatCurrency(kpis?.pendingBillsValue ?? 0)}
          hint="Partial + overdue receivables"
        />
        <MetricCard
          label="Low Stock Alerts"
          value={String(kpis?.lowStockCount ?? 0)}
          hint="Compared against reorder level"
        />
        <MetricCard
          label="Today's Sales"
          value={formatCurrency(kpis?.todaysSales ?? 0)}
          hint="Same-day sales bill total"
        />
      </div>

      <div className="two-column-grid">
        <SectionCard title="Sales Trend" subtitle="Starter chart mirroring the PDF dashboard">
          <div className="chart-area">
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={salesTrend}>
                <XAxis dataKey="day" stroke="#6a6a5b" />
                <YAxis stroke="#6a6a5b" />
                <Tooltip />
                <Line type="monotone" dataKey="sales" stroke="#b84d1c" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>

        <SectionCard title="Top Selling Products" subtitle="Last 30 days">
          <DataState
            loading={topProductsQuery.isLoading}
            error={topProductsQuery.error instanceof Error ? topProductsQuery.error.message : null}
            empty={!topProductsQuery.data?.products.length}
            emptyMessage="No sales records yet."
          />
          <div className="stack-list">
            {topProductsQuery.data?.products.map((product) => (
              <div className="list-row" key={product.productId}>
                <div>
                  <strong>{product.name}</strong>
                  <p className="row-meta">{product.sku}</p>
                </div>
                <div className="row-stats">
                  <span>{product.quantity} units</span>
                  <span>{formatCurrency(product.revenue)}</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <div className="two-column-grid">
        <SectionCard title="Low Stock Queue" subtitle="Action-required products below reorder level">
          <DataState
            loading={lowStockQuery.isLoading}
            error={lowStockQuery.error instanceof Error ? lowStockQuery.error.message : null}
            empty={!lowStockQuery.data?.products.length}
            emptyMessage="No low-stock products right now."
          />
          <div className="stack-list">
            {lowStockQuery.data?.products.map((product) => (
              <div className="list-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <p className="row-meta">
                    {product.sku} · reorder at {product.reorderLevel}
                  </p>
                </div>
                <span className="status-pill warning">{product.currentQty} left</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Recent Activity Feed" subtitle="Latest logged actions">
          <DataState
            loading={dashboardQuery.isLoading}
            error={dashboardQuery.error instanceof Error ? dashboardQuery.error.message : null}
            empty={!dashboardQuery.data?.recentActivity.length}
            emptyMessage="Activity will appear here once users begin working."
          />
          <div className="feed-list">
            {dashboardQuery.data?.recentActivity.map((item) => (
              <div className="feed-item" key={item.id}>
                <span className="feed-time">
                  {new Date(item.createdAt).toLocaleString("en-IN")}
                </span>
                <strong>{item.employeeName}</strong>
                <p>{item.action.replace(/_/g, " ")}</p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
