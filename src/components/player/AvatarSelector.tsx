"use client";

import React, { useState } from "react";
import Image from "next/image";
import { AVATARS } from "@/lib/constants";
import { AscendLogo } from "@/components/ui/AscendLogo";
import type { AvatarId } from "@/lib/types";

interface AvatarSelectorProps {
  selectedId: AvatarId;
  onSelect: (avatarId: AvatarId) => void;
  onConfirm: () => void;
}

const AVATAR_TRAITS: Record<AvatarId, string[]> = {
  elephant:     ["Wise", "Calm", "Resilient", "Loyal"],
  fox:          ["Quick", "Clever", "Adaptive", "Focused"],
  monkey:       ["Agile", "Creative", "Curious", "Playful"],
  panda:        ["Steady", "Balanced", "Peaceful", "Strong"],
  snow_leopard: ["Swift", "Stealthy", "Noble", "Determined"],
  wolf:         ["Leader", "Strategic", "Brave", "United"],
};

export function AvatarSelector({ selectedId, onSelect, onConfirm }: AvatarSelectorProps) {
  const [activeAvatar, setActiveAvatar] = useState<AvatarId>(selectedId);

  const activeDef = AVATARS.find((a) => a.id === activeAvatar) || AVATARS[0];

  const handleChoose = (id: AvatarId) => {
    setActiveAvatar(id);
    onSelect(id);
  };

  return (
    <div className="w-full max-w-5xl flex flex-col items-center gap-8 py-8 px-4 animate-fadeIn">
      {/* Title & Subtitle */}
      <div className="text-center flex flex-col items-center gap-2">
        <AscendLogo size={56} priority className="mb-1" />
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
          Choose Your ASCEND Avatar
        </h2>
        <p className="text-sm text-[var(--color-text-secondary)] max-w-lg mx-auto">
          Your avatar shapes your identity and philosophy in the ASCEND world.
        </p>
      </div>

      {/* Cards Grid / Carousel */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 w-full">
        {AVATARS.map((avatar) => {
          const isSelected = activeAvatar === avatar.id;
          return (
            <div
              key={avatar.id}
              onClick={() => handleChoose(avatar.id)}
              className={`relative flex flex-col items-center p-3 rounded-2xl cursor-pointer border-2 transition-all duration-300 group bg-[var(--color-bg-surface)] ${
                isSelected
                  ? "border-[var(--color-ascend-gold)] shadow-[0_0_30px_rgba(229,184,105,0.35)] scale-[1.05]"
                  : "border-[var(--color-border-subtle)] hover:border-[var(--color-border-default)] hover:scale-[1.02]"
              }`}
            >
              {/* Selected Badge */}
              {isSelected && (
                <div className="absolute top-2 right-2 bg-[var(--color-ascend-coral)] text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider z-10 shadow">
                  ACTIVE
                </div>
              )}

              {/* Avatar Card Image */}
              <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden mb-2.5 bg-black/40">
                <Image
                  src={avatar.cardPath}
                  alt={avatar.label}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  priority
                />
              </div>

              {/* Label */}
              <span
                className={`text-xs font-bold tracking-wide ${
                  isSelected
                    ? "text-[var(--color-ascend-gold)]"
                    : "text-[var(--color-text-primary)]"
                }`}
              >
                {avatar.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Selected Companion Profile & Monologue Panel */}
      <div className="w-full max-w-xl p-6 rounded-3xl bg-[var(--color-bg-surface)]/95 border-2 border-[var(--color-ascend-gold)]/40 flex flex-col items-center gap-4 text-center shadow-2xl backdrop-blur-md transition-all duration-300">
        <div className="flex flex-col items-center gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-ascend-gold)]">
            ✦ {activeDef.symbolism}
          </span>
          <h3 className="text-2xl font-black text-[var(--color-text-primary)] mt-1">
            {activeDef.label}
          </h3>
        </div>

        {/* Monologue Quote Box */}
        <div className="p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] w-full flex flex-col gap-2 shadow-inner">
          <p className="text-xs sm:text-sm text-[var(--color-text-primary)] font-medium leading-relaxed italic">
            &ldquo;{activeDef.monologue}&rdquo;
          </p>
          <span className="text-xs font-extrabold text-[var(--color-ascend-gold)] tracking-wide pt-1 border-t border-[var(--color-border-subtle)]">
            {activeDef.identityStatement}
          </span>
        </div>

        {/* Traits Badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap pt-1">
          {activeDef.traits.map((trait, i) => (
            <span
              key={i}
              className="px-3 py-1 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-default)] text-xs text-[var(--color-text-secondary)] font-semibold"
            >
              ✦ {trait}
            </span>
          ))}
        </div>
      </div>

      {/* Primary Confirm Button (Muted Coral / Warm Red) */}
      <button
        onClick={onConfirm}
        className="w-full max-w-md py-4 rounded-xl text-sm font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white shadow-xl transition-all duration-200 transform hover:scale-[1.01] tracking-wide uppercase"
      >
        Confirm {activeDef.label} Identity & Begin
      </button>
    </div>
  );
}
