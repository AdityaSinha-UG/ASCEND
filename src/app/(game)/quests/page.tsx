"use client";

import React, { useState } from "react";
import { useGame } from "@/store/gameContext";

type FilterTab = "active" | "available" | "completed";

export default function QuestsPage() {
  const { quests, setSelectedQuest } = useGame();
  const [filter, setFilter] = useState<FilterTab>("active");

  const activeQuests = quests.filter((q) => q.status === "in_progress");
  const availableQuests = quests.filter((q) => q.status === "available");
  const completedQuests = quests.filter((q) => q.status === "completed");

  const getList = () => {
    if (filter === "active") return activeQuests.length > 0 ? activeQuests : quests;
    if (filter === "available") return availableQuests;
    return completedQuests;
  };

  const displayedList = getList();

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6 animate-fadeIn">
      {/* Sub-Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
          Quests
        </h1>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Your active, available, and completed quests.
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] w-fit">
        <button
          onClick={() => setFilter("active")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            filter === "active"
              ? "bg-[var(--color-ascend-coral)] text-white shadow"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          Active ({activeQuests.length || quests.length})
        </button>
        <button
          onClick={() => setFilter("available")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            filter === "available"
              ? "bg-[var(--color-ascend-coral)] text-white shadow"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          Available ({availableQuests.length})
        </button>
        <button
          onClick={() => setFilter("completed")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            filter === "completed"
              ? "bg-[var(--color-ascend-coral)] text-white shadow"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          Completed ({completedQuests.length})
        </button>
      </div>

      {/* Quest Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {displayedList.map((quest) => {
          const isCompleted = quest.status === "completed";
          const isInProgress = quest.status === "in_progress";

          return (
            <div
              key={quest.id}
              onClick={() => setSelectedQuest(quest)}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between gap-4 bg-[var(--color-bg-surface)] hover:scale-[1.01] ${
                isCompleted
                  ? "border-green-500/50 bg-green-950/10"
                  : isInProgress
                  ? "border-[var(--color-ascend-coral)] shadow-md"
                  : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)]"
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-ascend-gold)]">
                    {quest.type} Quest
                  </span>
                  <span className="text-xs font-bold text-[var(--color-text-secondary)]">
                    {isCompleted ? "✓ Completed" : isInProgress ? "In Progress" : "Available"}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-[var(--color-text-primary)]">
                  {quest.title}
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                  {quest.objective}
                </p>
              </div>

              {/* Progress Bar & Rewards */}
              <div className="flex flex-col gap-2 pt-3 border-t border-[var(--color-border-subtle)]">
                <div className="flex justify-between text-xs font-bold text-[var(--color-text-secondary)]">
                  <span>Rewards: +{quest.xpReward} XP</span>
                  <span className="text-[var(--color-ascend-gold)]">
                    {quest.progress}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
                  <div
                    className="h-full bg-[var(--color-ascend-coral)] rounded-full"
                    style={{ width: `${quest.progress}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
