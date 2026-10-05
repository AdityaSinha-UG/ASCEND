"use client";

import { CAMPAIGN_STAGE_LABELS, type CampaignStage } from "@/lib/utils/campaignGeneration";

export function CampaignGenerationPanel({ stage, error }: { stage: CampaignStage | null; error?: string | null }) {
  const activeIndex = stage ? CAMPAIGN_STAGE_LABELS.findIndex((item) => item.id === stage) : -1;
  const awaitingTimeframe = stage === "timeframe_required";
  return (
    <section aria-live="polite" className="w-full max-w-xl rounded-2xl border border-[var(--color-ascend-gold)]/40 bg-[var(--color-bg-surface)]/95 p-4 shadow-[0_0_24px_rgba(229,184,105,0.12)]">
      <h2 className="text-sm font-black text-[var(--color-ascend-gold)]">ASCEND is building your world</h2>
      <ol className="mt-3 grid gap-2">
        {CAMPAIGN_STAGE_LABELS.map((item, index) => {
          const complete = activeIndex >= 0 && index < activeIndex;
          const failed = Boolean(error) && index === activeIndex;
          const current = !error && !awaitingTimeframe && index === activeIndex && item.id !== "campaign_ready";
          const ready = item.id === "campaign_ready" && stage === "campaign_ready";
          return (
            <li key={item.id} className={`flex items-center gap-2 text-xs ${failed ? "text-[var(--color-ascend-coral)]" : complete || ready ? "text-emerald-300" : current ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"}`}>
              <span aria-hidden="true" className="w-4 text-center font-black">{failed ? "×" : complete || ready ? "✓" : current ? "◉" : "○"}</span>
              <span>{item.label}</span>
              {awaitingTimeframe && index === activeIndex && <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--color-ascend-gold)]">Your input</span>}
              {current && <span className="ml-auto text-[10px] uppercase tracking-wider text-[var(--color-ascend-gold)]">In progress</span>}
            </li>
          );
        })}
      </ol>
      {error && <p role="alert" className="mt-3 text-xs font-semibold text-[var(--color-ascend-coral)]">{error}</p>}
    </section>
  );
}
