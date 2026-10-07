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

/**
 * Intelligently formats a user's raw goal input into a clean, RPG-worthy title.
 * Strips self-referential conversational prefixes ("I want to learn", "My goal is to")
 * and properly title-cases words while preserving industry acronyms.
 * Can also heal corrupted placeholder titles ("I Mastery", "I Journey") using description.
 */
export function formatGoalTitle(rawGoal: string, fallbackDescription?: string): string {
  if (!rawGoal || typeof rawGoal !== "string") return "Ascent Journey";

  let input = rawGoal.trim();

  // If the title is literally a corrupted placeholder like "I Mastery", "I Journey", "I Prep", "Mastery Mastery"
  if (/^(i\s+)?(mastery|journey|prep)(\s+(mastery|journey|prep))?$/i.test(input)) {
    if (fallbackDescription) {
      const extracted = fallbackDescription.split(/\n|Strategy:/i)[0]?.trim();
      if (extracted && extracted.length >= 3 && !/^(i\s+)?(mastery|journey|prep)/i.test(extracted)) {
        input = extracted;
      }
    }
  }

  // 1. Strip conversational / self-referential prefix
  let cleaned = input
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(i\s+(want|would\s+like|need|wish|hope|plan|aim|intend|will|must)\s+to\s+)/i, "")
    .replace(/^(my\s+goal\s+is\s+(to\s+)?)/i, "")
    .replace(/^(i'm\s+trying\s+to\s+|im\s+trying\s+to\s+|i\s+am\s+trying\s+to\s+)/i, "")
    .replace(/^(i\s+(want|need|plan|wish|will|must)\s+)/i, "")
    .replace(/^(how\s+to\s+)/i, "")
    .replace(/^(please\s+help\s+me\s+(to\s+)?)/i, "")
    .replace(/^(help\s+me\s+(to\s+)?)/i, "")
    .replace(/^i\s+/i, "")
    .replace(/^to\s+/i, "")
    .trim();

  if (!cleaned) cleaned = input;

  // If after cleaning it's just "mastery" or "journey" or "prep", handle safely
  if (/^(mastery|journey|prep)$/i.test(cleaned)) {
    if (fallbackDescription && fallbackDescription.toLowerCase().includes("python")) {
      return "Learn Python Foundation";
    }
    if (fallbackDescription && (fallbackDescription.toLowerCase().includes("japanese") || fallbackDescription.toLowerCase().includes("jlpt"))) {
      return "Learn Japanese";
    }
    return "Personal Journey";
  }

  const ACRONYMS = new Set(["JLPT", "CSS", "HTML", "API", "SQL", "AWS", "AI", "ML", "UI", "UX", "SDK", "RPC", "REST", "CLI", "N1", "N2", "N3", "N4", "N5"]);
  const MINOR_WORDS = new Set(["a", "an", "the", "and", "but", "or", "for", "nor", "on", "at", "to", "from", "by", "with", "in", "of"]);

  const tokens = cleaned.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return "Ascent Journey";

  // Single-word goal (e.g., "python" or "japanese") -> expand nicely
  if (tokens.length === 1) {
    const word = tokens[0];
    const upper = word.toUpperCase();
    const formatted = ACRONYMS.has(upper) ? upper : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

    if (/\b(exam|test|jlpt|certification)\b/i.test(input)) {
      return `${formatted} Prep`.slice(0, 100);
    }
    if (/\b(learn|study|master|code|program)\b/i.test(input)) {
      return `${formatted} Foundations`.slice(0, 100);
    }
    return `${formatted} Mastery`.slice(0, 100);
  }

  // Multi-word goal: Title-case each word intelligently, preserving acronyms
  const titled = tokens.map((token, index) => {
    const upper = token.toUpperCase();
    if (ACRONYMS.has(upper)) return upper;
    if (token.length > 1 && token === upper) return upper;

    const lower = token.toLowerCase();
    if (index > 0 && MINOR_WORDS.has(lower)) return lower;

    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }).join(" ");

  return titled.slice(0, 100);
}
