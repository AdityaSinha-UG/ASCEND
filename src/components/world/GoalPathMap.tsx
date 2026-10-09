"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { Goal, Path } from "@/lib/types";
import { useGame } from "@/store/gameContext";
import { SystemIcon, AscendLogo } from "@/components/ui/AscendIcon";
import { generateCampaign, type CampaignStage } from "@/lib/utils/campaignGeneration";
import { CampaignGenerationPanel } from "@/components/world/CampaignGenerationPanel";
import { CampaignMapCanvas } from "@/components/world/CampaignMapCanvas";
import { ContextualHelpBox } from "@/components/help/ContextualHelpBox";

interface GoalPathMapProps {
  goal: Goal;
  paths: Path[];
  onBackToWorld: () => void;
  onSelectPath: (path: Path) => void;
}

export function GoalPathMap({ goal, paths, onBackToWorld, onSelectPath }: GoalPathMapProps) {
  const { refreshCampaignData, deleteGoal, completeGoal } = useGame();
  const [stage, setStage] = useState<CampaignStage | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [timeframeRequired, setTimeframeRequired] = useState(false);
  const [timeframeInput, setTimeframeInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showCompleteGoal, setShowCompleteGoal] = useState(false);
  const [completionStep, setCompletionStep] = useState<"paths" | "confirm">("paths");
  const [confirmedPathIds, setConfirmedPathIds] = useState<string[]>([]);
  const [completingGoal, setCompletingGoal] = useState(false);
  const [completionError, setCompletionError] = useState<string | null>(null);

  useEffect(() => {
    if (!showCompleteGoal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [showCompleteGoal]);

  const campaignExists = paths.some((path) => path.pathId === path.id);
  const rootPaths = paths.filter((path) => path.pathId === path.id);

  const handleGenerate = async () => {
    if (timeframeRequired && !timeframeInput.trim()) return;
    setGenerating(true);
    setGenerationError(null);
    setStage(null);
    try {
      await generateCampaign(goal.id, setStage, timeframeRequired ? timeframeInput : undefined);
      setTimeframeRequired(false);
      await refreshCampaignData();
    } catch (error) {
      const kind = (error as { stage?: string } | null)?.stage;
      if (kind === "timeframe_required") {
        setTimeframeRequired(true);
        setGenerationError(null);
        return;
      }
      setGenerationError(kind === "research"
        ? "Research could not be completed. Please try again."
        : kind === "persistence"
          ? "Campaign could not be saved. Please try again."
          : error instanceof Error ? error.message : "Campaign generation failed.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteGoal = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteGoal(goal.id);
      onBackToWorld();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "This Goal could not be deleted. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCompleteGoal = async () => {
    setCompletingGoal(true);
    setCompletionError(null);
    try {
      await completeGoal(goal.id, confirmedPathIds);
      setShowCompleteGoal(false);
    } catch (error) {
      setCompletionError(error instanceof Error ? error.message : "This Goal could not be completed. Please try again.");
    } finally {
      setCompletingGoal(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6 p-4 sm:p-6 animate-fadeIn">
      {/* ── Top Header Bar with Back and Delete Cross Button ──────────────────── */}
      <div className="w-full max-w-5xl flex items-center justify-between gap-4 bg-[var(--color-bg-surface)] p-4 rounded-2xl border border-[var(--color-border-default)] shadow-md">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBackToWorld}
            className="shrink-0 px-3 py-1.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-secondary)] hover:text-white transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>←</span> World Map
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <SystemIcon name="location" size={16} />
            <h1 className="text-sm sm:text-base font-black text-[var(--color-ascend-gold)] leading-tight truncate">
              {goal.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {goal.status === "completed" ? (
            <span className="px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-700/50 text-emerald-300 text-xs font-bold">Goal Completed</span>
          ) : (
            <button type="button" onClick={() => { setCompletionError(null); setCompletionStep("paths"); setShowCompleteGoal(true); }} className="px-3 py-1.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 hover:text-white text-xs font-bold transition-all">
              Complete Goal
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-800/50 text-red-300 hover:text-white text-xs font-bold transition-all active:scale-95 cursor-pointer"
            title="Delete this Goal"
            aria-label="Delete Goal"
          >
            <span className="text-sm leading-none font-bold">✕</span>
            <span className="hidden sm:inline">Delete Goal</span>
          </button>
        </div>
      </div>

      {generating && stage && <CampaignGenerationPanel stage={stage} />}
      {generationError && <CampaignGenerationPanel stage={stage} error={generationError} />}

      {!campaignExists ? (
        <section data-tutorial-target="path-map" className="w-full max-w-5xl min-h-[260px] rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-bg-base)]/60 flex items-center justify-center p-6">
          <div className="max-w-md text-center rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/90 p-6 shadow-xl flex flex-col items-center">
            <AscendLogo size={44} className="mb-1" />
            <h2 className="mt-2 text-sm font-black text-[var(--color-text-primary)]">No Paths generated yet</h2>
            <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">ASCEND will research this Goal and prepare its Paths and Quests for your World.</p>
            {timeframeRequired && (
              <label className="mt-4 flex flex-col gap-2 text-left text-xs font-semibold text-[var(--color-text-secondary)]">
                How much time do you want to give yourself to achieve this goal?
                <input value={timeframeInput} onChange={(event) => setTimeframeInput(event.target.value)} maxLength={80} placeholder="30 days, 3 months, 1 year" className="w-full p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] text-sm" />
              </label>
            )}
            <button type="button" disabled={generating || (timeframeRequired && !timeframeInput.trim())} onClick={handleGenerate} className="mt-4 px-5 py-2.5 rounded-xl bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] disabled:opacity-60 text-white text-xs font-bold tracking-wide shadow">
              {generating ? "PREPARING YOUR WORLD..." : timeframeRequired ? "CONFIRM TIMEFRAME & BUILD" : generationError ? "RETRY CAMPAIGN" : "GENERATE CAMPAIGN"}
            </button>
          </div>
        </section>
      ) : (
        <div className="w-full max-w-5xl flex flex-col gap-6">
          <section data-tutorial-target="path-map" className="w-full rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-bg-base)]/40 p-3 sm:p-6 shadow-xl">
            <CampaignMapCanvas goal={goal} quests={paths} onSelectQuest={onSelectPath} />
          </section>

          {/* Goal Contextual Help Box */}
          <ContextualHelpBox goalId={goal.id} title={goal.title} />
        </div>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg-surface)] border-2 border-red-600/70 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500/60 flex items-center justify-center mx-auto text-red-300 text-xl font-bold">
              ✕
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-black text-white">Delete Goal Realm?</h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Are you sure you want to delete <span className="text-white font-bold">&ldquo;{goal.title}&rdquo;</span>? This will permanently remove this Realm and all associated Paths and Quests from your World.
              </p>
            </div>

            {deleteError && <p role="alert" className="text-xs text-red-300">{deleteError}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteGoal}
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs uppercase tracking-wider transition-all"
              >
                {deleting ? "Deleting..." : "Yes, Delete Realm"}
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => { setShowDeleteConfirm(false); setDeleteError(null); }}
                className="flex-1 py-3 rounded-xl font-bold bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] text-white text-xs uppercase tracking-wider transition-all border border-[var(--color-border-subtle)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCompleteGoal && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={() => !completingGoal && setShowCompleteGoal(false)}>
          <div className="w-full max-w-lg bg-[var(--color-bg-surface)] border-2 border-emerald-700/60 rounded-3xl p-6 shadow-2xl flex flex-col gap-4" onClick={(event) => event.stopPropagation()}>
            <div>
              <h2 className="text-lg font-black text-white">Complete this real-world Goal?</h2>
              <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">Confirm only when you have achieved <span className="font-bold text-white">{goal.title}</span> outside ASCEND. This records the real-world outcome; it does not complete unfinished Quests.</p>
            </div>

            {completionStep === "paths" ? (
              <>
                <p className="text-xs font-bold text-[var(--color-ascend-gold)]">Which Paths have you completed?</p>
                {rootPaths.length ? (
                  <div className="max-h-56 overflow-y-auto flex flex-col gap-2">
                    {rootPaths.map((path) => (
                      <label key={path.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-white">
                        <input type="checkbox" checked={confirmedPathIds.includes(path.id)} onChange={(event) => setConfirmedPathIds((current) => event.target.checked ? [...current, path.id] : current.filter((id) => id !== path.id))} className="accent-[var(--color-ascend-gold)]" />
                        <span>{path.title}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="p-3 rounded-xl bg-[var(--color-bg-elevated)] text-xs text-[var(--color-text-secondary)]">No Paths are attached to this Goal. You can still confirm the real-world outcome.</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button type="button" disabled={rootPaths.length > 0 && confirmedPathIds.length === 0} onClick={() => { setCompletionError(null); setCompletionStep("confirm"); }} className="flex-1 py-2.5 rounded-xl bg-[var(--color-ascend-gold)] disabled:opacity-50 text-black text-xs font-black">Continue</button>
                  <button type="button" onClick={() => setShowCompleteGoal(false)} className="flex-1 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-white text-xs font-bold">Cancel</button>
                </div>
              </>
            ) : (
              <>
                <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/50 text-xs leading-relaxed text-emerald-100">
                  You are confirming that you achieved this Goal in real life. {confirmedPathIds.length} Path{confirmedPathIds.length === 1 ? "" : "s"} selected as completed. ASCEND will award +100 XP and +1 Focus, +1 Discipline, and +1 Consistency once. Unfinished Quests remain unchanged.
                </div>
                {completionError && <p role="alert" className="text-xs text-red-300">{completionError}</p>}
                <div className="flex gap-3 pt-1">
                  <button type="button" disabled={completingGoal} onClick={() => void handleCompleteGoal()} className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-xs font-black">{completingGoal ? "Completing..." : "Yes, I achieved this Goal"}</button>
                  <button type="button" disabled={completingGoal} onClick={() => { setCompletionError(null); setCompletionStep("paths"); }} className="flex-1 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-white text-xs font-bold">Back</button>
                </div>
              </>
            )}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
