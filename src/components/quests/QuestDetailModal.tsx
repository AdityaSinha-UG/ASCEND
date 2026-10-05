"use client";

import React from "react";
import type { Quest } from "@/lib/types";
import { DIFFICULTY_LABELS, DIFFICULTY_COLORS } from "@/lib/constants";
import { useGame } from "@/store/gameContext";

interface QuestDetailModalProps {
  quest: Quest | null;
  onClose: () => void;
}

export function QuestDetailModal({ quest, onClose }: QuestDetailModalProps) {
  const { startQuest, completeQuest, quests } = useGame();

  if (!quest) return null;

  const isLocked = quest.status === "locked";
  const isAvailable = quest.status === "available";
  const isInProgress = quest.status === "in_progress";
  const isCompleted = quest.status === "completed";

  // Find prerequisite titles for display
  const prereqQuests = quests.filter((q) => quest.prerequisites.includes(q.id));

  const handleStart = () => {
    startQuest(quest.id);
  };

  const handleComplete = () => {
    completeQuest(quest.id);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border-default)] rounded-2xl p-6 shadow-2xl flex flex-col gap-5 relative text-[var(--color-text-primary)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--color-text-muted)] hover:text-white text-xl font-bold p-1"
        >
          ✕
        </button>

        {/* Header Badges */}
        <div className="flex items-center gap-2 flex-wrap pt-1">
          {/* Type Badge */}
          <span className="px-2.5 py-1 rounded-md bg-[var(--color-ascend-purple)] text-white text-xs font-bold uppercase tracking-wider">
            {quest.type.toUpperCase()} QUEST
          </span>

          {/* Difficulty Badge */}
          <span
            className="px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider"
            style={{
              backgroundColor: `${DIFFICULTY_COLORS[quest.difficulty]}20`,
              color: DIFFICULTY_COLORS[quest.difficulty],
              border: `1px solid ${DIFFICULTY_COLORS[quest.difficulty]}50`,
            }}
          >
            {DIFFICULTY_LABELS[quest.difficulty]}
          </span>

          {/* Status Badge */}
          <span
            className={`ml-auto px-2.5 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider ${
              isCompleted
                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                : isInProgress
                ? "bg-blue-500/20 text-blue-400 border border-blue-500/40"
                : isAvailable
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                : "bg-gray-500/20 text-gray-400 border border-gray-500/40"
            }`}
          >
            {isCompleted
              ? "✓ COMPLETED"
              : isInProgress
              ? "⏳ IN PROGRESS"
              : isAvailable
              ? "⚡ AVAILABLE"
              : "🔒 LOCKED"}
          </span>
        </div>

        {/* Title & Objective */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xl font-extrabold text-[var(--color-ascend-gold)] leading-snug">
            {quest.title}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            {quest.objective}
          </p>
        </div>

        {/* Rewards Card */}
        <div className="flex items-center justify-center p-3.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <div className="flex flex-col">
              <span className="text-xs text-[var(--color-text-muted)] font-semibold">REWARD XP</span>
              <span className="text-base font-extrabold text-[var(--color-ascend-purple-light)]">
                +{quest.xpReward} XP
              </span>
            </div>
          </div>
        </div>

        {/* Actionable Hint Box */}
        <div className="p-3.5 rounded-xl bg-[var(--color-ascend-purple)]/10 border border-[var(--color-ascend-purple)]/30 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-ascend-gold)] uppercase tracking-wider">
            <span>💡 LARA&apos;S QUEST HINT</span>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-primary)] leading-relaxed italic">
            &ldquo;{quest.hint}&rdquo;
          </p>
        </div>

        {/* Prerequisites list if any */}
        {prereqQuests.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
              PREREQUISITES REQUIRED:
            </span>
            <div className="flex flex-col gap-1">
              {prereqQuests.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between text-xs px-3 py-1.5 rounded-lg bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]"
                >
                  <span className="font-semibold text-[var(--color-text-secondary)]">{p.title}</span>
                  <span className={p.status === "completed" ? "text-green-400 font-bold" : "text-amber-400"}>
                    {p.status === "completed" ? "✓ Done" : "⏳ Pending"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          {isLocked && (
            <button
              disabled
              className="w-full py-3 rounded-xl font-bold bg-gray-800 text-gray-500 cursor-not-allowed text-sm uppercase tracking-wider border border-gray-700"
            >
              🔒 LOCKED — COMPLETE PREREQUISITES
            </button>
          )}

          {isAvailable && (
            <button
              onClick={handleStart}
              className="w-full py-3 rounded-xl font-bold bg-[var(--color-ascend-blue)] text-white hover:opacity-90 transition-opacity text-sm uppercase tracking-wider shadow-lg"
            >
              ⚡ BEGIN QUEST
            </button>
          )}

          {isInProgress && (
            <button
              onClick={handleComplete}
              className="w-full py-3 rounded-xl font-bold bg-gradient-to-r from-[var(--color-ascend-purple)] to-[var(--color-ascend-gold)] text-white hover:opacity-95 transition-all text-sm uppercase tracking-wider shadow-xl transform hover:scale-[1.01]"
            >
              ✓ CLAIM REWARDS & COMPLETE QUEST
            </button>
          )}

          {isCompleted && (
            <button
              disabled
              className="w-full py-3 rounded-xl font-bold bg-green-950/60 border border-green-500/50 text-green-400 text-sm uppercase tracking-wider cursor-default"
            >
              ✓ QUEST COMPLETED
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
