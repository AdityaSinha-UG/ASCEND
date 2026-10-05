"use client";

import React, { useState, useEffect } from "react";
import type { Path } from "@/lib/types";
import { useGame } from "@/store/gameContext";
import { SystemIcon } from "@/components/ui/AscendIcon";
import { ContextualHelpBox } from "@/components/help/ContextualHelpBox";

interface PathDetailDrawerProps {
  path: Path | null;
  onClose: () => void;
}

export function PathDetailDrawer({ path, onClose }: PathDetailDrawerProps) {
  const { quests, startQuest, completeQuest, editPath } = useGame();
  const [actionError, setActionError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);

  // Find live path data directly from game context so status changes reflect immediately
  const currentPath = (path ? quests.find((q) => q.id === path.id) : null) || path;

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTitle, setEditTitle] = useState<string>(currentPath?.title || "");
  const [editObjective, setEditObjective] = useState<string>(currentPath?.objective || "");
  const [editHint, setEditHint] = useState<string>(currentPath?.hint || "");

  useEffect(() => {
    if (!isEditing) {
      setEditTitle(currentPath?.title || "");
      setEditObjective(currentPath?.objective || "");
      setEditHint(currentPath?.hint || "");
    }
  }, [currentPath?.id, currentPath?.title, currentPath?.objective, currentPath?.hint, isEditing]);

  if (!currentPath) return null;

  const isCompleted = currentPath.status === "completed";
  const isInProgress = currentPath.status === "in_progress";
  const isAvailable = currentPath.status === "available";
  const isLocked = currentPath.status === "locked";

  const handleStart = async () => {
    setActionError(null);
    setIsWorking(true);
    try { await startQuest(currentPath.id); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Could not start this Path."); }
    finally { setIsWorking(false); }
  };

  const handleComplete = async () => {
    setActionError(null);
    setIsWorking(true);
    try { await completeQuest(currentPath.id); }
    catch (error) { setActionError(error instanceof Error ? error.message : "Could not complete this Path."); }
    finally { setIsWorking(false); }
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    editPath(currentPath.id, {
      title: editTitle.trim(),
      objective: editObjective.trim(),
      hint: editHint.trim(),
    });
    setIsEditing(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm animate-fadeIn"
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
            <div className="flex items-center gap-2">
              <SystemIcon name="location" size={16} />
              <span className="px-2.5 py-1 rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[10px] font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider">
                PATH DETAILS
              </span>
            </div>
            <button
              onClick={onClose}
              className="text-xs font-bold text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] p-1"
            >
              ✕ CLOSE
            </button>
          </div>

          {!isEditing ? (
            <>
              {/* Title & Progress Bar */}
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-2xl font-black text-[var(--color-text-primary)] leading-tight">
                    {currentPath.title}
                  </h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-[10px] font-bold px-2 py-1 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-white"
                  >
                    ✏️ Edit
                  </button>
                </div>

                <div className="flex justify-between text-xs font-bold text-[var(--color-text-secondary)]">
                  <span>Status</span>
                  <span className="text-[var(--color-ascend-gold)] uppercase">
                    {isCompleted ? "✓ Completed" : isInProgress ? "⏳ In Progress" : isAvailable ? "⚡ Available" : "🔒 Locked"}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-ascend-coral)] rounded-full transition-all duration-300"
                    style={{ width: `${currentPath.progress}%` }}
                  />
                </div>
              </div>

              {/* Objective Description */}
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">OBJECTIVE</span>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {currentPath.objective}
                </p>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">DIFFICULTY</span>
                  <span className="text-xs font-extrabold text-[var(--color-ascend-gold)] capitalize">
                    {currentPath.difficulty}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">XP REWARD</span>
                  <div className="flex items-center gap-1">
                    <SystemIcon name="xp" size={14} />
                    <span className="text-xs font-extrabold text-[var(--color-ascend-gold)]">
                      +{currentPath.xpReward} XP
                    </span>
                  </div>
                </div>
              </div>

              {/* Lara's Hint Box */}
              <div className="p-4 rounded-2xl bg-[var(--color-ascend-coral)]/10 border border-[var(--color-ascend-coral)]/30 flex flex-col gap-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--color-ascend-coral)] uppercase">
                  <span>💡 LARA&apos;S PATH HINT</span>
                </div>
                <p className="text-xs text-[var(--color-text-primary)] leading-relaxed italic">
                  &ldquo;{currentPath.hint}&rdquo;
                </p>
              </div>

              {/* Contextual AI Help Box */}
              <ContextualHelpBox pathId={currentPath.id} title={currentPath.title} />
            </>
          ) : (
            /* Edit Form */
            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3 pt-2">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">PATH TITLE</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-white focus:outline-none focus:border-[var(--color-ascend-gold)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">OBJECTIVE</label>
                <textarea
                  value={editObjective}
                  onChange={(e) => setEditObjective(e.target.value)}
                  rows={3}
                  className="px-3 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-white focus:outline-none focus:border-[var(--color-ascend-gold)] resize-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-[var(--color-text-secondary)]">LARA&apos;S HINT</label>
                <input
                  type="text"
                  value={editHint}
                  onChange={(e) => setEditHint(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-white focus:outline-none focus:border-[var(--color-ascend-gold)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[var(--color-ascend-coral)] text-white text-xs font-bold uppercase"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] text-xs font-bold"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom Action Buttons */}
        {!isEditing && (
        <div className="flex flex-col gap-2.5 pt-4 border-t border-[var(--color-border-subtle)]">
          {actionError && <p role="alert" className="text-xs text-red-300">{actionError}</p>}
            {isAvailable && (
              <button
              onClick={handleStart}
              disabled={isWorking}
                className="w-full py-3.5 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] active:scale-95 text-white text-xs uppercase tracking-wider transition-all shadow"
              >
              {isWorking ? "Starting…" : "Start Path"}
              </button>
            )}

            {isInProgress && (
              <>
                <button
                  onClick={onClose}
                  className="w-full py-3.5 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] active:scale-95 text-white text-xs uppercase tracking-wider transition-all shadow"
                >
                  Continue Path
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
                <span>✓</span> Path Completed
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
        )}
      </div>
    </div>
  );
}
