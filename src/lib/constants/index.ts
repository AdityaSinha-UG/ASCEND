import type { AvatarId } from "@/lib/types";

// ─── Avatars ────────────────────────────────────────────────────────────────
// Finalized 6 default avatars matching actual file paths in /public/avatars/

export interface AvatarDefinition {
  id: AvatarId;
  label: string;
  cardPath: string;
  pfpPath: string;
  symbolism: string;
  traits: string[];
  monologue: string;
  identityStatement: string;
}

export const AVATARS: AvatarDefinition[] = [
  {
    id: "elephant",
    label: "Elephant",
    cardPath: "/avatars/cards/elephant_card.png",
    pfpPath: "/avatars/pfp/elephant_pfp.png",
    symbolism: "Patience, Wisdom, & Steady Progress",
    traits: ["Wise", "Patient", "Resilient", "Methodical"],
    monologue: "I represent patience, memory, and steady progress. Some journeys are not won by rushing ahead; they are built one deliberate step at a time.",
    identityStatement: "Walk steadily. Remember what brought you here.",
  },
  {
    id: "fox",
    label: "Fox",
    cardPath: "/avatars/cards/fox_card.png",
    pfpPath: "/avatars/pfp/fox_pfp.png",
    symbolism: "Adaptability, Strategy, & Sharp Intellect",
    traits: ["Strategic", "Adaptable", "Clever", "Observant"],
    monologue: "I see paths where others see dead ends. To ascend is not merely to push forward, but to outsmart the obstacles that stand before you.",
    identityStatement: "Stay sharp. Adapt to every twist in the journey.",
  },
  {
    id: "monkey",
    label: "Monkey",
    cardPath: "/avatars/cards/monkey_card.png",
    pfpPath: "/avatars/pfp/monkey_pfp.png",
    symbolism: "Curiosity, Innovation, & Creative Energy",
    traits: ["Curious", "Creative", "Agile", "Inventive"],
    monologue: "Rules are just suggestions waiting to be rethought. Growth comes from curiosity, experimentation, and finding joy in solving hard problems.",
    identityStatement: "Think differently. Transform curiosity into mastery.",
  },
  {
    id: "panda",
    label: "Panda",
    cardPath: "/avatars/cards/panda_card.png",
    pfpPath: "/avatars/pfp/panda_pfp.png",
    symbolism: "Balance, Inner Calm, & Unshakable Strength",
    traits: ["Balanced", "Calm", "Resilient", "Mindful"],
    monologue: "True power is silent and composed. When the world demands haste, true mastery comes from grounded focus and effortless endurance.",
    identityStatement: "Find your balance. Ascend with calm purpose.",
  },
  {
    id: "snow_leopard",
    label: "Snow Leopard",
    cardPath: "/avatars/cards/snowLeopard_card.png",
    pfpPath: "/avatars/pfp/snow leopard_pfp.png",
    symbolism: "Focus, Independence, & Quiet Determination",
    traits: ["Focused", "Independent", "Swift", "Noble"],
    monologue: "I walk the highest solitary peaks. I do not need the approval of crowds to reach the summit—only absolute focus on my destination.",
    identityStatement: "Focus on the summit. Own your solitary path.",
  },
  {
    id: "wolf",
    label: "Wolf",
    cardPath: "/avatars/cards/Wolf_card.png",
    pfpPath: "/avatars/pfp/wolf_pfp.png",
    symbolism: "Loyalty, Instinct, & Courageous Leadership",
    traits: ["Courageous", "Instinctive", "Loyal", "Decisive"],
    monologue: "I trust my instincts and honor my commitments. True strength is forging ahead against all odds and leading the way into the unknown.",
    identityStatement: "Trust your instinct. Fearlessly lead your ascent.",
  },
];

// ─── Lara Assets ─────────────────────────────────────────────────────────────

export const LARA_ASSETS = {
  main: "/Lara/main/Lara_Main.png",
  chibi: {
    greeting: "/Lara/chibi/Greeting.png",
    excited: "/Lara/chibi/Excited.png",
    serious: "/Lara/chibi/Serious.png",
    pointing: "/Lara/chibi/Pointing.png",
    bowing: "/Lara/chibi/Bowing.png",
    overlyExcited: "/Lara/chibi/Overly_Excited.png",
  },
} as const;

// ─── XP / Levelling ─────────────────────────────────────────────────────────

const EARLY_XP_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  900,    // Level 5
  1400,   // Level 6
  2000,   // Level 7
  2700,   // Level 8
  3500,   // Level 9
  4500,   // Level 10
];

// Preserve the existing early-game curve, then add 1,000 XP per level through
// Level 100 (Level 11 = 5,500 XP; Level 100 = 94,500 XP).
export const XP_THRESHOLDS: number[] = [
  ...EARLY_XP_THRESHOLDS,
  ...Array.from({ length: 90 }, (_, index) => 5_500 + index * 1_000),
];

export const MAX_LEVEL = 100;

// ─── Quest Difficulty Labels ─────────────────────────────────────────────────

export const DIFFICULTY_LABELS: Record<string, string> = {
  easy:   "Easy",
  medium: "Medium",
  hard:   "Hard",
  epic:   "Epic",
};

export const DIFFICULTY_COLORS: Record<string, string> = {
  easy:   "#34D399", // green
  medium: "#4A78FF", // blue
  hard:   "#8A4FFF", // purple
  epic:   "#E5B869", // gold
};

// ─── App Routes ──────────────────────────────────────────────────────────────

export const ROUTES = {
  home:        "/home",
  onboarding:  "/onboarding",
  dashboard:   "/home",
  world:       "/world",
  quests:      "/quests",
  rewards:     "/rewards",
  profile:     "/profile",
  settings:    "/settings",
} as const;
