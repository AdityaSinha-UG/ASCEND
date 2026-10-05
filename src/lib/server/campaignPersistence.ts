import "server-only";
import { createHash } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import type { CampaignDraft } from "./campaign";

type CampaignClient = Awaited<ReturnType<typeof createClient>>;

function safeErrorDetails(error: unknown): { errorCode?: string; errorMessage?: string } {
  if (!error || typeof error !== "object") return {};
  const value = error as { code?: unknown; message?: unknown };
  const errorCode = typeof value.code === "string" && /^[A-Za-z0-9_-]{1,40}$/.test(value.code) ? value.code : undefined;
  const errorMessage = typeof value.message === "string"
    ? value.message.replace(/[\r\n\t]/g, " ").replace(/(bearer\s+)\S+/gi, "$1[redacted]")
      .replace(/(key|token|password|secret)[=: ]+[^\s,;]+/gi, "$1=[redacted]").slice(0, 240)
    : undefined;
  return { ...(errorCode ? { errorCode } : {}), ...(errorMessage ? { errorMessage } : {}) };
}

export function logCampaignPersistenceFailure(operation: string, entity: string, error: unknown, goalId?: string) {
  console.error("[campaign] Persistence boundary failed", {
    operation, entity, status: "failure", ...safeErrorDetails(error), ...(goalId ? { goalId } : {}),
  });
}

