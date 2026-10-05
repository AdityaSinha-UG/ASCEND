"use client";

import React, { useState } from "react";
import type { Quest } from "@/lib/types";
import { useGame } from "@/store/gameContext";
import { ContextualHelpBox } from "@/components/help/ContextualHelpBox";

interface QuestDetailDrawerProps {
  quest: Quest | null;
  onClose: () => void;
}

export function QuestDetailDrawer({ quest, onClose }: QuestDetailDrawerProps) {
  const { quests, startQuest, completeQuest } = useGame();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  // Find live quest data directly from game context so status changes reflect immediately
  const currentQuest = (quest ? quests.find((q) => q.id === quest.id) : null) || quest;

  if (!currentQuest) return null;

  const isCompleted = currentQuest.status === "completed";
  const isInProgress = currentQuest.status === "in_progress";
  const isAvailable = currentQuest.status === "available";
  const isLocked = currentQuest.status === "locked";

  const handleStart = async () => {
    setActionError(null);
    setIsWorking(true);
    try { await startQuest(currentQuest.id); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Could not start this Quest."); }
    finally { setIsWorking(false); }
  };

  const handleComplete = async () => {
    setActionError(null);
    setIsWorking(true);
    try { await completeQuest(currentQuest.id); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Could not complete this Quest."); }
    finally { setIsWorking(false); }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      {/* Slide-over Drawer Panel */}
      <div
        className="w-full max-w-md h-full bg-[var(--color-bg-surface)] border-l border-[var(--color-border-default)] p-6 shadow-2xl flex flex-col justify-between gap-6 relative overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header & Close Button */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[10px] font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider">
              ✦ {currentQuest.type.toUpperCase()} QUEST
            </span>
            <button
              onClick={onClose}
              className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1"
            >
              ✕ CLOSE
            </button>
          </div>

          {/* Title & Progress Bar */}
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-black text-[var(--color-text-primary)]">
              {currentQuest.title}
            </h2>
            <div className="flex justify-between text-xs font-bold text-[var(--color-text-secondary)]">
              <span>Progress</span>
              <span className="text-[var(--color-ascend-gold)]">
                {currentQuest.progress}% Complete
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
              <div
                className="h-full bg-[var(--color-ascend-coral)] rounded-full transition-all duration-300"
                style={{ width: `${currentQuest.progress}%` }}
              />
            </div>
          </div>

          {/* Objective Description */}
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed pt-2">
            {currentQuest.objective}
          </p>

          {/* Stats Grid Box */}
          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">DIFFICULTY</span>
              <span className="text-xs font-extrabold text-[var(--color-ascend-gold)] capitalize">
                {currentQuest.difficulty}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">XP REWARD</span>
              <span className="text-xs font-extrabold text-[var(--color-ascend-purple-light)]">
                +{currentQuest.xpReward} XP
              </span>
            </div>
            <div className="flex flex-col gap-0.5 col-span-2">
              <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">PREREQUISITES</span>
              <span className="text-xs font-extrabold text-[var(--color-text-secondary)]">
                {currentQuest.prerequisites.length > 0 ? "1 Required" : "None"}
              </span>
            </div>
          </div>

          {/* Lara's Hint Box */}
          <div className="p-4 rounded-2xl bg-[var(--color-ascend-coral)]/10 border border-[var(--color-ascend-coral)]/30 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-ascend-coral)] uppercase">
              <span>💡 LARA&apos;S HINT</span>
            </div>
            <p className="text-xs text-[var(--color-text-primary)] leading-relaxed italic">
              &ldquo;{currentQuest.hint}&rdquo;
            </p>
          </div>

          {/* Contextual AI Help Box */}
          <ContextualHelpBox questId={currentQuest.id} title={currentQuest.title} />
        </div>

        {/* Bottom Action Buttons */}
        <div className="flex flex-col gap-2.5 pt-4 border-t border-[var(--color-border-subtle)]">
          {actionError && <p role="alert" className="text-xs text-red-300">{actionError}</p>}
          {isAvailable && (
            <button
              onClick={handleStart}
              disabled={isWorking}
              className="w-full py-3.5 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] active:scale-95 text-white text-xs uppercase tracking-wider transition-all shadow"
            >
              {isWorking ? "Starting…" : "Start Quest"}
            </button>
          )}

          {isInProgress && (
            <>
              <button
                onClick={onClose}
                className="w-full py-3.5 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] active:scale-95 text-white text-xs uppercase tracking-wider transition-all shadow"
              >
                Continue Quest
              </button>
              <button
                onClick={handleComplete}
                disabled={isWorking}
                className="w-full py-3 rounded-xl font-bold bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] hover:border-[var(--color-ascend-gold)] active:scale-95 text-xs text-[var(--color-text-primary)] uppercase tracking-wider transition-all"
              >
                {isWorking ? "Saving…" : "Mark as Complete"}
              </button>
            </>
          )}

          {isCompleted && (
            <button
              disabled
              className="w-full py-3.5 rounded-xl font-bold bg-green-950/40 border border-green-500/40 text-green-400 text-xs uppercase tracking-wider cursor-default flex items-center justify-center gap-1.5"
            >
              <span>✓</span> Quest Completed
            </button>
          )}

          {isLocked && (
            <button
              disabled
              className="w-full py-3.5 rounded-xl font-bold bg-gray-900 text-gray-500 border border-gray-800 text-xs uppercase tracking-wider cursor-not-allowed"
            >
              🔒 Locked — Complete Prerequisites
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
