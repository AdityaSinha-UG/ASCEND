"use client";

import React from "react";
import Image from "next/image";
import { AVATARS } from "@/lib/constants";
import { useGame } from "@/store/gameContext";
import { getLevelProgress, xpToNextLevel } from "@/lib/utils";

export function TopHUD() {
  const { player } = useGame();

  const activeAvatarDef =
    AVATARS.find((a) => a.id === player.avatarId) || AVATARS[0];

  const progress = getLevelProgress(player.xp);
  const xpNeeded = xpToNextLevel(player.xp);

  return (
    <header className="w-full bg-[var(--color-bg-surface)]/95 backdrop-blur-md border-b border-[var(--color-border-subtle)] px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-40 shadow-sm">
      {/* Left: Avatar PFP + Username & Level Badge */}
      <div className="flex items-center gap-3">
        <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-[var(--color-ascend-gold)] bg-black/60 shrink-0 shadow">
          <Image
            src={activeAvatarDef.pfpPath}
            alt={player.username}
            fill
            className="object-cover"
          />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-[var(--color-text-primary)] leading-none">
              {player.username}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] text-[10px] font-bold text-[var(--color-ascend-gold)] uppercase tracking-wider">
              Lv. {player.level}
            </span>
          </div>
          {player.activeTitle && (
            <span className="text-[10px] font-semibold text-[var(--color-text-secondary)]">
              {player.activeTitle === "t_novice" ? "The Builder" : player.activeTitle}
            </span>
          )}
        </div>
      </div>

      {/* Right: XP Bar */}
      <div className="flex items-center gap-4 sm:gap-6" data-tutorial-target="xp-hud">
        <div className="flex flex-col gap-1 w-36 sm:w-52">
          <div className="flex justify-between text-[10px] font-bold text-[var(--color-text-secondary)]">
            <span>XP PROGRESS</span>
            <span>{player.xp} {xpNeeded > 0 ? `(${xpNeeded} to next)` : "(MAX)"}</span>
          </div>
          <div className="w-full h-2 rounded-full bg-[var(--color-bg-base)] border border-[var(--color-border-subtle)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--color-ascend-purple)] to-[var(--color-ascend-gold)] transition-all duration-300 rounded-full"
              style={{ width: `${Math.min(progress * 100, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