function stableUuid(value: string): string {
  const bytes = createHash("sha256").update(`ascend-campaign:${value}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function pathId(goalId: string, index: number): string {
  return stableUuid(`${goalId}:path:${index}`);
}

export function questId(goalId: string, pathIndex: number, index: number): string {
  return stableUuid(`${goalId}:path:${pathIndex}:quest:${index}`);
}

async function hasCampaignStructure(client: CampaignClient, goalId: string): Promise<boolean> {
  const { data: paths, error: pathError } = await client
    .from("paths")
    .select("id")
    .eq("goal_id", goalId);
  if (pathError) throw pathError;
  if (!paths || paths.length < 1 || paths.length > 10) return false;

  const pathIds = paths.map((path) => path.id);
  const { data: quests, error: questError } = await client
    .from("quests")
    .select("path_id")
    .in("path_id", pathIds);
  if (questError) throw questError;
  const counts = new Map<string, number>();
  for (const quest of quests ?? []) counts.set(quest.path_id, (counts.get(quest.path_id) ?? 0) + 1);
  return pathIds.every((id) => {
    const count = counts.get(id) ?? 0;
    return count >= 1 && count <= 6;
  });
}

export async function hasCompleteCampaign(client: CampaignClient, goalId: string): Promise<boolean> {
  if (!(await hasCampaignStructure(client, goalId))) return false;
  const { data: paths, error: pathError } = await client.from("paths").select("id").eq("goal_id", goalId);
  if (pathError) throw pathError;
  const pathIds = (paths ?? []).map((path) => path.id);
  const { data: quests, error: questError } = pathIds.length
    ? await client.from("quests").select("id").in("path_id", pathIds)
    : { data: [], error: null };
  if (questError) throw questError;
  const questIds = (quests ?? []).map((quest) => quest.id);
  const { data: help, error: helpError } = await client.from("help_questions")
    .select("goal_id, path_id, quest_id")
    .or(`goal_id.eq.${goalId},path_id.in.(${pathIds.join(",")}),quest_id.in.(${questIds.join(",")})`);
  if (helpError) throw helpError;
  const counts = new Map<string, number>();
  for (const row of help ?? []) {
    const key = row.goal_id ? `goal:${row.goal_id}` : row.path_id ? `path:${row.path_id}` : `quest:${row.quest_id}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return (counts.get(`goal:${goalId}`) ?? 0) >= 2 && (counts.get(`goal:${goalId}`) ?? 0) <= 4 &&
    pathIds.every((id) => (counts.get(`path:${id}`) ?? 0) >= 2 && (counts.get(`path:${id}`) ?? 0) <= 4) &&
    (quests ?? []).every((quest) => (counts.get(`quest:${quest.id}`) ?? 0) >= 2 && (counts.get(`quest:${quest.id}`) ?? 0) <= 4);
}

/** Persist via the caller's authenticated, RLS-scoped Supabase session. */
export async function persistCampaign(
  client: CampaignClient,
  userId: string,
  goalId: string,
  campaign: CampaignDraft,
): Promise<{ reused: boolean }> {
  const { data: ownedGoal, error: ownerError } = await client
    .from("goals")
    .select("id")
    .eq("id", goalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (ownerError || !ownedGoal) {
    const error = ownerError ?? new Error("No owned Goal row returned");
    logCampaignPersistenceFailure("goal_ownership_verification", "goals", error, goalId);
    throw new Error("The authenticated user's Goal could not be verified.");
  }

  if (await hasCompleteCampaign(client, goalId)) return { reused: true };

  // Quest and Path structure is written only from this authenticated server
  // flow; normal browser clients no longer receive these table write grants.
  const admin = createAdminClient();

  const paths = campaign.paths.map((path, index) => ({
    id: pathId(goalId, index),
    goal_id: goalId,
    title: path.title,
    objective: path.objective,
    status: index === 0 ? "in_progress" : "locked",
    sort_order: path.sortOrder,
  }));

  const questRows = campaign.paths.flatMap((path, pathIndex) =>
    path.quests.map((quest, questIndex) => {
      const prerequisiteIds = quest.prerequisites.map((index) => questId(goalId, pathIndex, index));
      return {
        id: questId(goalId, pathIndex, questIndex),
        path_id: pathId(goalId, pathIndex),
        parent_quest_id: prerequisiteIds[0] ?? null,
        type: questIndex === 0 ? "main" : "sub",
        title: quest.title,
        objective: quest.objective,
        difficulty: quest.difficulty,
        xp_reward: quest.xpReward,
        status: pathIndex === 0 && questIndex === 0 ? "available" : "locked",
        prerequisites: prerequisiteIds,
        progress: 0,
        sort_order: quest.sortOrder,
      };
    }),
  );

  try {
    const { error: pathsError } = await admin.from("paths").upsert(paths, { onConflict: "id" });
    if (pathsError) { logCampaignPersistenceFailure("path_upsert", "paths", pathsError, goalId); throw pathsError; }

    const { error: questsError } = await admin.from("quests").upsert(questRows, { onConflict: "id" });
    if (questsError) { logCampaignPersistenceFailure("quest_upsert", "quests", questsError, goalId); throw questsError; }

    // Remove only deterministic rows owned by this generator that are left
    // over if a retry has a smaller validated campaign.
    const stalePathIds = Array.from({ length: 10 - campaign.paths.length }, (_, index) =>
      pathId(goalId, campaign.paths.length + index),
    );
    if (stalePathIds.length > 0) {
      const { error } = await client.from("paths").delete().eq("goal_id", goalId).in("id", stalePathIds);
      if (error) { logCampaignPersistenceFailure("stale_path_cleanup", "paths", error, goalId); throw error; }
    }

    for (let pathIndex = 0; pathIndex < campaign.paths.length; pathIndex += 1) {
      const count = campaign.paths[pathIndex].quests.length;
      const staleQuestIds = Array.from({ length: 6 - count }, (_, index) => questId(goalId, pathIndex, count + index));
      if (staleQuestIds.length > 0) {
        const { error } = await client
          .from("quests")
          .delete()
          .eq("path_id", pathId(goalId, pathIndex))
          .in("id", staleQuestIds);
        if (error) { logCampaignPersistenceFailure("stale_quest_cleanup", "quests", error, goalId); throw error; }
      }
    }

    if (!(await hasCampaignStructure(client, goalId))) {
      const error = new Error("Campaign persistence structure verification failed");
      logCampaignPersistenceFailure("campaign_structure_verification", "paths/quests", error, goalId);
      throw error;
    }

    const description = `${campaign.goal.description}\n\nStrategy: ${campaign.goal.strategy}`;
    const { error: goalError } = await client
      .from("goals")
      .update({
        title: campaign.goal.title,
        description,
        campaign_analysis: { smart: campaign.smart, assessment: campaign.assessment },
      })
      .eq("id", goalId)
      .eq("user_id", userId);
    if (goalError) { logCampaignPersistenceFailure("goal_assessment_update", "goals", goalError, goalId); throw goalError; }
  } catch (error) {
    // REST writes are not one transaction. Remove only this generator's stable
    // Path IDs so a failed save does not leave a visibly half-built campaign.
    const generatedPathIds = Array.from({ length: 10 }, (_, index) => pathId(goalId, index));
    const { error: cleanupError } = await admin.from("paths").delete()
      .eq("goal_id", goalId)
      .in("id", generatedPathIds);
    if (cleanupError) logCampaignPersistenceFailure("partial_campaign_cleanup", "paths", cleanupError, goalId);
    throw error;
  }
  return { reused: false };
}
