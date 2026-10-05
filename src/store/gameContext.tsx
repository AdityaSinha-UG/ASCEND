"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Player, Goal, Quest, Path, AvatarId, Title, Achievement } from "@/lib/types";
import { AVATARS } from "@/lib/constants";
import { getLevelFromXP, generateId, formatGoalTitle } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_TITLES: Title[] = [
  { id: "t_novice", label: "Novice Ascendant", description: "Began your first ASCEND journey.", unlockCondition: "Default title." },
  { id: "t_pathfinder", label: "Pathfinder", description: "Set your first real-life goal in ASCEND.", unlockCondition: "Complete onboarding goal setup." },
  { id: "t_first_blood", label: "First Step", description: "Completed your first quest.", unlockCondition: "Complete 1 quest." },
  { id: "t_quest_master", label: "Quest Master", description: "Completed 5 quests in total.", unlockCondition: "Complete 5 quests." },
];

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "ach_awakening", label: "The Awakening", description: "Complete Lara's onboarding tutorial.", unlockedAt: null },
  { id: "ach_first_goal", label: "First Horizon", description: "Transform your first goal into a World.", unlockedAt: null },
  { id: "ach_first_quest", label: "Journey Begun", description: "Complete your very first quest.", unlockedAt: null },
  { id: "ach_level_5", label: "Rising Hero", description: "Reach Player Level 5.", unlockedAt: null },
];

const EMPTY_PLAYER: Player = {
  id: "",
  playerId: "",
  username: "Player",
  avatarId: "elephant",
  xp: 0,
  level: 1,
  focus: 0,
  discipline: 0,
  consistency: 0,
  titles: ["t_novice"],
  activeTitle: "t_novice",
  createdAt: "",
  tutorialCompleted: false,
};

interface GameContextType {
  player: Player;
  authUserId: string | null;
  hasSelectedAvatar: boolean;
  goals: Goal[];
  activeGoal: Goal | null;
  quests: Quest[];
  titles: Title[];
  achievements: Achievement[];
  selectedQuest: Quest | null;
  isLoaded: boolean;
  dataError: string | null;

  setAvatar: (avatarId: AvatarId) => Promise<boolean>;
  setUsername: (username: string) => Promise<boolean>;
  completeTutorial: () => Promise<boolean>;
  replayTutorial: () => Promise<boolean>;
  submitGoal: (goalTitle: string) => Promise<Goal>;
  refreshCampaignData: () => Promise<void>;
  setActiveGoal: (goal: Goal | null) => void;
  startQuest: (questId: string) => Promise<void>;
  completeQuest: (questId: string) => Promise<void>;
  completeGoal: (goalId: string, confirmedPathIds: string[]) => Promise<void>;
  setActiveTitle: (titleId: string | null) => void;
  setSelectedQuest: (quest: Quest | null) => void;
  resetProgress: () => Promise<void>;

  addPath: (goalId: string, pathData: { title: string; objective: string; hint?: string; xpReward?: number }) => void;
  editPath: (pathId: string, pathData: { title?: string; objective?: string; hint?: string; xpReward?: number }) => void;
  deletePath: (pathId: string) => void;
  reorderPaths: (goalId: string, reorderedPathIds: string[]) => void;
  deleteGoal: (goalId: string) => Promise<boolean>;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

type ProfileRow = {
  id: string;
  player_id: string;
  username: string;
  avatar_id: string | null;
  xp: number;
  focus: number;
  discipline: number;
  consistency: number;
  tutorial_completed: boolean;
  created_at: string;
};

type GoalRow = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  status: Goal["status"];
  created_at: string;
  target_date: string | null;
  timeframe_value: number | null;
  timeframe_unit: Goal["timeframeUnit"] | null;
  timeframe_context: Goal["timeframeContext"] | null;
  campaign_analysis: Goal["campaignAnalysis"];
};

type PathRow = { id: string; goal_id: string; title: string; objective: string; status: Quest["status"]; sort_order: number };
type QuestRow = { id: string; path_id: string; parent_quest_id: string | null; type: Quest["type"]; title: string; objective: string; difficulty: Quest["difficulty"]; xp_reward: number; status: Quest["status"]; prerequisites: string[]; progress: number; sort_order: number };

