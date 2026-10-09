"use client";

import React from "react";

export type NavIconName = "home" | "quest" | "world" | "rewards" | "profile" | "settings";
export type SystemIconName = "achievement" | "location" | "locked" | "title" | "xp";

export { AscendLogo } from "./AscendLogo";

interface NavIconProps {
  name: NavIconName;
  active?: boolean;
  size?: number;
  className?: string;
}

interface SectionIconProps {
  name: NavIconName;
  size?: number;
  className?: string;
}

interface SystemIconProps {
  name: SystemIconName;
  size?: number;
  className?: string;
}

/**
 * Navigation Icon component (32px rendered)
 * Uses public/icons/navigation/ and public/icons/navigation-active/
 */
export function NavIcon({ name, active = false, size = 24, className = "" }: NavIconProps) {
  const src = active
    ? `/icons/navigation-active/${name}.png`
    : `/icons/navigation/${name}.png`;

  return (
    <img
      src={src}
      alt={name}
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      loading="eager"
    />
  );
}

/**
 * Section Header Icon component
 * Uses public/icons/sections/
 */
export function SectionIcon({ name, size = 32, className = "" }: SectionIconProps) {
  return (
    <img
      src={`/icons/sections/${name}.png`}
      alt={name}
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      loading="eager"
    />
  );
}

/**
 * System Status Icon component
 * Uses public/icons/system/
 */
export function SystemIcon({ name, size = 20, className = "" }: SystemIconProps) {
  return (
    <img
      src={`/icons/system/${name}.png`}
      alt={name}
      width={size}
      height={size}
      className={`object-contain select-none ${className}`}
      loading="eager"
    />
  );
}
