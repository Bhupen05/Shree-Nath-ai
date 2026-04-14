import { useQuery } from "@tanstack/react-query";
import { DataState } from "../components/ui/DataState";
import { SectionCard } from "../components/ui/SectionCard";
import { api } from "../lib/api";
import { reminderSchedule } from "../lib/mock-data";
import { useAuthStore } from "../store/auth-store";

function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function BillingPage() {
  const token = useAuthStore((state) => state.token)!;

  const billsQuery = useQuery({
    queryKey: ["sales-bills", token],
    queryFn: () => api.getBills(token)
  });

  return (
    <div className="page-grid">
      <section className="hero-panel compact">
        <div>
          <p className="eyebrow">Module 2</p>
          <h1>Billing System</h1>
        </div>
        <p className="hero-copy">
          Sales billing, FIFO-aware stock deduction, payment collection, and reminder scheduling
          are scaffolded around the routes described in the PDF.
        </p>
      </section>

      <div className="two-column-grid">
        <SectionCard title="New Sales Bill" subtitle="UI layout aligned with the documentation">
          <div className="form-grid two-up">
            <label className="field">
              <span>Bill number</span>
              <input className="input" defaultValue="SALE-2026-0001" />
            </label>
            <label className="field">
              <span>Date</span>
              <input className="input" defaultValue="2026-04-14" />
            </label>
            <label className="field">
              <span>Due date</span>
              <input className="input" defaultValue="2026-04-21" />
            </label>
            <label className="field">
              <span>Customer</span>
              <input className="input" defaultValue="Ahmed Auto" />
            </label>
          </div>

          <div className="table-wrap">
            <table className="panel-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Oil Filter</td>
                  <td>2</td>
                  <td>350</td>
                  <td>700</td>
                </tr>
                <tr>
                  <td>Brake Pad</td>
                  <td>4</td>
                  <td>450</td>
                  <td>1800</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="inline-stats">
            <span>Discount: 0%</span>
            <span>GST: 18%</span>
            <strong>Grand total: Rs 2,960</strong>
          </div>

          <div className="inline-actions">
            <button className="button" type="button">
              Confirm & print
            </button>
            <button className="button secondary" type="button">
              Save draft
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Reminder Automation" subtitle="Scheduled follow-ups from the PDF">
          <div className="stack-list">
            {reminderSchedule.map((item) => (
              <div className="list-row" key={item.trigger}>
                <div>
                  <strong>{item.trigger}</strong>
                  <p className="row-meta">{item.note}</p>
                </div>
                <span className="status-pill">{item.channel}</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recent Sales Bills" subtitle="Data pulled from the backend">
        <DataState
          loading={billsQuery.isLoading}
          error={billsQuery.error instanceof Error ? billsQuery.error.message : null}
          empty={!billsQuery.data?.bills.length}
          emptyMessage="No bills created yet."
        />

        <div className="table-wrap">
          <table className="panel-table">
            <thead>
              <tr>
                <th>Bill</th>
                <th>Party</th>
                <th>Status</th>
                <th>Total</th>
                <th>Paid</th>
              </tr>
            </thead>
            <tbody>
              {billsQuery.data?.bills.map((bill) => (
                <tr key={bill.id}>
                  <td>{bill.billNumber}</td>
                  <td>{bill.customer?.name ?? bill.supplier?.name ?? "Unknown"}</td>
                  <td>{bill.status}</td>
                  <td>{formatCurrency(bill.totalAmount)}</td>
                  <td>{formatCurrency(bill.paidAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
}