function toGoal(row: GoalRow): Goal {
  let title = row.title;
  // Auto-heal legacy goals corrupted by the old "I Mastery" / "I Journey" / "I Prep" bug
  if (/^i\s+(mastery|journey|prep)$/i.test(title.trim()) && row.description) {
    const rawSubject = row.description.split(/\n|Strategy:/i)[0]?.trim();
    if (rawSubject && rawSubject.length >= 3) {
      title = formatGoalTitle(rawSubject);
    }
  }

  return {
    id: row.id,
    playerId: row.user_id,
    title,
    description: row.description,
    status: row.status,
    createdAt: row.created_at,
    ...(row.target_date ? { targetDate: row.target_date } : {}),
    ...(row.timeframe_value && row.timeframe_unit ? { timeframeValue: row.timeframe_value, timeframeUnit: row.timeframe_unit } : {}),
    ...(row.timeframe_context ? { timeframeContext: row.timeframe_context } : {}),
    ...(row.campaign_analysis ? { campaignAnalysis: row.campaign_analysis } : {}),
  };
}

function toPlayer(profile: ProfileRow, user: User, existing: Player): Player {
  const avatarId = AVATARS.find((avatar) => avatar.id === profile.avatar_id)?.id ?? "elephant";
  return {
    ...existing,
    id: profile.id,
    playerId: profile.player_id,
    username: profile.username,
    email: user.email,
    avatarId,
    xp: profile.xp,
    level: getLevelFromXP(profile.xp),
    focus: profile.focus,
    discipline: profile.discipline,
    consistency: profile.consistency,
    createdAt: profile.created_at,
    tutorialCompleted: profile.tutorial_completed,
  };
}

function toCampaignQuests(pathRows: PathRow[], questRows: QuestRow[]): Quest[] {
  return pathRows.flatMap((path) => {
    const children = questRows.filter((quest) => quest.path_id === path.id);
    const root: Quest = {
      id: path.id, goalId: path.goal_id, pathId: path.id, parentQuestId: null, type: "main",
      title: path.title, objective: path.objective, difficulty: "medium",
      xpReward: 0, status: path.status, prerequisites: [], hint: "",
      progress: 0, order: path.sort_order,
    };
    return [root, ...children.map((quest) => ({
      id: quest.id, goalId: path.goal_id, pathId: quest.path_id,
      parentQuestId: quest.parent_quest_id ?? path.id,
      type: quest.type, title: quest.title, objective: quest.objective,
      difficulty: quest.difficulty, xpReward: quest.xp_reward,
      status: quest.status, prerequisites: quest.prerequisites ?? [],
      hint: "", progress: quest.progress, order: quest.sort_order,
    }))];
  });
}

