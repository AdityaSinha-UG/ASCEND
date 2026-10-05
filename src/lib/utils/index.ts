import { XP_THRESHOLDS, MAX_LEVEL } from "@/lib/constants";

/**
 * Returns the player's level (1-based) for a given total XP amount.
 */
export function getLevelFromXP(xp: number): number {
  let level = 1;
  for (let i = 1; i < XP_THRESHOLDS.length; i++) {
    if (xp >= XP_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }
  return Math.min(level, MAX_LEVEL);
}

/**
 * Returns the XP progress within the current level as a value 0–1.
 * Useful for rendering XP progress bars.
 */
export function getLevelProgress(xp: number): number {
  const level = getLevelFromXP(xp);
  const levelIndex = level - 1;

  if (level >= MAX_LEVEL) return 1;

  const currentThreshold = XP_THRESHOLDS[levelIndex];
  const nextThreshold = XP_THRESHOLDS[levelIndex + 1];
  const range = nextThreshold - currentThreshold;

  return (xp - currentThreshold) / range;
}

/**
 * Returns XP remaining until the next level.
 */
export function xpToNextLevel(xp: number): number {
  const level = getLevelFromXP(xp);
  if (level >= MAX_LEVEL) return 0;
  return XP_THRESHOLDS[level] - xp;
}

/**
 * Formats a number with compact notation (e.g. 1200 → "1.2k").
 */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

/**
 * Generates a UUID v4 string.
 * (Safe for client-side use; replace with crypto.randomUUID() in Node.)
 */
export function generateId(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
