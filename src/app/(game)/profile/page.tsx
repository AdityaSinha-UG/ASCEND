"use client";

import React, { useState } from "react";
import Image from "next/image";
import { useGame } from "@/store/gameContext";
import { AVATARS } from "@/lib/constants";
import { SystemIcon } from "@/components/ui/AscendIcon";
import { getLevelProgress, xpToNextLevel } from "@/lib/utils";

export default function ProfilePage() {
  const { player, activeGoal, quests, titles, achievements, setActiveTitle } = useGame();
  const [copiedId, setCopiedId] = useState(false);

  const activeAvatarDef =
    AVATARS.find((a) => a.id === player.avatarId) || AVATARS[0];

  const completedQuests = quests.filter((q) => q.status === "completed").length;
  const inProgressQuests = quests.filter((q) => q.status === "in_progress").length;
  const levelProgress = getLevelProgress(player.xp);
  const xpNeeded = xpToNextLevel(player.xp);

  const handleCopyPlayerId = () => {
    navigator.clipboard.writeText(player.playerId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const activeTitleObj = titles.find((t) => t.id === player.activeTitle) || titles[0];

  return (
    <div className="w-full max-w-5xl mx-auto p-4 sm:p-6 flex flex-col gap-6 animate-fadeIn pb-16">
      {/* Page Title & Subtitle */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <SystemIcon name="title" size={20} />
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
            Character Sheet
          </h1>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Your RPG identity, companion philosophy, and progression record in ASCEND.
        </p>
      </div>

      {/* ── 1. CHARACTER HEADER: HERO IDENTITY CARD ─────────────────────────────── */}
      <div className="p-6 sm:p-8 rounded-3xl bg-[var(--color-bg-surface)]/95 border-2 border-[var(--color-border-default)] flex flex-col md:flex-row items-center md:items-start gap-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-[radial-gradient(circle_at_top_right,rgba(229,184,105,0.12)_0%,transparent_70%)] pointer-events-none" />

        {/* Selected Avatar Full Card Preview */}
        <div className="relative w-32 h-44 sm:w-36 sm:h-48 rounded-2xl overflow-hidden border-2 border-[var(--color-ascend-gold)] shadow-[0_0_25px_rgba(229,184,105,0.25)] shrink-0 bg-black/60 group">
          <Image
            src={activeAvatarDef.cardPath}
            alt={activeAvatarDef.label}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            priority
          />
          <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2 text-center">
            <span className="text-[10px] font-black text-[var(--color-ascend-gold)] uppercase tracking-wider">
              {activeAvatarDef.label}
            </span>
          </div>
        </div>

        {/* Player Details & Player ID */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left gap-3 flex-1">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {player.username}
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg bg-[var(--color-bg-elevated)] border border-[var(--color-ascend-gold)]/40 text-xs font-black text-[var(--color-ascend-gold)] uppercase tracking-wider">
                Lv. {player.level}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg bg-[var(--color-ascend-coral)]/20 text-[var(--color-ascend-coral)] text-xs font-extrabold border border-[var(--color-ascend-coral)]/30">
                {activeTitleObj ? activeTitleObj.label : "Novice Ascendant"}
              </span>
            </div>

            {/* 8-Digit Player ID with Copy Action */}
            <div className="flex items-center gap-2 pt-0.5 justify-center md:justify-start">
              <span className="text-xs font-mono text-[var(--color-text-muted)] font-bold">
                PLAYER ID:
              </span>
              <span className="px-2.5 py-0.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] font-mono text-xs font-black text-[var(--color-text-primary)] tracking-widest">
                #{player.playerId}
              </span>
              <button
                onClick={handleCopyPlayerId}
                className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] hover:text-white border border-[var(--color-border-subtle)] transition-colors"
                title="Copy Player ID"
              >
                {copiedId ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Avatar Philosophy Quote */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] leading-relaxed italic max-w-xl">
            &ldquo;{activeAvatarDef.monologue}&rdquo;
            <div className="not-italic font-extrabold text-[var(--color-ascend-gold)] text-[11px] pt-1.5 mt-1 border-t border-[var(--color-border-subtle)]">
              ✦ {activeAvatarDef.identityStatement}
            </div>
          </div>

          {/* Avatar Symbolism & Personality Traits */}
          <div className="flex items-center gap-1.5 flex-wrap justify-center md:justify-start pt-1">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mr-1">
              TRAITS:
            </span>
            {activeAvatarDef.traits.map((trait, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[11px] font-semibold text-[var(--color-text-secondary)]"
              >
                ✦ {trait}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 2. PROGRESSION & XP LEVEL SHEET ────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SystemIcon name="xp" size={18} />
            <h3 className="text-base font-extrabold text-[var(--color-text-primary)]">
              Ascent Progression
            </h3>
          </div>
          <span className="text-xs font-bold text-[var(--color-ascend-gold)]">
            Total XP: {player.xp}
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs font-bold text-[var(--color-text-secondary)]">
            <span>Level {player.level}</span>
            <span>
              {xpNeeded > 0 ? `${xpNeeded} XP to Level ${player.level + 1}` : "Maximum Level Reached"}
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] overflow-hidden p-0.5">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-ascend-coral)] via-[var(--color-ascend-purple)] to-[var(--color-ascend-gold)] rounded-full transition-all duration-500 shadow-sm"
              style={{ width: `${Math.min(Math.round(levelProgress * 100), 100)}%` }}
            />
          </div>
        </div>

        {/* Progression Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex flex-col">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
              ACTIVE GOAL
            </span>
            <span className="text-xs font-black text-white truncate mt-0.5">
              {activeGoal ? activeGoal.title : "No active goal"}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex flex-col">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
              COMPLETED QUESTS
            </span>
            <span className="text-base font-black text-green-400 mt-0.5">
              {completedQuests}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex flex-col">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
              IN PROGRESS
            </span>
            <span className="text-base font-black text-[var(--color-ascend-gold)] mt-0.5">
              {inProgressQuests}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] flex flex-col">
            <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase">
              TOTAL PATHS
            </span>
            <span className="text-base font-black text-white mt-0.5">
              {quests.length}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3. TITLES SHEET (CLICK TO EQUIP) ──────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SystemIcon name="title" size={18} />
            <h3 className="text-base font-extrabold text-[var(--color-text-primary)]">
              Earned Titles
            </h3>
          </div>
          <span className="text-xs text-[var(--color-text-muted)] font-medium">
            Click any earned title to equip
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {titles.map((title) => {
            const isEquipped = player.activeTitle === title.id;
            const isUnlocked = player.titles.includes(title.id);

            return (
              <div
                key={title.id}
                onClick={() => {
                  if (isUnlocked) setActiveTitle(title.id);
                }}
                className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between gap-3 ${
                  isEquipped
                    ? "border-[var(--color-ascend-gold)] bg-[var(--color-bg-elevated)] shadow-[0_0_20px_rgba(229,184,105,0.2)]"
                    : isUnlocked
                    ? "border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)] hover:border-[var(--color-border-default)] cursor-pointer"
                    : "border-[var(--color-border-subtle)]/40 opacity-40 cursor-not-allowed bg-[var(--color-bg-base)]"
                }`}
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white">{title.label}</span>
                    {isEquipped && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-[var(--color-ascend-gold)] text-black">
                        EQUIPPED
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[var(--color-text-secondary)]">
                    {title.description}
                  </span>
                </div>

                <div className="shrink-0 text-xs">
                  {isEquipped ? "👑" : isUnlocked ? "⚡" : "🔒"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. ACHIEVEMENTS SHOWCASE ───────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SystemIcon name="achievement" size={18} />
            <h3 className="text-base font-extrabold text-[var(--color-text-primary)]">
              Achievements
            </h3>
          </div>
          <span className="text-xs font-bold text-[var(--color-ascend-gold)]">
            {achievements.filter((a) => a.unlockedAt !== null).length} / {achievements.length} Unlocked
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {achievements.map((ach) => {
            const isUnlocked = ach.unlockedAt !== null;
            return (
              <div
                key={ach.id}
                className={`p-4 rounded-2xl border flex flex-col gap-2 transition-all ${
                  isUnlocked
                    ? "border-emerald-500/40 bg-emerald-950/20 shadow-md"
                    : "border-[var(--color-border-subtle)] bg-[var(--color-bg-base)] opacity-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg">{isUnlocked ? "🏆" : "🔒"}</span>
                  <span
                    className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded ${
                      isUnlocked
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-[var(--color-bg-elevated)] text-[var(--color-text-muted)]"
                    }`}
                  >
                    {isUnlocked ? "UNLOCKED" : "LOCKED"}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <h4 className="text-xs font-black text-white">{ach.label}</h4>
                  <p className="text-[10px] text-[var(--color-text-secondary)] leading-tight">
                    {ach.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
