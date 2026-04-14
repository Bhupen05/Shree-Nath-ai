import { FormEvent, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DataState } from "../components/ui/DataState";
import { SectionCard } from "../components/ui/SectionCard";
import { api, VoiceLookupResponse } from "../lib/api";
import { useAuthStore } from "../store/auth-store";

export function AIPage() {
  const token = useAuthStore((state) => state.token)!;
  const [queryText, setQueryText] = useState("I want an oil filter for a Hyundai i10");
  const [voiceResult, setVoiceResult] = useState<VoiceLookupResponse | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const suggestionsQuery = useQuery({
    queryKey: ["reorder-suggestions", token],
    queryFn: () => api.getReorderSuggestions(token)
  });

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVoiceLoading(true);
    setVoiceError(null);

    try {
      const response = await api.runVoiceLookup(queryText);
      setVoiceResult(response);
    } catch (error) {
      setVoiceError(error instanceof Error ? error.message : "Unable to reach AI voice webhook.");
    } finally {
      setVoiceLoading(false);
    }
  }

  return (
    <div className="page-grid">
      <section className="hero-panel compact">
        <div>
          <p className="eyebrow">Module 4</p>
          <h1>AI Agent</h1>
        </div>
        <p className="hero-copy">
          This screen covers both AI modes from the PDF: reorder intelligence for managers and a
          voice-query test bench for incoming stock questions.
        </p>
      </section>

      <div className="two-column-grid">
        <SectionCard title="Voice Query Sandbox" subtitle="Simulates the Twilio + Whisper + GPT flow">
          <form className="form-grid" onSubmit={handleLookup}>
            <label className="field">
              <span>Customer query</span>
              <textarea
                className="input textarea"
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
              />
            </label>
            {voiceError ? <p className="helper-text error">{voiceError}</p> : null}
            <button className="button" disabled={voiceLoading} type="submit">
              {voiceLoading ? "Looking up stock..." : "Run voice lookup"}
            </button>
          </form>

          {voiceResult ? (
            <div className="result-card">
              <strong>{voiceResult.fulfilled ? "Match found" : "Demand logged"}</strong>
              <p>{voiceResult.message}</p>
              {voiceResult.product ? (
                <div className="stack-list">
                  {voiceResult.product.locations.map((location) => (
                    <div className="list-row" key={location.stockEntryId}>
                      <span>
                        {location.room} / {location.cabinet} / {location.section}
                      </span>
                      <span className="status-pill good">{location.quantity} units</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard title="Reorder Suggestions" subtitle="Manager-facing AI intelligence">
          <DataState
            loading={suggestionsQuery.isLoading}
            error={suggestionsQuery.error instanceof Error ? suggestionsQuery.error.message : null}
            empty={!suggestionsQuery.data?.suggestions.length}
            emptyMessage="No reorder suggestions right now."
          />
          <div className="stack-list">
            {suggestionsQuery.data?.suggestions.map((item) => (
              <div className="list-row" key={item.productId}>
                <div>
                  <strong>{item.name}</strong>
                  <p className="row-meta">
                    {item.sku} · current {item.currentQty} / reorder {item.reorderLevel}
                  </p>
                </div>
                <span className="status-pill warning">
                  Suggest {item.suggestedOrderQty}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
