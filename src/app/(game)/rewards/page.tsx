"use client";

import React, { useState } from "react";
import { useGame } from "@/store/gameContext";
import { getLevelProgress } from "@/lib/utils";

type TabOption = "overview" | "titles" | "achievements";

export default function RewardsPage() {
  const { player, titles, achievements, setActiveTitle } = useGame();
  const [activeTab, setActiveTab] = useState<TabOption>("overview");
  const levelProgress = getLevelProgress(player.xp);

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6 animate-fadeIn">
      {/* Sub-Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
          Rewards
        </h1>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Your progress, titles, achievements, and more.
        </p>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] w-fit">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "overview"
              ? "bg-[var(--color-ascend-coral)] text-white shadow"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab("titles")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "titles"
              ? "bg-[var(--color-ascend-coral)] text-white shadow"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          Titles
        </button>
        <button
          onClick={() => setActiveTab("achievements")}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
            activeTab === "achievements"
              ? "bg-[var(--color-ascend-coral)] text-white shadow"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          Achievements
        </button>
      </div>

      {/* Level Card */}
      <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-lg">
        <div className="flex flex-col gap-2 w-full max-w-md">
          <span className="text-xs font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider">
            LEVEL {player.level} PROGRESSION
          </span>
          <div className="w-full h-2.5 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
            <div className="h-full bg-[var(--color-ascend-coral)] rounded-full transition-all" style={{ width: `${levelProgress * 100}%` }} />
          </div>
        </div>

        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <span className="text-2xl">⭐</span>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">TOTAL XP</span>
            <span className="text-lg font-black text-[var(--color-ascend-gold)]">{player.xp} XP</span>
          </div>
        </div>
      </div>

      {/* Titles or Achievements based on activeTab */}
      {activeTab === "titles" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {titles.map((title) => {
            const isUnlocked = player.titles.includes(title.id);
            const isActive = player.activeTitle === title.id;
            return (
              <div
                key={title.id}
                className={`p-4 rounded-2xl border flex items-center justify-between gap-3 bg-[var(--color-bg-surface)] ${
                  isActive
                    ? "border-[var(--color-ascend-gold)] shadow-md"
                    : "border-[var(--color-border-subtle)]"
                }`}
              >
                <div className="flex flex-col">
                  <span className="text-xs font-extrabold text-[var(--color-ascend-gold)]">{title.label}</span>
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{title.description}</span>
                </div>
                {isUnlocked && (
                  <button
                    onClick={() => setActiveTitle(isActive ? null : title.id)}
                    className={`px-3 py-1 rounded text-[10px] font-extrabold uppercase ${
                      isActive ? "bg-[var(--color-ascend-gold)] text-black" : "bg-[var(--color-ascend-coral)] text-white"
                    }`}
                  >
                    {isActive ? "Equipped" : "Equip"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {(activeTab === "overview" || activeTab === "achievements") && (
        <div className="flex flex-col gap-4">
          <h2 className="text-base font-extrabold text-[var(--color-text-primary)]">
            Recent Achievements
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {achievements.map((ach) => {
              const isUnlocked = ach.unlockedAt !== null;
              return (
                <div
                  key={ach.id}
                  className={`p-4 rounded-2xl border flex flex-col items-center gap-2 text-center transition-all bg-[var(--color-bg-surface)] ${
                    isUnlocked
                      ? "border-[var(--color-ascend-gold)] shadow-md"
                      : "border-[var(--color-border-subtle)] opacity-50"
                  }`}
                >
                  <span className="text-3xl">{isUnlocked ? "🏅" : "🔒"}</span>
                  <span className="text-xs font-extrabold text-[var(--color-text-primary)]">{ach.label}</span>
                  <span className="text-[10px] text-[var(--color-text-secondary)]">{ach.description}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
