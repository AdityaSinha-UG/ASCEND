"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/store/gameContext";

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
      <div className="min-h-dvh flex items-center justify-center p-6 text-center text-sm text-[var(--color-ascend-coral)]">
        ASCEND could not load your account data: {dataError}
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center bg-[var(--color-bg-base)] text-[var(--color-text-muted)] text-xs font-extrabold uppercase tracking-widest">
      Entering ASCEND World...
    </div>
  );
}
