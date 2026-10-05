"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { LARA_ASSETS } from "@/lib/constants";
import { useGame } from "@/store/gameContext";
import { usePathname } from "next/navigation";

export interface LaraInAppTutorialProps {
  onComplete?: () => void;
}

interface TutorialStep {
  id: number;
  title: string;
  pose: string;
  targetAttr: string;
  dialogue: string;
  actionRequired?: "click" | "submit_goal" | "none";
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "Welcome to ASCEND!",
    pose: LARA_ASSETS.main,
    targetAttr: "shell",
    dialogue: "Welcome to ASCEND, Player. I'm Lara, your system guide. Instead of explaining everything from a screen, I'll show you how ASCEND works by using it with you.",
    actionRequired: "none",
  },
  {
    id: 2,
    title: "Open World Map",
    pose: LARA_ASSETS.chibi.pointing,
    targetAttr: "world-navigation",
    dialogue: "Let's start with your World. Click the World button in navigation.",
    actionRequired: "click",
  },
  {
    id: 3,
    title: "This is your World",
    pose: LARA_ASSETS.chibi.greeting,
    targetAttr: "world-header",
    dialogue: "This is your World. Your goals become destinations here. Your quests and paths become the journey between where you are and where you want to go.",
    actionRequired: "none",
  },
  {
    id: 4,
    title: "Create Your Destination",
    pose: LARA_ASSETS.chibi.excited,
    targetAttr: "goal-input",
    dialogue: "Now let me help you set your first destination. Tell ASCEND what you want to achieve.",
    actionRequired: "submit_goal",
  },
  {
    id: 5,
    title: "Your Goal Appears",
    pose: LARA_ASSETS.chibi.pointing,
    targetAttr: "goal-node",
    dialogue: "There it is! This is your goal destination. ASCEND will turn it into a journey you can actually follow. Click your goal to open its Path Map.",
    actionRequired: "click",
  },
  {
    id: 6,
    title: "Goal Path Map",
    pose: LARA_ASSETS.chibi.serious,
    targetAttr: "path-map",
    dialogue: "This is your Path! ASCEND breaks your destination into meaningful steps so you can move forward one step at a time.",
    actionRequired: "none",
  },
  {
    id: 7,
    title: "Reshape Your Journey",
    pose: LARA_ASSETS.chibi.pointing,
    targetAttr: "path-map",
    dialogue: "Each Path represents part of your journey. You can follow the path ASCEND creates, or add, edit, and reorder Paths whenever your plans change.",
    actionRequired: "none",
  },
  {
    id: 8,
    title: "XP Progression",
    pose: LARA_ASSETS.chibi.pointing,
    targetAttr: "xp-hud",
    dialogue: "Every completed quest or path gives you XP. Earn enough XP and you level up along your journey.",
    actionRequired: "none",
  },
  {
    id: 9,
    title: "Rewards Section",
    pose: LARA_ASSETS.chibi.pointing,
    targetAttr: "rewards-navigation",
    dialogue: "Your progress also unlocks rewards, titles, and achievements. Click Rewards to take a look.",
    actionRequired: "click",
  },
  {
    id: 10,
    title: "Player Identity & Profile",
    pose: LARA_ASSETS.chibi.pointing,
    targetAttr: "profile-navigation",
    dialogue: "Your progress becomes part of your identity. Click Profile to view your level, titles, and stats.",
    actionRequired: "click",
  },
  {
    id: 11,
    title: "System Settings",
    pose: LARA_ASSETS.chibi.pointing,
    targetAttr: "settings-navigation",
    dialogue: "Settings is where you can customize your ASCEND experience or manage data. Click Settings.",
    actionRequired: "click",
  },
  {
    id: 12,
    title: "Ascent Begun!",
    pose: LARA_ASSETS.chibi.bowing,
    targetAttr: "shell",
    dialogue: "That's everything you need to know for now. Your destination is yours to choose. Your path is yours to shape. Now, Player... let's begin your ascent.",
    actionRequired: "none",
  },
];

