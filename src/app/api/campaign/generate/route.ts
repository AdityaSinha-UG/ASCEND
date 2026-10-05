import { NextResponse, type NextRequest } from "next/server";
import { CampaignServiceError, researchCampaignForGoal } from "@/lib/server/campaign";
import { planCampaign } from "@/lib/server/companionEngine";
import { hasCompleteCampaign, logCampaignPersistenceFailure, persistCampaign } from "@/lib/server/campaignPersistence";
import { createClient } from "@/lib/supabase/server";
import { isAdminClientConfigured } from "@/lib/supabase/admin";
import { inferTimeframeContext, parseTimeframe, type Timeframe } from "@/lib/utils/timeframe";

export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 4096;

async function readJsonBody(request: NextRequest): Promise<
  { ok: true; value: unknown } | { ok: false; tooLarge: boolean }
> {
  const reader = request.body?.getReader();
  if (!reader) return { ok: false, tooLarge: false };
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    byteLength += value.byteLength;
    if (byteLength > MAX_REQUEST_BYTES) {
      await reader.cancel();
      return { ok: false, tooLarge: true };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, value: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, tooLarge: false };
  }
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let userId: string;
  try {
    supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return errorResponse("Authentication required.", 401);
    userId = user.id;
  } catch {
    return errorResponse("Could not verify your ASCEND session.", 401);
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_REQUEST_BYTES) return errorResponse("Request body is too large.", 413);
  const parsed = await readJsonBody(request);
  if (!parsed.ok && parsed.tooLarge) return errorResponse("Request body is too large.", 413);
  if (!parsed.ok) return errorResponse("Request body must be valid JSON.", 400);
  if (!parsed.value || typeof parsed.value !== "object" || Array.isArray(parsed.value)) {
    return errorResponse("Request body must be an object.", 400);
  }

  const body = parsed.value as Record<string, unknown>;
  if (Object.keys(body).some((key) => !["goalId", "timeframeText"].includes(key)) || typeof body.goalId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.goalId)) {
    return errorResponse("A valid goalId is required.", 400);
  }
  if (body.timeframeText !== undefined && (typeof body.timeframeText !== "string" || body.timeframeText.trim().length > 80)) {
    return errorResponse("Enter a timeframe of 80 characters or fewer.", 400);
  }
  const goalId = body.goalId;

  // RLS plus this explicit owner predicate ensure the supplied Goal belongs
  // to the authenticated session. No client-provided owner ID is accepted.
  const { data: goal, error: goalError } = await supabase
    .from("goals")
    .select("id, title, timeframe_value, timeframe_unit, timeframe_context")
    .eq("id", goalId)
    .eq("user_id", userId)
    .maybeSingle();
  if (goalError) {
    logCampaignPersistenceFailure("goal_ownership_verification", "goals", goalError, goalId);
    return errorResponse("Could not load this Goal.", 500);
  }
  if (!goal) {
    logCampaignPersistenceFailure("goal_ownership_verification", "goals", new Error("No owned Goal row returned"), goalId);
    return errorResponse("Goal not found.", 404);
  }

  const encoder = new TextEncoder();
  let disconnected = false;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown> = {}) => {
        if (disconnected) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch {
          disconnected = true;
        }
      };

      try {
        send("goal_understood");
        let complete: boolean;
        try {
          const { error: helpSetupError } = await supabase.rpc("refresh_goal_help_questions", { p_goal_id: goalId });
          if (helpSetupError) {
            logCampaignPersistenceFailure("help_question_refresh_idempotency", "help_questions", helpSetupError, goalId);
            throw helpSetupError;
          }
          complete = await hasCompleteCampaign(supabase, goalId);
        } catch (error) {
          logCampaignPersistenceFailure("campaign_idempotency_lookup", "paths/quests/help_questions", error, goalId);
          send("campaign_failed", { stage: "persistence", message: "Campaign could not be checked or saved. Please retry." });
          return;
        }
        if (complete) {
          send("campaign_ready", { reused: true });
          return;
        }

        if (!isAdminClientConfigured()) {
          send("campaign_failed", {
            stage: "persistence",
            message: "Campaign saving is not configured on the server. Please try again later.",
          });
          return;
        }

        const goalText = typeof body.timeframeText === "string" ? body.timeframeText.trim() : "";
        const timeframe: Timeframe | null = (goal.timeframe_value && goal.timeframe_unit)
          ? { value: goal.timeframe_value, unit: goal.timeframe_unit, context: goal.timeframe_context ?? inferTimeframeContext(goal.title) }
          : parseTimeframe(goalText, goal.title) ?? parseTimeframe(goal.title, goal.title);
        if (!timeframe) {
          send("timeframe_required", { message: "How much time do you want to give yourself to achieve this goal? Enter a duration such as 30 days, 3 months, or 1 year." });
          return;
        }

        if (goal.timeframe_value !== timeframe.value || goal.timeframe_unit !== timeframe.unit || goal.timeframe_context !== timeframe.context) {
          const { error: timeframeError } = await supabase.from("goals").update({
            timeframe_value: timeframe.value,
            timeframe_unit: timeframe.unit,
            timeframe_context: timeframe.context,
          }).eq("id", goalId).eq("user_id", userId);
          if (timeframeError) {
            logCampaignPersistenceFailure("goal_timeframe_update", "goals", timeframeError, goalId);
            send("campaign_failed", { stage: "persistence", message: "The Goal timeframe could not be saved. Please try again." });
            return;
          }
        }

        const { goal: fullGoal, researchResults } = await researchCampaignForGoal(
          { goal: goal.title, timeframe },
          (event) => send(event),
        );
        send("ai_generation_started");
        const campaign = planCampaign({ goal: fullGoal, timeframe, researchResults });
        send("campaign_validated");
        send("persistence_started");
        try {
          await persistCampaign(supabase, userId, goalId, campaign);
          const { error: helpError } = await supabase.rpc("refresh_goal_help_questions", { p_goal_id: goalId });
          if (helpError) {
            logCampaignPersistenceFailure("help_question_refresh", "help_questions", helpError, goalId);
            throw helpError;
          }
          if (!(await hasCompleteCampaign(supabase, goalId))) {
            const error = new Error("Final campaign persistence verification failed");
            logCampaignPersistenceFailure("final_persistence_verification", "paths/quests/help_questions", error, goalId);
            throw error;
          }
        } catch {
          send("campaign_failed", { stage: "persistence", message: "Campaign could not be fully saved to Supabase. Please retry." });
          return;
        }
        send("campaign_ready", { reused: false });
      } catch (error) {
        if (error instanceof CampaignServiceError && error.stage === "research") {
          send("campaign_failed", { stage: "research", message: "Research could not be completed." });
        } else if (error instanceof CampaignServiceError) {
          send("campaign_failed", {
            stage: "generation",
            category: error.kind,
            message: error.message,
          });
        } else {
          console.error("[campaign] Unexpected campaign request failure", {
            stage: "generation",
            errorName: error instanceof Error ? error.name : "unknown",
          });
          send("campaign_failed", { stage: "generation", category: "provider", message: "Campaign generation failed unexpectedly. Please retry." });
        }
      } finally {
        if (!disconnected) {
          try {
            controller.close();
          } catch {
            disconnected = true;
          }
        }
      }
    },
    cancel() {
      // Let already-started work finish so a browser refresh can safely retry
      // against the deterministic campaign row IDs.
      disconnected = true;
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no",
    },
  });
}
