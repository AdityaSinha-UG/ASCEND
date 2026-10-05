"use client";

import React, { useState, useMemo } from "react";
import type { Goal, Quest } from "@/lib/types";

interface CampaignMapCanvasProps {
  goal: Goal;
  quests: Quest[];
  onSelectGoal?: (goal: Goal) => void;
  onSelectQuest: (quest: Quest) => void;
  goalTutorialTarget?: string;
}

interface PathGroup {
  path: Quest;
  quests: Quest[];
  phaseIndex: number;
}

function getStatusBadge(status: Quest["status"]) {
  switch (status) {
    case "completed":
      return { label: "COMPLETED", bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/40" };
    case "in_progress":
      return { label: "IN PROGRESS", bg: "bg-[var(--color-ascend-coral)]/20", text: "text-[var(--color-ascend-coral)]", border: "border-[var(--color-ascend-coral)]/40" };
    case "available":
      return { label: "AVAILABLE", bg: "bg-[var(--color-ascend-gold)]/20", text: "text-[var(--color-ascend-gold)]", border: "border-[var(--color-ascend-gold)]/40" };
    default:
      return { label: "LOCKED", bg: "bg-[var(--color-bg-base)]", text: "text-[var(--color-text-muted)]", border: "border-[var(--color-border-subtle)]" };
  }
}

export function CampaignMapCanvas({
  goal,
  quests,
  onSelectQuest,
  goalTutorialTarget,
}: CampaignMapCanvasProps) {
  // Group root paths and their child quests
  const pathGroups = useMemo<PathGroup[]>(() => {
    const rootPaths = quests
      .filter((q) => q.pathId === q.id || (!q.pathId && !q.parentQuestId && q.type === "main"))
      .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

    return rootPaths.map((root, index) => {
      const childQuests = quests
        .filter((q) => q.pathId === root.id && q.id !== root.id)
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

      return {
        path: root,
        quests: childQuests,
        phaseIndex: index + 1,
      };
    });
  }, [quests]);

  const [selectedPhaseId, setSelectedPhaseId] = useState<string>("all");

  // Calculate campaign statistics
  const stats = useMemo(() => {
    const total = quests.length;
    const completed = quests.filter((q) => q.status === "completed").length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : (goal.progress ?? 0);
    return { total, completed, pct };
  }, [quests, goal.progress]);

  const activeGroup = pathGroups.find((g) => g.path.id === selectedPhaseId);

  return (
    <div className="w-full flex flex-col items-center gap-6 py-4 px-2 sm:px-4">
      {/* ── 1. GOAL SUMMIT CAPSTONE CARD ───────────────────────────────────────── */}
      <div
        data-tutorial-target={goalTutorialTarget}
        className="w-full max-w-3xl p-5 sm:p-6 rounded-3xl bg-[var(--color-bg-surface)]/95 border-2 border-[var(--color-ascend-gold)] shadow-[0_0_35px_rgba(229,184,105,0.22)] backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-5 relative overflow-hidden text-center sm:text-left"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[radial-gradient(circle_at_top_right,rgba(229,184,105,0.12)_0%,transparent_70%)] pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-14 h-14 rounded-2xl bg-[var(--color-bg-elevated)] border-2 border-[var(--color-ascend-gold)]/60 flex items-center justify-center text-2xl shadow-lg shrink-0">
            🎯
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--color-ascend-gold)]">
                SUMMIT DESTINATION
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[9px] font-bold text-[var(--color-text-muted)] uppercase">
                {goal.status}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {goal.title}
            </h2>
            {goal.description && (
              <p className="text-xs text-[var(--color-text-secondary)] line-clamp-1">
                {goal.description}
              </p>
            )}
          </div>
        </div>

        {/* Overall Progress Meter */}
        <div className="flex flex-col gap-1.5 w-full sm:w-48 shrink-0 z-10">
          <div className="flex justify-between text-xs font-bold text-[var(--color-text-secondary)]">
            <span>Overall Progress</span>
            <span className="text-[var(--color-ascend-gold)]">{stats.pct}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[var(--color-bg-base)] overflow-hidden border border-[var(--color-border-subtle)]">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-ascend-coral)] to-[var(--color-ascend-gold)] rounded-full transition-all duration-500"
              style={{ width: `${Math.max(stats.pct, 6)}%` }}
            />
          </div>
          <span className="text-[10px] text-[var(--color-text-muted)] font-semibold text-center sm:text-right">
            {stats.completed} of {stats.total} Milestones Done
          </span>
        </div>
      </div>

      {/* ── 2. PHASE / CHAPTER SELECTOR DOCK ───────────────────────────────────── */}
      {pathGroups.length > 0 && (
        <div className="w-full max-w-4xl flex items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-lg overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => setSelectedPhaseId("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer ${
              selectedPhaseId === "all"
                ? "bg-[var(--color-ascend-gold)] text-black shadow-[0_0_15px_rgba(229,184,105,0.4)]"
                : "text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-bg-elevated)]"
            }`}
          >
            ✦ All Phases
          </button>

          {pathGroups.map((group) => {
            const isSelected = selectedPhaseId === group.path.id;
            return (
              <button
                key={group.path.id}
                type="button"
                onClick={() => setSelectedPhaseId(group.path.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-[var(--color-ascend-coral)] text-white shadow-[0_0_15px_rgba(217,83,79,0.35)]"
                    : "text-[var(--color-text-secondary)] hover:text-white hover:bg-[var(--color-bg-elevated)] border border-transparent hover:border-[var(--color-border-subtle)]"
                }`}
              >
                <span className="text-[10px] font-black opacity-80">
                  Phase {group.phaseIndex}:
                </span>
                <span className="max-w-[140px] sm:max-w-[180px] truncate">
                  {group.path.title}
                </span>
                <span className={`w-2 h-2 rounded-full ${group.path.status === "completed" ? "bg-emerald-400" : group.path.status === "in_progress" ? "bg-[var(--color-ascend-coral)] animate-pulse" : "bg-gray-600"}`} />
              </button>
            );
          })}
        </div>
      )}

      {/* ── 3. SPACIOUS EXPEDITION TRAIL RENDERING ─────────────────────────────── */}
      <div className="w-full max-w-4xl flex flex-col gap-8 items-center pt-2">
        {/* VIEW MODE A: FOCUSED PHASE DEEP DIVE */}
        {selectedPhaseId !== "all" && activeGroup ? (
          <div className="w-full flex flex-col items-center gap-6 animate-fadeIn">
            {/* Phase Milestone Card */}
            <div
              onClick={() => onSelectQuest(activeGroup.path)}
              className="w-full max-w-2xl p-5 rounded-2xl bg-[var(--color-bg-surface)] border-2 border-[var(--color-ascend-coral)]/80 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer hover:scale-[1.01] transition-transform group"
            >
              <div className="flex flex-col gap-1 flex-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--color-ascend-coral)]/20 border border-[var(--color-ascend-coral)]/40 text-[9px] font-black uppercase text-[var(--color-ascend-coral)]">
                    PHASE {activeGroup.phaseIndex} MILESTONE
                  </span>
                  <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
                    {activeGroup.path.status}
                  </span>
                </div>
                <h3 className="text-lg font-black text-white group-hover:text-[var(--color-ascend-gold)] transition-colors">
                  {activeGroup.path.title}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {activeGroup.path.objective}
                </p>
              </div>

              <button
                type="button"
                className="px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] text-xs font-bold text-[var(--color-ascend-gold)] group-hover:border-[var(--color-ascend-gold)] shrink-0 self-end sm:self-auto"
              >
                Inspect Phase Details →
              </button>
            </div>

            {/* Connecting Ley-Line Connector */}
            <div className="w-0.5 h-8 bg-gradient-to-b from-[var(--color-ascend-coral)] to-[var(--color-ascend-gold)] opacity-60" />

            {/* Phase Sub-Quests Trail */}
            <div className="w-full max-w-2xl flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-black tracking-wider uppercase text-[var(--color-ascend-gold)]">
                  ✦ Quests in this Phase ({activeGroup.quests.length})
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] font-bold">
                  Click any quest to start or complete
                </span>
              </div>

              {activeGroup.quests.length === 0 ? (
                <div className="p-6 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-center text-xs text-[var(--color-text-muted)]">
                  No individual quests found for this phase. Click the milestone above to complete it.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {activeGroup.quests.map((quest, qIdx) => {
                    const badge = getStatusBadge(quest.status);
                    return (
                      <div
                        key={quest.id}
                        onClick={() => onSelectQuest(quest)}
                        className={`p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 cursor-pointer group ${
                          quest.status === "completed"
                            ? "border-emerald-500/50 bg-emerald-950/15 shadow-[0_0_20px_rgba(34,197,94,0.15)]"
                            : quest.status === "in_progress"
                            ? "border-[var(--color-ascend-coral)] bg-[var(--color-bg-surface)] shadow-[0_0_20px_rgba(217,83,79,0.2)] scale-[1.01]"
                            : quest.status === "available"
                            ? "border-[var(--color-ascend-gold)]/60 bg-[var(--color-bg-surface)] shadow-md hover:border-[var(--color-ascend-gold)]"
                            : "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/60 opacity-70 hover:opacity-90"
                        }`}
                      >
                        <div className="flex items-center gap-3.5 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex items-center justify-center text-sm font-black text-[var(--color-ascend-gold)] shrink-0">
                            {qIdx + 1}
                          </div>
                          <div className="flex flex-col gap-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-white group-hover:text-[var(--color-ascend-gold)] transition-colors truncate">
                                {quest.title}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${badge.bg} ${badge.text} border ${badge.border}`}>
                                {badge.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
                              {quest.objective}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] text-[var(--color-text-muted)] font-bold uppercase">Reward</span>
                            <span className="text-xs font-black text-[var(--color-ascend-gold)]">
                              +{quest.xpReward || 100} XP
                            </span>
                          </div>
                          <button
                            type="button"
                            className="px-3 py-1.5 rounded-xl bg-[var(--color-bg-elevated)] text-[10px] font-bold text-white group-hover:bg-[var(--color-ascend-coral)] transition-colors"
                          >
                            Open →
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* VIEW MODE B: FULL CAMPAIGN SPACIOUS TIMELINE */
          <div className="w-full flex flex-col gap-6 animate-fadeIn">
            {pathGroups.map((group) => {
              const completedQuests = group.quests.filter((q) => q.status === "completed").length;
              const totalQuests = group.quests.length;

              return (
                <div
                  key={group.path.id}
                  className="w-full p-5 sm:p-6 rounded-3xl bg-[var(--color-bg-surface)] border-2 border-[var(--color-border-default)] shadow-xl flex flex-col gap-4 relative overflow-hidden transition-all hover:border-[var(--color-ascend-gold)]/60"
                >
                  {/* Phase Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--color-border-subtle)] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-ascend-gold)]/40 flex items-center justify-center font-black text-sm text-[var(--color-ascend-gold)]">
                        {group.phaseIndex}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-ascend-gold)]">
                          PHASE {group.phaseIndex}
                        </span>
                        <h3 className="text-base sm:text-lg font-black text-white">
                          {group.path.title}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider ${getStatusBadge(group.path.status).bg} ${getStatusBadge(group.path.status).text} border ${getStatusBadge(group.path.status).border}`}>
                        {getStatusBadge(group.path.status).label}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPhaseId(group.path.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-ascend-gold)] transition-colors cursor-pointer"
                      >
                        Focus Phase →
                      </button>
                    </div>
                  </div>

                  {/* Objective */}
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                    {group.path.objective}
                  </p>

                  {/* Sub-Quests List */}
                  {group.quests.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {group.quests.map((quest) => (
                        <div
                          key={quest.id}
                          onClick={() => onSelectQuest(quest)}
                          className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-ascend-gold)]/50 transition-all flex items-center justify-between gap-3 cursor-pointer group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs font-bold text-[var(--color-ascend-gold)]">✦</span>
                            <span className="text-xs font-bold text-white group-hover:text-[var(--color-ascend-gold)] transition-colors truncate">
                              {quest.title}
                            </span>
                          </div>
                          <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                            quest.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : quest.status === "in_progress" ? "bg-[var(--color-ascend-coral)]/20 text-[var(--color-ascend-coral)]" : "bg-black/40 text-[var(--color-text-muted)]"
                          }`}>
                            {quest.status.replace("_", " ")}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress footer */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-[var(--color-text-muted)] pt-1">
                    <span>
                      {totalQuests > 0 ? `${completedQuests} of ${totalQuests} quests completed` : "Milestone path"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectQuest(group.path)}
                      className="text-[var(--color-ascend-coral)] hover:underline font-bold"
                    >
                      Inspect Details →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
