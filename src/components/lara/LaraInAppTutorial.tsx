"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { LARA_ASSETS } from "@/lib/constants";
import { useGame } from "@/store/gameContext";
import { usePathname, useRouter } from "next/navigation";

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
  const router = useRouter();
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

  const handleSkipTutorial = async () => {
    await completeTutorial();
    if (onComplete) onComplete();
    router.push("/world");
  };

  const handleNextBtn = async () => {
    if (stepIndex < total - 1) {
      const nextStepIndex = stepIndex + 1;
      const nextStep = TUTORIAL_STEPS[nextStepIndex];
      setStepIndex(nextStepIndex);

      // Contextual routing when stepping between sections
      if (nextStep.id === 2 || nextStep.id === 3 || nextStep.id === 5) {
        if (pathname !== "/world") router.push("/world");
      } else if (nextStep.id === 9) {
        if (pathname !== "/rewards") router.push("/rewards");
      } else if (nextStep.id === 10) {
        if (pathname !== "/profile") router.push("/profile");
      } else if (nextStep.id === 11) {
        if (pathname !== "/settings") router.push("/settings");
      }
    } else {
      const saved = await completeTutorial();
      if (!saved) return;
      if (onComplete) onComplete();
      router.push("/world");
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

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">

      {/* ── Spotlight ring (all screen sizes) ───────────────────────────────── */}
      {targetRect && step.targetAttr !== "path-map" && step.targetAttr !== "shell" && (
        <div
          className="fixed z-40 rounded-2xl border-2 border-[var(--color-ascend-gold)] shadow-[0_0_30px_rgba(229,184,105,0.9)] animate-pulse pointer-events-none"
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
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="sm:hidden fixed bottom-[72px] left-2 right-2 z-50 pointer-events-auto">
        <div className="rounded-2xl border-2 border-[var(--color-ascend-coral)]/90 bg-[var(--color-bg-surface)]/98 shadow-[0_12px_40px_rgba(0,0,0,0.85)] backdrop-blur-xl overflow-hidden">

          {/* Main row: Lara panel + content */}
          <div className="flex items-stretch">

            {/* Lara image — tall left column with coral gradient bg */}
            <div className="relative w-[76px] shrink-0 bg-gradient-to-b from-[var(--color-ascend-coral)]/25 via-[var(--color-ascend-coral)]/10 to-transparent">
              <Image
                src={step.pose}
                alt="Lara Guide"
                fill
                className="object-contain object-bottom drop-shadow-[0_4px_14px_rgba(217,83,79,0.6)]"
                priority
              />
              {/* Vertical progress line on Lara's edge */}
              <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--color-bg-elevated)]">
                <div
                  className="w-full bg-[var(--color-ascend-coral)] transition-all duration-500"
                  style={{ height: `${(step.id / total) * 100}%` }}
                />
              </div>
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0 p-3 flex flex-col justify-between gap-2">

              {/* Badge + Title + Skip row */}
              <div className="flex items-center justify-between gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-[var(--color-ascend-coral)] text-white text-[9px] font-black uppercase tracking-wider shrink-0">
                    LARA
                  </span>
                  <span className="text-[12px] font-extrabold text-[var(--color-ascend-gold)] truncate">
                    {step.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSkipTutorial}
                  className="text-[9.5px] font-bold text-[var(--color-text-muted)] hover:text-white transition-colors underline decoration-dotted shrink-0"
                >
                  Skip ✕
                </button>
              </div>

              {/* Dialogue */}
              <p className="text-[11.5px] text-[var(--color-text-primary)] font-medium leading-snug line-clamp-2">
                &ldquo;{step.dialogue}&rdquo;
              </p>

              {/* Footer: step counter + action */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[9px] font-bold text-[var(--color-text-muted)] tracking-widest shrink-0">
                  STEP {step.id}/{total}
                </span>

                <div className="flex items-center gap-1.5">
                  {step.actionRequired === "click" && (
                    <span className="text-[9px] text-[var(--color-ascend-gold)] font-bold animate-pulse text-right">
                      ✦ Tap element or
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={handleNextBtn}
                    className="px-3.5 py-1.5 rounded-xl font-black bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-[11px] uppercase tracking-wider transition-all active:scale-95 shadow-md shrink-0 cursor-pointer"
                  >
                    {nextLabel}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Goal input — step 4 on mobile */}
          {step.targetAttr === "goal-input" && !activeGoal && (
            <form
              onSubmit={handleGoalFormSubmit}
              className="flex gap-2 px-3 pb-3 border-t border-[var(--color-border-subtle)] pt-2 bg-[var(--color-bg-base)]/50"
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
                className="px-4 py-2 rounded-xl font-extrabold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-[11px] shrink-0 disabled:opacity-60 transition-all active:scale-95 cursor-pointer"
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
          Full card near target element (or centered at bottom).
      ══════════════════════════════════════════════════════════════════════ */}
      <div
        className="hidden sm:block fixed z-50 pointer-events-auto transition-all duration-200 w-[430px]"
        style={desktopStyle}
      >
        <div className="bg-[var(--color-bg-surface)]/98 border-2 border-[var(--color-ascend-coral)]/90 rounded-3xl p-5 shadow-[0_16px_50px_rgba(0,0,0,0.85)] flex flex-col gap-3 backdrop-blur-xl">

          {/* Character header */}
          <div className="flex items-start gap-3">
            <div className="relative w-28 h-36 shrink-0 drop-shadow-[0_8px_20px_rgba(217,83,79,0.5)]">
              <Image
                src={step.pose}
                alt="Lara Guide"
                fill
                className="object-contain"
                priority
              />
            </div>

            <div className="flex-1 flex flex-col gap-1.5 pt-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[var(--color-ascend-coral)] text-white text-[10px] font-black uppercase tracking-wider">
                    LARA
                  </span>
                  <span className="text-sm font-extrabold text-[var(--color-ascend-gold)]">
                    {step.title}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSkipTutorial}
                  className="text-[10px] font-bold text-[var(--color-text-muted)] hover:text-white transition-colors underline decoration-dotted"
                  title="Skip tutorial and enter ASCEND directly"
                >
                  Skip ✕
                </button>
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
                className="w-full py-2.5 rounded-xl font-extrabold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-xs uppercase tracking-wider shadow cursor-pointer"
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

            <div className="flex items-center gap-2">
              {step.actionRequired === "click" && (
                <span className="text-[10px] text-[var(--color-ascend-gold)] font-bold animate-pulse">
                  ✦ Click element or
                </span>
              )}
              <button
                type="button"
                onClick={handleNextBtn}
                className="px-5 py-2 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-xs uppercase tracking-wider transition-all shadow transform hover:scale-[1.02] cursor-pointer"
              >
                {nextLabel}
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