export function LaraInAppTutorial({ onComplete }: LaraInAppTutorialProps) {
  const pathname = usePathname();
  const { activeGoal, completeTutorial, submitGoal } = useGame();

  const [stepIndex, setStepIndex] = useState<number>(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const [goalText, setGoalText] = useState<string>("");
  const [goalError, setGoalError] = useState<string>("");
  const [isSavingGoal, setIsSavingGoal] = useState<boolean>(false);

  const step = TUTORIAL_STEPS[stepIndex];
  const total = TUTORIAL_STEPS.length;

  // Dynamic Anchor Rect Lookup
  useEffect(() => {
    setTargetRect(null);
    if (step.targetAttr === "shell") return;

    const updateRect = () => {
      const el = document.querySelector(`[data-tutorial-target="${step.targetAttr}"]`);
      setTargetRect(el ? el.getBoundingClientRect() : null);
    };

    updateRect();
    const interval = setInterval(updateRect, 300);
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [step.targetAttr, pathname, stepIndex]);

  // Handle Target Click
  useEffect(() => {
    if (step.actionRequired !== "click" || step.targetAttr === "shell") return;
    const el = document.querySelector(`[data-tutorial-target="${step.targetAttr}"]`);
    if (!el) return;
    const handleTargetClick = () => {
      setTimeout(() => setStepIndex((prev) => Math.min(prev + 1, total - 1)), 150);
    };
    el.addEventListener("click", handleTargetClick);
    return () => el.removeEventListener("click", handleTargetClick);
  }, [step.targetAttr, step.actionRequired, stepIndex, total]);

  const handleNextBtn = async () => {
    if (stepIndex < total - 1) {
      setStepIndex((prev) => prev + 1);
    } else {
      const saved = await completeTutorial();
      if (!saved) return;
      if (onComplete) onComplete();
    }
  };

  const handleGoalFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalText.trim()) return;
    setGoalError("");
    setIsSavingGoal(true);
    try {
      await submitGoal(goalText.trim());
      setGoalText("");
      setStepIndex(4);
    } catch (error) {
      setGoalError(error instanceof Error ? error.message : "Could not save your goal. Please try again.");
    } finally {
      setIsSavingGoal(false);
    }
  };

  // Desktop card position (near target or center-bottom)
  const desktopStyle =
    targetRect && step.targetAttr !== "path-map"
      ? {
          left: `${Math.max(16, Math.min(targetRect.left - 80, window.innerWidth - 440))}px`,
          top: `${targetRect.top > 320 ? targetRect.top - 220 : targetRect.bottom + 16}px`,
        }
      : {
          left: "50%",
          bottom: "88px",
          transform: "translateX(-50%)",
        };

  // Labels
  const nextLabel =
    step.id === 1 ? "Let's Begin →" : step.id === total ? "Begin Ascent 🚀" : "Next →";

  const isActionable =
    step.actionRequired === "none" || step.id === 1 || step.id === total;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">

      {/* ── Spotlight ring (all screen sizes) ───────────────────────────────── */}
      {targetRect && step.targetAttr !== "path-map" && step.targetAttr !== "shell" && (
        <div
          className="fixed z-40 rounded-2xl border-2 border-[var(--color-ascend-gold)] shadow-[0_0_25px_rgba(229,184,105,0.8)] animate-pulse pointer-events-none"
          style={{
            left: `${targetRect.left - 6}px`,
            top: `${targetRect.top - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
          }}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MOBILE LAYOUT  (hidden on sm+)
          Compact horizontal strip pinned above the bottom nav.
          Lara sits as a tall image panel on the left; content on the right.
          Never repositions relative to target elements — spotlight handles that.
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sm:hidden fixed bottom-[72px] left-2 right-2 z-50 pointer-events-auto">
        <div className="rounded-2xl border-2 border-[var(--color-ascend-coral)]/80 bg-[var(--color-bg-surface)]/97 shadow-2xl backdrop-blur-md overflow-hidden">

          {/* Main row: Lara panel + content */}
          <div className="flex items-stretch">

            {/* Lara image — tall left column with coral gradient bg */}
            <div className="relative w-[72px] shrink-0 bg-gradient-to-b from-[var(--color-ascend-coral)]/20 via-[var(--color-ascend-coral)]/8 to-transparent">
              <Image
                src={step.pose}
                alt="Lara Guide"
                fill
                className="object-contain object-bottom drop-shadow-[0_4px_12px_rgba(217,83,79,0.5)]"
                priority
              />
              {/* Subtle progress bar on Lara's left edge */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-bg-elevated)]">
                <div
                  className="w-full bg-[var(--color-ascend-coral)] transition-all duration-500"
                  style={{ height: `${(step.id / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-2">

              {/* Badge + Title row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-[var(--color-ascend-coral)] text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                  LARA
                </span>
                <span className="text-[12px] font-extrabold text-[var(--color-ascend-gold)] truncate">
                  {step.title}
                </span>
              </div>

              {/* Dialogue — 2 line cap on mobile */}
              <p className="text-[11.5px] text-[var(--color-text-primary)] font-medium leading-snug line-clamp-2">
                &ldquo;{step.dialogue}&rdquo;
              </p>

              {/* Footer: step counter + action */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold text-[var(--color-text-muted)] tracking-widest shrink-0">
                  {step.id}/{total}
                </span>

                {isActionable ? (
                  <button
                    type="button"
                    onClick={handleNextBtn}
                    className="px-4 py-2 rounded-xl font-black bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-[11px] uppercase tracking-wider transition-all active:scale-95 shadow-md shrink-0"
                  >
                    {nextLabel}
                  </button>
                ) : (
                  <span className="text-[9.5px] text-[var(--color-ascend-gold)] font-bold animate-pulse text-right leading-tight">
                    ✦ Tap the highlighted element
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Goal input — only for step 4 on mobile */}
          {step.targetAttr === "goal-input" && !activeGoal && (
            <form
              onSubmit={handleGoalFormSubmit}
              className="flex gap-2 px-3 pb-3 border-t border-[var(--color-border-subtle)] pt-2"
            >
              <input
                type="text"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                placeholder="Type your goal here..."
                className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] placeholder:text-[var(--color-text-muted)]"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSavingGoal}
                className="px-4 py-2 rounded-xl font-extrabold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-[11px] shrink-0 disabled:opacity-60 transition-all active:scale-95"
              >
                {isSavingGoal ? "..." : "🚀 Go"}
              </button>
              {goalError && (
                <span className="absolute bottom-full mb-1 left-3 text-[10px] font-semibold text-[var(--color-ascend-coral)]">
                  {goalError}
                </span>
              )}
            </form>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DESKTOP LAYOUT  (hidden below sm)
          Full card near the target element (or centered at bottom).
          Lara is large and clearly visible on the left of the header.
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden sm:block fixed z-50 pointer-events-auto transition-all duration-200 w-[420px]"
        style={desktopStyle}
      >
        <div className="bg-[var(--color-bg-surface)]/95 border-2 border-[var(--color-ascend-coral)]/80 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 backdrop-blur-md">

          {/* Character header */}
          <div className="flex items-start gap-3">
            <div className="relative w-28 h-36 shrink-0 drop-shadow-[0_8px_16px_rgba(217,83,79,0.4)]">
              <Image
                src={step.pose}
                alt="Lara Guide"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="flex-1 flex flex-col gap-1.5 pt-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[var(--color-ascend-coral)] text-white text-[10px] font-black uppercase tracking-wider">
                  LARA
                </span>
                <span className="text-sm font-extrabold text-[var(--color-ascend-gold)]">
                  {step.title}
                </span>
              </div>
              <p className="text-sm text-[var(--color-text-primary)] font-medium leading-relaxed">
                &ldquo;{step.dialogue}&rdquo;
              </p>
            </div>
          </div>

          {/* Goal input — step 4 on desktop */}
          {step.targetAttr === "goal-input" && !activeGoal && (
            <form onSubmit={handleGoalFormSubmit} className="flex flex-col gap-2 pt-2 border-t border-[var(--color-border-subtle)]">
              <input
                type="text"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                placeholder="Describe a goal you want to work toward..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)]"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSavingGoal}
                className="w-full py-2.5 rounded-xl font-extrabold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-xs uppercase tracking-wider shadow"
              >
                {isSavingGoal ? "SAVING GOAL..." : "🚀 SAVE MY GOAL & BEGIN ASCENT"}
              </button>
              {goalError && (
                <span className="text-xs font-semibold text-[var(--color-ascend-coral)]">{goalError}</span>
              )}
            </form>
          )}

          {/* Progress footer */}
          <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border-subtle)]">
            {/* Step dots */}
            <div className="flex items-center gap-1">
              {TUTORIAL_STEPS.map((s) => (
                <div
                  key={s.id}
                  className={`rounded-full transition-all duration-300 ${
                    s.id === step.id
                      ? "w-4 h-2 bg-[var(--color-ascend-coral)]"
                      : s.id < step.id
                      ? "w-2 h-2 bg-[var(--color-ascend-coral)]/50"
                      : "w-2 h-2 bg-[var(--color-border-subtle)]"
                  }`}
                />
              ))}
            </div>

            {isActionable ? (
              <button
                type="button"
                onClick={handleNextBtn}
                className="px-5 py-2 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-xs uppercase tracking-wider transition-all shadow transform hover:scale-[1.02]"
              >
                {nextLabel}
              </button>
            ) : (
              <span className="text-[10px] text-[var(--color-ascend-gold)] font-bold animate-pulse">
                ✦ Click the highlighted feature
              </span>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
