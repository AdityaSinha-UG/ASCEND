"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/store/gameContext";
import { AscendLogo } from "@/components/ui/AscendLogo";

export default function RootPage() {
  const router = useRouter();
  const { player, authUserId, hasSelectedAvatar, activeGoal, goals, isLoaded, dataError } = useGame();

  useEffect(() => {
    if (!isLoaded || dataError) return;
    if (!authUserId) {
      router.replace("/auth");
    } else if (!hasSelectedAvatar) {
      router.replace("/onboarding");
    } else if (player.tutorialCompleted && (activeGoal || goals.length > 0)) {
      router.replace("/home");
    } else {
      router.replace("/world");
    }
  }, [player.tutorialCompleted, hasSelectedAvatar, authUserId, activeGoal, goals.length, isLoaded, dataError, router]);

  if (dataError) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 p-6 text-center text-sm text-[var(--color-ascend-coral)]">
        <AscendLogo size={64} priority />
        <span>ASCEND could not load your account data: {dataError}</span>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[var(--color-bg-base)] text-[var(--color-text-muted)] text-xs font-extrabold uppercase tracking-widest animate-fadeIn">
      <AscendLogo size={72} priority />
      <span>Entering ASCEND World...</span>
    </div>
  );
}
