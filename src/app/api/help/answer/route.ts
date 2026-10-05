import { NextResponse } from "next/server";
import { planContextualHelp } from "@/lib/server/helpPlanner";
import { ResearchError } from "@/lib/server/serpapi";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

async function readBoundedJson(request: Request): Promise<unknown | null> {
  const reader = request.body?.getReader();
  if (!reader) return null;
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 512) {
      await reader.cancel();
      throw new RangeError("too_large");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return JSON.parse(new TextDecoder().decode(bytes)) as unknown;
}

export async function POST(request: Request) {
  let supabase: Awaited<ReturnType<typeof createClient>>;
  let userId: string;
  try {
    supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    userId = user.id;
  } catch {
    return NextResponse.json({ error: "Could not verify your ASCEND session." }, { status: 401 });
  }

  let body: unknown;
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 512) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    body = await readBoundedJson(request);
  } catch (error) {
    if (error instanceof RangeError) return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).length !== 1 || typeof (body as Record<string, unknown>).questionId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test((body as Record<string, string>).questionId)) {
    return NextResponse.json({ error: "A valid questionId is required." }, { status: 400 });
  }

  const { data: help, error: helpError } = await supabase.from("help_questions")
    .select("question, goal_id, path_id, quest_id")
    .eq("id", (body as { questionId: string }).questionId)
    .eq("is_active", true)
    .maybeSingle();
  if (helpError || !help) return NextResponse.json({ error: "That Help question is unavailable." }, { status: 404 });
  if ([help.goal_id, help.path_id, help.quest_id].filter(Boolean).length !== 1) {
    return NextResponse.json({ error: "That Help question is unavailable." }, { status: 404 });
  }

  try {
    let goalId = help.goal_id;
    let pathTitle: string | undefined;
    let questTitle: string | undefined;
    let objective: string | undefined;
    if (help.path_id) {
      const { data: path } = await supabase.from("paths").select("title, objective, goal_id").eq("id", help.path_id).maybeSingle();
      if (!path) return NextResponse.json({ error: "That Help question is unavailable." }, { status: 404 });
      goalId = path.goal_id; pathTitle = path.title; objective = path.objective;
    } else if (help.quest_id) {
      const { data: quest } = await supabase.from("quests").select("title, objective, path_id").eq("id", help.quest_id).maybeSingle();
      if (!quest) return NextResponse.json({ error: "That Help question is unavailable." }, { status: 404 });
      const { data: path } = await supabase.from("paths").select("title, goal_id").eq("id", quest.path_id).maybeSingle();
      if (!path) return NextResponse.json({ error: "That Help question is unavailable." }, { status: 404 });
      goalId = path.goal_id; pathTitle = path.title; questTitle = quest.title; objective = quest.objective;
    }
    if (!goalId) return NextResponse.json({ error: "That Help question is unavailable." }, { status: 404 });
    const { data: goal } = await supabase.from("goals")
      .select("title")
      .eq("id", goalId).eq("user_id", userId).maybeSingle();
    if (!goal) return NextResponse.json({ error: "That Help question is unavailable." }, { status: 404 });
    const helpPlan = await planContextualHelp({ question: help.question, goal: goal.title, path: pathTitle, quest: questTitle, objective });
    return NextResponse.json(helpPlan);
  } catch (error) {
    if (error instanceof ResearchError) {
      return NextResponse.json({ error: "Learning resources could not be searched. Please try again later." }, { status: 503 });
    }
    console.error("[help] Contextual answer request failed", { stage: "help_answer", userId });
    return NextResponse.json({ error: "A contextual answer could not be prepared. Please try again." }, { status: 502 });
  }
}
