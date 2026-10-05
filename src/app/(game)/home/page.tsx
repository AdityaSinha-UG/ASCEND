"use client";

import { useGame } from "@/store/gameContext";
import { MAX_LEVEL, XP_THRESHOLDS } from "@/lib/constants";
import { getLevelProgress } from "@/lib/utils";

export default function HomePage() {
  const { player, quests, setSelectedQuest } = useGame();

  const tasks: { id: number; label: string; done: boolean }[] = [];

  const activeQuest = quests.find((q) => q.status === "in_progress") || quests[0];
  const levelProgress = getLevelProgress(player.xp);
  const nextLevelXp = player.level >= MAX_LEVEL ? player.xp : XP_THRESHOLDS[player.level];
  const currentLevelXp = XP_THRESHOLDS[player.level - 1];

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 flex flex-col gap-6 animate-fadeIn">
      {/* Search & Top Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search quests, goals, or anything... ⌘K"
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-ascend-gold)]"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs hover:border-[var(--color-border-default)]">
            🔔
          </button>
          <button className="p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs hover:border-[var(--color-border-default)]">
            📅
          </button>
        </div>
      </div>

      {/* Hero Welcome Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col gap-1 z-10">
          <span className="text-xs font-bold text-[var(--color-text-secondary)]">
            Good Evening,
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-[var(--color-text-primary)]">
            {player.username}
          </h1>
          <p className="text-xs italic text-[var(--color-text-muted)] mt-1">
            &ldquo;Discipline today, a greater tomorrow.&rdquo;
          </p>
        </div>

        {/* Level Box */}
        <div className="p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex flex-col gap-2 min-w-[220px] shadow">
          <div className="flex items-center justify-between">
            <span className="text-lg font-black text-[var(--color-ascend-gold)]">
              Lv. {player.level}
            </span>
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-[var(--color-ascend-coral)]/20 text-[var(--color-ascend-coral)] border border-[var(--color-ascend-coral)]/30">
              {player.activeTitle === "t_novice" ? "The Builder" : player.activeTitle || "The Ascendant"}
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-[10px] font-semibold text-[var(--color-text-secondary)]">
              <span>XP Progress</span>
              <span>{player.level >= MAX_LEVEL ? `${player.xp} XP · MAX` : `${player.xp - currentLevelXp} / ${nextLevelXp - currentLevelXp} XP`}</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--color-ascend-coral)] to-[var(--color-ascend-gold)] rounded-full transition-all"
                style={{ width: `${levelProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Attribute / Stat Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center gap-3">
          <span className="text-2xl">🎯</span>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">FOCUS</span>
            <span className="text-lg font-black text-[var(--color-text-primary)]">{player.focus}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center gap-3">
          <span className="text-2xl">🏋️</span>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">DISCIPLINE</span>
            <span className="text-lg font-black text-[var(--color-text-primary)]">{player.discipline}</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] flex items-center gap-3">
          <span className="text-2xl">🌱</span>
          <div className="flex flex-col">
            <span className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase">CONSISTENCY</span>
            <span className="text-lg font-black text-[var(--color-text-primary)]">{player.consistency}</span>
          </div>
        </div>

      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Today's Tasks List */}
        <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-extrabold text-[var(--color-text-primary)]">
              Today&apos;s Tasks
            </h3>
            <span className="text-xs font-bold text-[var(--color-text-muted)]">
              {tasks.filter((t) => t.done).length} / {tasks.length}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {tasks.length === 0 && (
              <p className="p-3 text-xs text-[var(--color-text-muted)]">
                No tasks yet. Your journey begins with a goal.
              </p>
            )}
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] cursor-pointer hover:border-[var(--color-border-default)] transition-all"
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => {}}
                  className="w-4 h-4 rounded accent-[var(--color-ascend-coral)] cursor-pointer"
                />
                <span
                  className={`text-xs font-semibold ${
                    task.done
                      ? "line-through text-[var(--color-text-muted)]"
                      : "text-[var(--color-text-primary)]"
                  }`}
                >
                  {task.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Current Quest Card */}
        {activeQuest && (
          <div
            onClick={() => setSelectedQuest(activeQuest)}
            className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] hover:border-[var(--color-ascend-gold)] cursor-pointer transition-all flex flex-col justify-between gap-4 shadow-lg"
          >
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase text-[var(--color-ascend-gold)]">
                  CURRENT QUEST
                </span>
                <span className="text-[10px] text-[var(--color-text-muted)] font-bold">
                  30 Days Left
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-3xl">💻</span>
                <div className="flex flex-col">
                  <h3 className="text-lg font-extrabold text-[var(--color-text-primary)]">
                    {activeQuest.title}
                  </h3>
                  <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                    {activeQuest.objective}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5 pt-4 border-t border-[var(--color-border-subtle)]">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[var(--color-text-secondary)]">Progress</span>
                <span className="text-[var(--color-ascend-gold)]">{activeQuest ? `${activeQuest.progress}%` : "0%"}</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[var(--color-bg-base)] overflow-hidden">
                <div className="h-full bg-[var(--color-ascend-coral)] rounded-full" style={{ width: `${activeQuest?.progress ?? 0}%` }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
