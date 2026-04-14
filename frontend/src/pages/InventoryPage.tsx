import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { DataState } from "../components/ui/DataState";
import { SectionCard } from "../components/ui/SectionCard";
import { api } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function InventoryPage() {
  const token = useAuthStore((state) => state.token)!;
  const [search, setSearch] = useState("oil filter i10");

  const searchQuery = useQuery({
    queryKey: ["inventory-search", token, search],
    queryFn: () => api.searchProducts(token, search),
    enabled: search.trim().length >= 2
  });

  const results = useMemo(() => searchQuery.data?.products ?? [], [searchQuery.data]);

  return (
    <div className="page-grid">
      <section className="hero-panel compact">
        <div>
          <p className="eyebrow">Module 1</p>
          <h1>Inventory / Stock Management</h1>
        </div>
        <p className="hero-copy">
          The bulk intake form and lookup surface follow the wireflow in the documentation,
          including room-cabinet-section storage and batch-aware stock.
        </p>
      </section>

      <div className="two-column-grid">
        <SectionCard
          title="Bulk Stock Entry Form"
          subtitle="Incoming stock with supplier bill context"
        >
          <div className="form-grid two-up">
            <label className="field">
              <span>Received date</span>
              <input className="input" defaultValue="2026-04-14" />
            </label>
            <label className="field">
              <span>Supplier</span>
              <input className="input" defaultValue="Shree Nath Distributor" />
            </label>
            <label className="field">
              <span>Bill reference</span>
              <input className="input" defaultValue="INV-2026-0414" />
            </label>
            <label className="field">
              <span>Attach bill</span>
              <input className="input" placeholder="PDF / image upload endpoint" />
            </label>
          </div>

          <div className="table-wrap">
            <table className="panel-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Location</th>
                  <th>Qty</th>
                  <th>Cost</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>OF-HYU-I10</td>
                  <td>R1 / K2 / S3</td>
                  <td>50</td>
                  <td>120</td>
                </tr>
                <tr>
                  <td>BP-MAR-ALTO</td>
                  <td>R1 / K2 / S4</td>
                  <td>30</td>
                  <td>200</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="inline-actions">
            <button className="button" type="button">
              Save all stock entries
            </button>
            <button className="button secondary" type="button">
              Add another row
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Stock Lookup" subtitle="Search by product, SKU, barcode, or vehicle">
          <label className="field">
            <span>Lookup query</span>
            <input
              className="input"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Try: oil filter i10"
            />
          </label>

          <DataState
            loading={searchQuery.isLoading}
            error={searchQuery.error instanceof Error ? searchQuery.error.message : null}
            empty={!results.length}
            emptyMessage="Search results will appear here."
          />

          <div className="stack-list">
            {results.map((product) => (
              <div className="list-row" key={product.id}>
                <div>
                  <strong>{product.name}</strong>
                  <p className="row-meta">
                    {product.sku}
                    {product.vehicles.length
                      ? ` · ${product.vehicles.map((vehicle) => `${vehicle.make} ${vehicle.model}`).join(", ")}`
                      : ""}
                  </p>
                </div>
                <span className="status-pill good">{product.totalStock} in stock</span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
