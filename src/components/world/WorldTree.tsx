"use client";

import type { Goal, Quest } from "@/lib/types";
import { CampaignMapCanvas } from "@/components/world/CampaignMapCanvas";

interface WorldTreeProps {
  goal: Goal | null;
  quests: Quest[];
  onSelectQuest: (quest: Quest) => void;
}

/** Compatibility wrapper for the original WorldTree entry point. */
export function WorldTree({ goal, quests, onSelectQuest }: WorldTreeProps) {
  if (!goal) {
    return (
      <div className="flex min-h-56 flex-col items-center justify-center p-8 text-center text-[var(--color-text-muted)]">
        <p className="text-sm font-bold">No active Goal found.</p>
        <p className="mt-1 text-xs">Create a Goal to open a campaign map.</p>
      </div>
    );
  }

  const campaignQuests = quests.filter((quest) => quest.goalId === goal.id);
  return (
    <div className="w-full overflow-x-auto overscroll-x-contain py-4">
      <div className="w-max min-w-full">
        <CampaignMapCanvas goal={goal} quests={campaignQuests} onSelectQuest={onSelectQuest} />
      </div>
    </div>
  );
}
