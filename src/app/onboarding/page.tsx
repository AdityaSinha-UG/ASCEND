"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/store/gameContext";
import { AvatarSelector } from "@/components/player/AvatarSelector";
import { LaraInAppTutorial } from "@/components/lara/LaraInAppTutorial";
import { CampaignGenerationPanel } from "@/components/world/CampaignGenerationPanel";
import { generateCampaign, type CampaignStage } from "@/lib/utils/campaignGeneration";
import type { AvatarId } from "@/lib/types";

type OnboardingStage = "avatar" | "tutorial" | "goal";

export default function OnboardingPage() {
  const router = useRouter();
  const { player, authUserId, hasSelectedAvatar, activeGoal, setAvatar, submitGoal, refreshCampaignData, isLoaded, dataError } = useGame();

  const [stage, setStage] = useState<OnboardingStage>("avatar");
  const [selectedAvatarId, setSelectedAvatarId] = useState<AvatarId>(player.avatarId || "elephant");
  const [goalInput, setGoalInput] = useState<string>("");
  const [goalError, setGoalError] = useState<string>("");
  const [isSubmittingGoal, setIsSubmittingGoal] = useState<boolean>(false);
  const [pendingGoalId, setPendingGoalId] = useState<string | null>(null);
  const [campaignStage, setCampaignStage] = useState<CampaignStage | null>(null);
  const [timeframeRequired, setTimeframeRequired] = useState(false);
  const [timeframeInput, setTimeframeInput] = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!authUserId) {
      router.replace("/auth");
      return;
    }

    // A direct create-goal entry point takes precedence. Otherwise onboarding
    // follows the persisted profile: unset avatar, tutorial, or existing player.
    if (new URLSearchParams(window.location.search).get("stage") === "goal") {
      setStage("goal");
    } else if (!hasSelectedAvatar) {
      setStage("avatar");
    } else {
      router.replace("/world");
    }
  }, [authUserId, hasSelectedAvatar, isLoaded, player.tutorialCompleted, router]);

  useEffect(() => {
    setSelectedAvatarId(player.avatarId);
  }, [player.avatarId]);

  const handleAvatarConfirm = async () => {
    const saved = await setAvatar(selectedAvatarId);
    if (!saved) return;
    router.push("/world");
  };

  const handleTutorialComplete = () => {
    if (activeGoal) {
      router.push("/world");
    } else {
      setStage("goal");
    }
  };

  const handleGoalSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!goalInput.trim()) {
      setGoalError("Please enter your goal to create your campaign world.");
      return;
    }
    if (timeframeRequired && !timeframeInput.trim()) {
      setGoalError("Enter a timeframe such as 30 days, 3 months, or 1 year.");
      return;
    }
    setGoalError("");
    setIsSubmittingGoal(true);
    try {
      const goal = pendingGoalId
        ? { id: pendingGoalId }
        : await submitGoal(goalInput.trim());
      setPendingGoalId(goal.id);
      setCampaignStage(null);
      await generateCampaign(goal.id, setCampaignStage, timeframeRequired ? timeframeInput : undefined);
      setTimeframeRequired(false);
      await refreshCampaignData();
      router.push(`/world?goalId=${encodeURIComponent(goal.id)}`);
    } catch (error) {
      const stage = (error as { stage?: string } | null)?.stage;
      if (stage === "timeframe_required") {
        setTimeframeRequired(true);
        setGoalError("");
        return;
      }
      setGoalError(stage === "research"
        ? "Research could not be completed. Your Goal is saved; you can retry."
        : stage === "persistence"
          ? "Campaign could not be saved. Your Goal is safe; you can retry."
          : error instanceof Error ? error.message : "Campaign generation failed. Your Goal is saved; you can retry.");
    } finally {
      setIsSubmittingGoal(false);
    }
  };

  if (!isLoaded || !authUserId) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[var(--color-bg-base)] text-[var(--color-text-muted)] text-xs font-extrabold uppercase tracking-widest">
        Restoring ASCEND account...
      </main>
    );
  }

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-transparent text-[var(--color-text-primary)] p-4 relative overflow-hidden">
      {/* Background Glow Overlay */}
      <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-[var(--color-ascend-coral)]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-[var(--color-ascend-gold)]/10 blur-3xl pointer-events-none" />

      {dataError && (
        <div className="relative z-10 w-full max-w-xl mb-4 text-center text-xs font-semibold text-[var(--color-ascend-coral)]">
          {dataError}
        </div>
      )}

      {/* STAGE 1: AVATAR SELECTION (Screen 2 Blueprint) */}
      {stage === "avatar" && (
        <AvatarSelector
          selectedId={selectedAvatarId}
          onSelect={(id) => setSelectedAvatarId(id)}
          onConfirm={handleAvatarConfirm}
        />
      )}

      {/* STAGE 2: IN-APP LARA TUTORIAL (Screens 3, 4, 5 Blueprints) */}
      {stage === "tutorial" && (
        <LaraInAppTutorial onComplete={handleTutorialComplete} />
      )}

      {/* STAGE 3: REAL GOAL INPUT */}
      {stage === "goal" && (
        <div className="w-full max-w-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-3xl p-6 sm:p-10 shadow-2xl flex flex-col gap-6 animate-fadeIn relative z-10">
          <div className="text-center flex flex-col gap-2">
            <span className="text-xs font-black tracking-widest text-[var(--color-ascend-gold)] uppercase">
              ✦ STEP 3 OF 3: THE ORIGIN HORIZON
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              WHAT IS YOUR REAL-LIFE GOAL?
            </h1>
            <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed">
              Enter what you truly wish to accomplish. This goal will be saved to your ASCEND account and become the starting point for your journey.
            </p>
          </div>

          <form onSubmit={handleGoalSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <textarea
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                maxLength={300}
                placeholder="Describe a goal you want to work toward..."
                rows={4}
                className="w-full p-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] text-sm font-medium resize-none shadow-inner"
                autoFocus
              />
              {goalError && (
                <span className="text-xs text-[var(--color-ascend-coral)] font-semibold">
                  {goalError}
                </span>
              )}
            </div>

            {timeframeRequired && (
              <label className="flex flex-col gap-2 text-xs font-semibold text-[var(--color-text-secondary)]">
                How much time do you want to give yourself to achieve this goal?
                <input
                  value={timeframeInput}
                  onChange={(event) => setTimeframeInput(event.target.value)}
                  placeholder="For example: 30 days, 3 months, 1 year"
                  maxLength={80}
                  className="w-full p-3 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] text-sm"
                  autoFocus
                />
              </label>
            )}

            {pendingGoalId && campaignStage && (
              <CampaignGenerationPanel stage={campaignStage} error={goalError} />
            )}

            <button
              type="submit"
              disabled={isSubmittingGoal || (timeframeRequired && !timeframeInput.trim())}
              className="w-full py-4 rounded-xl text-sm font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white shadow-xl transition-all duration-200 uppercase tracking-wide transform hover:scale-[1.01]"
            >
              {isSubmittingGoal ? "PREPARING YOUR WORLD..." : timeframeRequired ? "CONFIRM TIMEFRAME & BUILD CAMPAIGN" : pendingGoalId ? "RETRY CAMPAIGN GENERATION" : "🚀 SAVE MY GOAL & BEGIN ASCENT"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
