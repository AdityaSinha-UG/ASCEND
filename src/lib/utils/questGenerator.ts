import type { Goal, Quest, QuestDifficulty } from "@/lib/types";
import { generateId } from "@/lib/utils";

export interface GeneratedCampaign {
  goal: Goal;
  quests: Quest[];
}

/**
 * Deterministic Mock Quest Campaign Generator
 * Accepts any natural language goal text and generates a structured RPG quest tree.
 */
export function generateMockCampaign(goalTitle: string, playerId: string = "player_1"): GeneratedCampaign {
  const goalId = generateId();
  const now = new Date().toISOString();

  const goal: Goal = {
    id: goalId,
    playerId,
    title: goalTitle,
    description: `Personal progression campaign for: "${goalTitle}"`,
    status: "active",
    createdAt: now,
  };

  // ── Main Quest 1: Foundations ──
  const main1Id = generateId();
  const sub1_1Id = generateId();
  const sub1_2Id = generateId();
  const side1_1Id = generateId();

  // ── Main Quest 2: Core Mastery ──
  const main2Id = generateId();
  const sub2_1Id = generateId();
  const sub2_2Id = generateId();

  // ── Main Quest 3: Capstone Milestone ──
  const main3Id = generateId();
  const sub3_1Id = generateId();

  const quests: Quest[] = [
    // ── MAIN QUEST 1 ──────────────────────────────────────────
    {
      id: main1Id,
      goalId,
      parentQuestId: null,
      type: "main",
      title: "Phase I: Establish Foundations",
      objective: `Understand the fundamental concepts and tools required for ${goalTitle}.`,
      difficulty: "easy" as QuestDifficulty,
      xpReward: 150,
      status: "available",
      prerequisites: [],
      hint: "Start by breaking down your core domain into basic building blocks and reviewing beginner guides.",
      progress: 0,
      order: 1,
    },
    {
      id: sub1_1Id,
      goalId,
      parentQuestId: main1Id,
      type: "sub",
      title: "1.1 Environment Setup & First Steps",
      objective: "Set up your workspace, gather core resources, and complete your first introductory lesson.",
      difficulty: "easy" as QuestDifficulty,
      xpReward: 75,
      status: "available",
      prerequisites: [main1Id],
      hint: "Create a dedicated folder or study space. Spend 30 uninterrupted minutes on your initial tutorial.",
      progress: 0,
      order: 2,
    },
    {
      id: sub1_2Id,
      goalId,
      parentQuestId: main1Id,
      type: "sub",
      title: "1.2 Core Syntax & Concepts",
      objective: "Master primary terminology, baseline workflows, and essential mental models.",
      difficulty: "medium" as QuestDifficulty,
      xpReward: 100,
      status: "locked",
      prerequisites: [sub1_1Id],
      hint: "Take concise handwritten or digital notes. Revisit concepts that feel unfamiliar before moving ahead.",
      progress: 0,
      order: 3,
    },
    {
      id: side1_1Id,
      goalId,
      parentQuestId: main1Id,
      type: "side",
      title: "Side Quest: Daily Habit Streak",
      objective: "Log at least 20 minutes of deliberate practice for 3 consecutive days.",
      difficulty: "easy" as QuestDifficulty,
      xpReward: 50,
      status: "available",
      prerequisites: [],
      hint: "Consistency beats intensity. Set a recurring alarm at a fixed time each day.",
      progress: 0,
      order: 4,
    },

    // ── MAIN QUEST 2 ──────────────────────────────────────────
    {
      id: main2Id,
      goalId,
      parentQuestId: null,
      type: "main",
      title: "Phase II: Practical Execution & Building",
      objective: "Apply foundational knowledge to real-world exercises and intermediate challenges.",
      difficulty: "medium" as QuestDifficulty,
      xpReward: 250,
      status: "locked",
      prerequisites: [sub1_2Id],
      hint: "Shift from passive reading/watching to active problem solving and hands-on execution.",
      progress: 0,
      order: 5,
    },
    {
      id: sub2_1Id,
      goalId,
      parentQuestId: main2Id,
      type: "sub",
      title: "2.1 Guided Practical Project",
      objective: "Complete a structured project or comprehensive assessment testing your core knowledge.",
      difficulty: "medium" as QuestDifficulty,
      xpReward: 150,
      status: "locked",
      prerequisites: [main2Id],
      hint: "Follow a step-by-step project blueprint, but try implementing edge cases on your own.",
      progress: 0,
      order: 6,
    },
    {
      id: sub2_2Id,
      goalId,
      parentQuestId: main2Id,
      type: "sub",
      title: "2.2 Independent Challenge",
      objective: "Solve 5 standalone problems or build an original mini-project without referencing solutions.",
      difficulty: "hard" as QuestDifficulty,
      xpReward: 200,
      status: "locked",
      prerequisites: [sub2_1Id],
      hint: "Stuck? Break the problem down into pseudo-code or small sub-steps before coding.",
      progress: 0,
      order: 7,
    },

    // ── MAIN QUEST 3 ──────────────────────────────────────────
    {
      id: main3Id,
      goalId,
      parentQuestId: null,
      type: "main",
      title: "Phase III: Mastery & Portfolio Capstone",
      objective: `Achieve final milestone for "${goalTitle}" and showcase proof of mastery.`,
      difficulty: "epic" as QuestDifficulty,
      xpReward: 500,
      status: "locked",
      prerequisites: [sub2_2Id],
      hint: "Synthesize all learned techniques into a polished final showcase or comprehensive milestone.",
      progress: 0,
      order: 8,
    },
    {
      id: sub3_1Id,
      goalId,
      parentQuestId: main3Id,
      type: "sub",
      title: "3.1 Final Review & Ascension",
      objective: "Conduct a comprehensive review of your entire journey and document key takeaways.",
      difficulty: "medium" as QuestDifficulty,
      xpReward: 200,
      status: "locked",
      prerequisites: [main3Id],
      hint: "Reflect on where you started vs where you are now. You're ready to ascend!",
      progress: 0,
      order: 9,
    },
  ];

  return { goal, quests };
}
