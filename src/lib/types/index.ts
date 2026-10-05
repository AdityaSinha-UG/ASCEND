// ─── Player ────────────────────────────────────────────────────────────────

export type AvatarId =
  | "elephant"
  | "fox"
  | "monkey"
  | "panda"
  | "snow_leopard"
  | "wolf";

export interface Player {
  id: string;
  playerId: string; // Exactly 8-digit numeric Player ID (e.g. "48291047")
  username: string;
  email?: string;
  avatarId: AvatarId;
  xp: number;
  level: number;
  focus: number;
  discipline: number;
  consistency: number;
  titles: string[];
  activeTitle: string | null;
  createdAt: string;
  tutorialCompleted: boolean;
  coins?: number; // Preserved optional field for backend schema compatibility
}

// ─── Goals ─────────────────────────────────────────────────────────────────

export type GoalStatus = "active" | "completed" | "paused" | "archived";

export interface Goal {
  id: string;
  playerId: string;
  title: string;
  description: string;
  category?: string;
  status: GoalStatus;
  createdAt: string;
  targetDate?: string;
  timeframeValue?: number;
  timeframeUnit?: "days" | "weeks" | "months" | "years";
  timeframeContext?: "preparation" | "learning" | "development" | "habit" | "goal";
  campaignAnalysis?: {
    smart?: { specific: string; measurable: string; achievable: string; relevant: string; timeBound: string };
    assessment?: { difficulty: "easy" | "medium" | "hard"; intensity: "low" | "moderate" | "high" | "very_high"; recommendedPathCount: number };
  };
  progress?: number;
}

// ─── Paths / Quests ────────────────────────────────────────────────────────

export type QuestType = "main" | "sub" | "side";
export type QuestStatus = "locked" | "available" | "in_progress" | "completed";
export type QuestDifficulty = "easy" | "medium" | "hard" | "epic";

export interface Quest {
  id: string;
  goalId: string;
  /** Database Path ID; used to keep campaign edges inside their owning Path. */
  pathId?: string;
  parentQuestId: string | null; // null = top-level main path
  type: QuestType;
  title: string;
  objective: string;
  difficulty: QuestDifficulty;
  xpReward: number;
  status: QuestStatus;
  prerequisites: string[]; // quest IDs that must be completed first
  hint: string;
  progress: number; // 0–100
  order: number;    // display order
  coinReward?: number; // Preserved optional field for backend schema compatibility
}

/**
 * ASCEND Path representation
 * Quests inside a Goal's progression map are termed "Paths" in ASCEND.
 */
export type Path = Quest;

// ─── Progression Map (World) ─────────────────────────────────────────────

export interface WorldNode {
  id: string;
  type: "goal" | "quest" | "path";
  questId?: string;
  title: string;
  children: WorldNode[];
}

// ─── Titles ────────────────────────────────────────────────────────────────

export interface Title {
  id: string;
  label: string;
  description: string;
  unlockCondition: string;
  purchased?: boolean;
}

// ─── Achievements ──────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  label: string;
  description: string;
  unlockedAt: string | null;
  icon?: string;
}
