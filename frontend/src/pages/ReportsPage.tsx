import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { DataState } from "../components/ui/DataState";
import { MetricCard } from "../components/ui/MetricCard";
import { SectionCard } from "../components/ui/SectionCard";
import { api, buildApiUrl } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(value);
}

export function ReportsPage() {
  const token = useAuthStore((state) => state.token)!;
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const salesReportQuery = useQuery({
    queryKey: ["sales-report", token],
    queryFn: () => api.getSalesReport(token)
  });

  async function handleDownloadStockReport() {
    setDownloading(true);
    setDownloadError(null);

    try {
      const response = await fetch(buildApiUrl("/reports/stock"), {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error("Unable to download stock report.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "stock-report.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Download failed.");
    } finally {
      setDownloading(false);
    }
  }

  const summary = salesReportQuery.data?.summary;

  return (
    <div className="page-grid">
      <section className="hero-panel compact">
        <div>
          <p className="eyebrow">Exports & Insights</p>
          <h1>Reports</h1>
        </div>
        <p className="hero-copy">
          The starter includes a downloadable CSV stock report and a manager sales summary route,
          matching the reporting APIs in the documentation.
        </p>
      </section>

      <div className="metric-grid">
        <MetricCard
          label="Total Bills"
          value={String(summary?.totalBills ?? 0)}
          hint="Sales report count"
        />
        <MetricCard
          label="Gross Sales"
          value={formatCurrency(summary?.grossSales ?? 0)}
          hint="Total billed amount"
        />
        <MetricCard
          label="Collected"
          value={formatCurrency(summary?.totalCollected ?? 0)}
          hint="Payments received"
        />
        <MetricCard
          label="Overdue Bills"
          value={String(summary?.overdueBills ?? 0)}
          hint="Receivables at risk"
        />
      </div>

      <div className="two-column-grid">
        <SectionCard title="Exports" subtitle="Operational downloads">
          <div className="inline-actions">
            <button className="button" onClick={handleDownloadStockReport} type="button">
              {downloading ? "Preparing CSV..." : "Download stock report"}
            </button>
            <span className="helper-text">Uses the authenticated `/reports/stock` API route.</span>
          </div>
          {downloadError ? <p className="helper-text error">{downloadError}</p> : null}
        </SectionCard>

        <SectionCard title="Sales Summary" subtitle="Date-range capable JSON report">
          <DataState
            loading={salesReportQuery.isLoading}
            error={salesReportQuery.error instanceof Error ? salesReportQuery.error.message : null}
            empty={!salesReportQuery.data?.bills.length}
            emptyMessage="No sales report records yet."
          />
          <div className="stack-list">
            {salesReportQuery.data?.bills.slice(0, 6).map((bill) => (
              <div className="list-row" key={bill.id}>
                <div>
                  <strong>{bill.billNumber}</strong>
                  <p className="row-meta">
                    {bill.customer?.name ?? "Customer"} ·{" "}
                    {new Date(bill.billDate).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <span className="status-pill">{bill.status}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