export function GameProvider({ children }: { children: React.ReactNode }) {
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  if (!supabaseRef.current) supabaseRef.current = createClient();
  const supabase = supabaseRef.current;

  const [player, setPlayer] = useState<Player>(EMPTY_PLAYER);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [hasSelectedAvatar, setHasSelectedAvatar] = useState(false);
  const avatarSelectionLocked = useRef(false);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [quests, setQuests] = useState<Quest[]>([]);
  const [titles, setTitles] = useState<Title[]>(DEFAULT_TITLES);
  const [achievements, setAchievements] = useState<Achievement[]>(DEFAULT_ACHIEVEMENTS);
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;
    let loadGeneration = 0;
    let authEventGeneration = 0;

    const clearAccount = () => {
      loadGeneration += 1;
      setAuthUserId(null);
      setHasSelectedAvatar(false);
      avatarSelectionLocked.current = false;
      setPlayer(EMPTY_PLAYER);
      setGoals([]);
      setActiveGoal(null);
      setQuests([]);
      setTitles(DEFAULT_TITLES);
      setAchievements(DEFAULT_ACHIEVEMENTS);
      setSelectedQuest(null);
      setDataError(null);
      setIsLoaded(true);
    };

    const loadAccount = async (user: User) => {
      const generation = ++loadGeneration;
      setIsLoaded(false);
      setAuthUserId(user.id);
      setDataError(null);

      try {
        const [profileResult, goalsResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, player_id, username, avatar_id, xp, focus, discipline, consistency, tutorial_completed, created_at")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("goals")
            .select("id, user_id, title, description, status, created_at, target_date, timeframe_value, timeframe_unit, timeframe_context, campaign_analysis")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false }),
        ]);

        if (!isActive || generation !== loadGeneration) return;
        if (profileResult.error || goalsResult.error || !profileResult.data) {
          setDataError(
            profileResult.error?.message ??
              goalsResult.error?.message ??
              "Your player profile was not found. Please sign out and sign in again.",
          );
          setIsLoaded(true);
          return;
        }

        const goalRows = goalsResult.data as GoalRow[];
        const mappedGoals = goalRows.map(toGoal);
        const pathResult = goalRows.length
          ? await supabase.from("paths").select("id, goal_id, title, objective, status, sort_order")
              .in("goal_id", goalRows.map((goal) => goal.id)).order("sort_order")
          : { data: [], error: null };
        if (pathResult.error) throw pathResult.error;
        const pathRows = (pathResult.data ?? []) as PathRow[];
        const questResult = pathRows.length
          ? await supabase.from("quests").select("id, path_id, parent_quest_id, type, title, objective, difficulty, xp_reward, status, prerequisites, progress, sort_order")
              .in("path_id", pathRows.map((path) => path.id)).order("sort_order")
          : { data: [], error: null };
        if (questResult.error) throw questResult.error;
        const questRows = (questResult.data ?? []) as QuestRow[];
        const mappedQuests = toCampaignQuests(pathRows, questRows);
        if (!isActive || generation !== loadGeneration) return;
        setPlayer(toPlayer(profileResult.data as ProfileRow, user, {
          ...EMPTY_PLAYER,
          titles: DEFAULT_TITLES.map((title) => title.id),
        }));
        const avatarExists = Boolean(profileResult.data.avatar_id);
        setHasSelectedAvatar(avatarExists);
        avatarSelectionLocked.current = avatarExists;
        setGoals(mappedGoals);
        setActiveGoal(mappedGoals.find((goal) => goal.status === "active") ?? mappedGoals[0] ?? null);
        setQuests(mappedQuests);
        setTitles(DEFAULT_TITLES);
        setAchievements(DEFAULT_ACHIEVEMENTS);
        setSelectedQuest(null);
        setIsLoaded(true);
      } catch (error) {
        if (!isActive || generation !== loadGeneration) return;
        setDataError(
          error instanceof Error ? error.message : "Could not load your ASCEND profile and goals.",
        );
        setIsLoaded(true);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        authEventGeneration += 1;
        clearAccount();
      } else if (event === "SIGNED_IN" && session?.user) {
        const eventGeneration = ++authEventGeneration;
        // Defer Supabase queries until after the auth callback releases its lock.
        setTimeout(() => {
          if (isActive && eventGeneration === authEventGeneration) void loadAccount(session.user);
        }, 0);
      }
    });

    const initialAuthGeneration = authEventGeneration;
    void supabase.auth.getUser().then(({ data: { user }, error }) => {
      if (!isActive) return;
      // A sign-in/out event may have happened while getUser was in flight.
      // Do not let this initial lookup overwrite the newer account state.
      if (initialAuthGeneration !== authEventGeneration) return;
      if (error) {
        // AuthSessionMissingError means no session exists yet — the visitor is
        // unauthenticated. Treat this exactly like a null user: clear state and
        // let the game layout redirect to /auth. Do NOT surface this as a fatal
        // dataError, which would show "Auth session missing!" to new visitors.
        if (
          error.name === "AuthSessionMissingError" ||
          error.message?.toLowerCase().includes("auth session missing")
        ) {
          clearAccount();
        } else {
          setDataError(error.message);
          setIsLoaded(true);
        }
      } else if (user) {
        void loadAccount(user);
      } else {
        clearAccount();
      }
    }).catch((error: unknown) => {
      if (!isActive) return;
      setDataError(error instanceof Error ? error.message : "Could not restore your ASCEND session.");
      setIsLoaded(true);
    });

    return () => {
      isActive = false;
      authEventGeneration += 1;
      loadGeneration += 1;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const persistProfileUpdate = async (
    values: Partial<Pick<ProfileRow, "username" | "avatar_id" | "tutorial_completed">>,
  ): Promise<boolean> => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        setDataError(authError?.message ?? "Please sign in again to update your player profile.");
        return false;
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(values)
        .eq("id", user.id)
        .select("id, player_id, username, avatar_id, xp, focus, discipline, consistency, tutorial_completed, created_at")
        .single();

      if (error) {
        setDataError(error.message);
        return false;
      }

      setPlayer((current) => toPlayer(data as ProfileRow, user, current));
      setDataError(null);
      return true;
    } catch (error) {
      setDataError(error instanceof Error ? error.message : "Could not update your player profile.");
      return false;
    }
  };

  const setAvatar = async (avatarId: AvatarId) => {
    if (avatarSelectionLocked.current) return false;
    // Lock immediately so two rapid onboarding submissions cannot overwrite
    // the first saved avatar while the profile update is in flight.
    avatarSelectionLocked.current = true;
    const saved = await persistProfileUpdate({ avatar_id: avatarId });
    if (saved) setHasSelectedAvatar(true);
    else avatarSelectionLocked.current = false;
    return saved;
  };
  const setUsername = (username: string) =>
    persistProfileUpdate({ username: username.trim() || "Player" });

  const completeTutorial = async () => {
    const saved = await persistProfileUpdate({ tutorial_completed: true });
    if (saved) {
      setAchievements((prev) => prev.map((achievement) =>
        achievement.id === "ach_awakening"
          ? { ...achievement, unlockedAt: achievement.unlockedAt || new Date().toISOString() }
          : achievement,
      ));
    }
    return saved;
  };

  const replayTutorial = () => persistProfileUpdate({ tutorial_completed: false });

  const submitGoal = async (goalTitle: string): Promise<Goal> => {
    const title = goalTitle.trim();
    if (title.length < 3 || title.length > 300 || /[\u0000-\u001f\u007f]/.test(title)) {
      throw new Error("Enter a goal between 3 and 300 characters.");
    }

    // Derive ownership from the verified Supabase Auth user, never from the
    // Player/Goal objects supplied by the UI.
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error(authError?.message ?? "Please sign in to create a goal.");

    const { data, error } = await supabase
      .from("goals")
      .insert({ user_id: user.id, title })
      .select("id, user_id, title, description, status, created_at, target_date, timeframe_value, timeframe_unit, timeframe_context, campaign_analysis")
      .single();

    if (error) throw new Error(error.message);

    const goal = toGoal(data as GoalRow);
    setGoals((current) => [goal, ...current]);
    setActiveGoal(goal);
    setDataError(null);
    setPlayer((current) => ({
      ...current,
      titles: Array.from(new Set([...current.titles, "t_pathfinder"])),
    }));
    setAchievements((current) => current.map((achievement) =>
      achievement.id === "ach_first_goal"
        ? { ...achievement, unlockedAt: achievement.unlockedAt || new Date().toISOString() }
        : achievement,
    ));
    // Goal creation intentionally creates no Paths or Quests.
    return goal;
  };

  const refreshCampaignData = async () => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Please sign in again to reload your World.");
    const { data: goalData, error: goalError } = await supabase
      .from("goals").select("id, user_id, title, description, status, created_at, target_date, timeframe_value, timeframe_unit, timeframe_context, campaign_analysis")
      .eq("user_id", user.id).order("created_at", { ascending: false });
    if (goalError) throw new Error("Your Goals could not be refreshed.");
    const goalRows = (goalData ?? []) as GoalRow[];
    const mappedGoals = goalRows.map(toGoal);
    const { data: pathData, error: pathError } = goalRows.length
      ? await supabase.from("paths").select("id, goal_id, title, objective, status, sort_order")
          .in("goal_id", goalRows.map((goal) => goal.id)).order("sort_order")
      : { data: [], error: null };
    if (pathError) throw new Error("Your Paths could not be refreshed.");
    const pathRows = (pathData ?? []) as PathRow[];
    const { data: questData, error: questError } = pathRows.length
      ? await supabase.from("quests").select("id, path_id, parent_quest_id, type, title, objective, difficulty, xp_reward, status, prerequisites, progress, sort_order")
          .in("path_id", pathRows.map((path) => path.id)).order("sort_order")
      : { data: [], error: null };
    if (questError) throw new Error("Your Quests could not be refreshed.");
    setGoals(mappedGoals);
    setActiveGoal((current) => mappedGoals.find((goal) => goal.id === current?.id) ?? mappedGoals[0] ?? null);
    setQuests(toCampaignQuests(pathRows, (questData ?? []) as QuestRow[]));
  };

  const startQuest = async (questId: string) => {
    const { error } = await supabase.rpc("start_my_progress_node", { p_node_id: questId });
    if (error) throw new Error("This Path or Quest could not be started. Check its prerequisites and try again.");
    setQuests((current) => current.map((quest) =>
      quest.id === questId
        ? { ...quest, status: "in_progress", progress: Math.max(quest.progress, 1) }
        : quest,
    ));
    setSelectedQuest((current) => current && current.id === questId
      ? { ...current, status: "in_progress", progress: Math.max(current.progress, 1) }
      : current);
  };

  const completeQuest = async (questId: string) => {
    const { data, error } = await supabase.rpc("complete_my_progress_node", { p_node_id: questId });
    if (error || !data || typeof data !== "object") {
      throw new Error("This Path or Quest could not be completed. Please try again.");
    }
    const result = data as { nodeId?: string; status?: string; xp?: number; level?: number; focus?: number; discipline?: number; consistency?: number };
    if (result.status !== "completed" || typeof result.xp !== "number") {
      throw new Error("The server did not confirm completion. Please try again.");
    }
    setQuests((current) => current.map((quest) => quest.id === questId
      ? { ...quest, status: "completed", progress: 100 }
      : quest));
    setSelectedQuest((current) => current?.id === questId
      ? { ...current, status: "completed", progress: 100 }
      : current);
    setPlayer((current) => ({
      ...current,
      xp: result.xp!,
      level: typeof result.level === "number" ? result.level : getLevelFromXP(result.xp!),
      focus: typeof result.focus === "number" ? result.focus : current.focus,
      discipline: typeof result.discipline === "number" ? result.discipline : current.discipline,
      consistency: typeof result.consistency === "number" ? result.consistency : current.consistency,
    }));
    setAchievements((current) => current.map((achievement) =>
      achievement.id === "ach_first_quest"
        ? { ...achievement, unlockedAt: achievement.unlockedAt || new Date().toISOString() }
        : achievement,
    ));
    void refreshCampaignData().catch(() => undefined);
  };

  const completeGoal = async (goalId: string, confirmedPathIds: string[]) => {
    const { data, error } = await supabase.rpc("complete_my_goal", {
      p_goal_id: goalId,
      p_confirmed_path_ids: confirmedPathIds,
    });

    // Log the real error safely for debugging (never logs secrets/keys/tokens).
    if (error) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[ASCEND] complete_my_goal RPC error:", {
          code: error.code,
          message: error.message,
          hint: error.hint,
          details: error.details,
        });
      }
      throw new Error("This Goal could not be completed. Please try again.");
    }

    // PostgREST returns jsonb RPCs as either a plain object or an array
    // containing the object. Normalise to a plain object.
    const raw = Array.isArray(data) ? data[0] : data;

    if (!raw || typeof raw !== "object") {
      if (process.env.NODE_ENV !== "production") {
        console.error("[ASCEND] complete_my_goal: unexpected response shape:", data);
      }
      throw new Error("This Goal could not be completed. Please try again.");
    }

    const result = raw as {
      goalId?: string;
      status?: string;
      xpAwarded?: number;
      xp?: number;
      level?: number;
      focus?: number;
      discipline?: number;
      consistency?: number;
    };

    // Validate the server confirmed completion and returned XP.
    // Compare goalId case-insensitively to handle UUID casing differences.
    const goalIdMatches =
      typeof result.goalId === "string" &&
      result.goalId.toLowerCase() === goalId.toLowerCase();

    if (!goalIdMatches || result.status !== "completed" || typeof result.xp !== "number") {
      if (process.env.NODE_ENV !== "production") {
        console.error("[ASCEND] complete_my_goal: server response validation failed:", {
          goalIdMatches,
          status: result.status,
          xpType: typeof result.xp,
          result,
        });
      }
      throw new Error("The server did not confirm Goal completion. Please try again.");
    }

    setGoals((current) => current.map((goal) => goal.id === goalId ? { ...goal, status: "completed" } : goal));
    setActiveGoal((current) => current?.id === goalId ? { ...current, status: "completed" } : current);
    // Mark every path and quest inside the completed goal as completed.
    setQuests((current) => current.map((quest) => quest.goalId === goalId ? { ...quest, status: "completed" } : quest));
    setPlayer((current) => ({
      ...current,
      xp: result.xp!,
      level: typeof result.level === "number" ? result.level : getLevelFromXP(result.xp!),
      focus: typeof result.focus === "number" ? result.focus : current.focus,
      discipline: typeof result.discipline === "number" ? result.discipline : current.discipline,
      consistency: typeof result.consistency === "number" ? result.consistency : current.consistency,
    }));
  };

  const setActiveTitle = (titleId: string | null) => {
    setPlayer((current) => ({ ...current, activeTitle: titleId }));
  };

  const resetProgress = async () => {
    const { error } = await supabase.rpc("reset_my_progress");
    if (error) throw new Error("Your ASCEND progress could not be reset. Please try again.");

    // The database RPC deletes the authenticated user's Goals atomically;
    // cascades remove Paths, Quests, Help questions, and campaign state.
    // Keep the account identity and selected avatar in memory.
    setGoals([]);
    setActiveGoal(null);
    setQuests([]);
    setTitles(DEFAULT_TITLES);
    setAchievements(DEFAULT_ACHIEVEMENTS);
    setSelectedQuest(null);
    setPlayer((current) => ({
      ...current,
      xp: 0,
      level: 1,
      focus: 0,
      discipline: 0,
      consistency: 0,
      tutorialCompleted: false,
      titles: DEFAULT_TITLES.map((title) => title.id),
      activeTitle: "t_novice",
    }));
  };

  const addPath = (goalId: string, pathData: { title: string; objective: string; hint?: string; xpReward?: number }) => {
    const goalQuests = quests.filter((quest) => quest.goalId === goalId);
    const lastOrder = goalQuests.reduce((max, quest) => Math.max(max, quest.order), 0);
    const lastQuest = goalQuests[goalQuests.length - 1];
    const newPath: Path = {
      id: generateId(),
      goalId,
      parentQuestId: lastQuest ? lastQuest.id : null,
      type: "sub",
      title: pathData.title,
      objective: pathData.objective,
      difficulty: "medium",
      xpReward: pathData.xpReward || 100,
      status: "available",
      prerequisites: lastQuest ? [lastQuest.id] : [],
      hint: pathData.hint || "Stay focused on your objective.",
      progress: 0,
      order: lastOrder + 1,
    };
    setQuests((current) => [...current, newPath]);
  };

  const editPath = (pathId: string, pathData: { title?: string; objective?: string; hint?: string; xpReward?: number }) => {
    setQuests((current) => current.map((quest) => quest.id === pathId ? { ...quest, ...pathData } : quest));
  };

  const deletePath = (pathId: string) => {
    setQuests((current) => current.filter((quest) => quest.id !== pathId));
  };

  const reorderPaths = (goalId: string, reorderedPathIds: string[]) => {
    setQuests((current) => current.map((quest) => {
      if (quest.goalId !== goalId) return quest;
      const newOrder = reorderedPathIds.indexOf(quest.id);
      return newOrder === -1 ? quest : { ...quest, order: newOrder + 1 };
    }));
  };

  const deleteGoal = async (goalId: string): Promise<boolean> => {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) throw new Error("Please sign in again before deleting this Goal.");

    const { data, error } = await supabase
      .from("goals")
      .delete()
      .eq("id", goalId)
      .eq("user_id", user.id)
      .select("id")
      .maybeSingle();
    if (error) throw new Error("This Goal could not be deleted. Please try again.");
    if (!data) throw new Error("This Goal was not found or is no longer available.");

    setGoals((current) => current.filter((goal) => goal.id !== goalId));
    setQuests((current) => current.filter((quest) => quest.goalId !== goalId));
    setActiveGoal((current) => (current?.id === goalId ? null : current));
    return true;
  };

  return (
    <GameContext.Provider value={{
      player,
      authUserId,
      hasSelectedAvatar,
      goals,
      activeGoal,
      quests,
      titles,
      achievements,
      selectedQuest,
      isLoaded,
      dataError,
      setAvatar,
      setUsername,
      completeTutorial,
      replayTutorial,
      submitGoal,
      refreshCampaignData,
      setActiveGoal,
      startQuest,
      completeQuest,
      completeGoal,
      setActiveTitle,
      setSelectedQuest,
      resetProgress,
      addPath,
      editPath,
      deletePath,
      reorderPaths,
      deleteGoal,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used within a GameProvider");
  return context;
}
