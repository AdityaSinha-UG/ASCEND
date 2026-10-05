export type CampaignStage =
  | "goal_understood"
  | "timeframe_required"
  | "timeframe_confirmed"
  | "research_started"
  | "research_completed"
  | "ai_generation_started"
  | "campaign_validated"
  | "persistence_started"
  | "campaign_ready";

export type CampaignGenerationFailure = "research" | "generation" | "persistence";

export const CAMPAIGN_STAGE_LABELS: Array<{ id: CampaignStage; label: string }> = [
  { id: "goal_understood", label: "Understanding your goal" },
  { id: "timeframe_required", label: "Choose a timeframe" },
  { id: "timeframe_confirmed", label: "Timeframe confirmed" },
  { id: "research_started", label: "Researching with SerpApi" },
  { id: "research_completed", label: "Research complete" },
  { id: "ai_generation_started", label: "ASCEND Companion is building your campaign" },
  { id: "campaign_validated", label: "Validating Paths and Quests" },
  { id: "persistence_started", label: "Saving your campaign" },
  { id: "campaign_ready", label: "World ready" },
];

export async function generateCampaign(goalId: string, onStage: (stage: CampaignStage) => void, timeframeText?: string) {
  const response = await fetch("/api/campaign/generate", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "text/event-stream" },
    body: JSON.stringify({ goalId, ...(timeframeText?.trim() ? { timeframeText: timeframeText.trim() } : {}) }),
  });
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => null) as { error?: unknown } | null;
    throw new Error(typeof body?.error === "string" ? body.error : "Campaign generation failed.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let failure: CampaignGenerationFailure | null = null;
  let failureMessage = "Campaign generation failed.";
  let ready = false;
  let needsTimeframe = false;
  let timeframeMessage = "How much time do you want to give yourself to achieve this goal?";

  const processFrame = (frame: string) => {
    const lines = frame.split(/\r?\n/);
    const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
    const dataLine = lines.find((line) => line.startsWith("data:"))?.slice(5).trim();
    if (!event) return;
    if (event === "campaign_failed") {
      const data = dataLine ? JSON.parse(dataLine) as { stage?: unknown; message?: unknown } : {};
      failure = data.stage === "research" || data.stage === "persistence" ? data.stage : "generation";
      failureMessage = typeof data.message === "string" ? data.message : "Campaign generation failed.";
      return;
    }
    if (event === "timeframe_required") {
      const data = dataLine ? JSON.parse(dataLine) as { message?: unknown } : {};
      needsTimeframe = true;
      timeframeMessage = typeof data.message === "string" ? data.message : timeframeMessage;
      onStage("timeframe_required");
      return;
    }
    if (CAMPAIGN_STAGE_LABELS.some((stage) => stage.id === event)) {
      const stage = event as CampaignStage;
      onStage(stage);
      if (stage === "campaign_ready") ready = true;
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const frames = buffer.split(/\r?\n\r?\n/);
    buffer = frames.pop() ?? "";
    for (const frame of frames) processFrame(frame);
    if (done) break;
  }
  if (buffer.trim()) processFrame(buffer);
  if (failure) throw Object.assign(new Error(failureMessage), { stage: failure });
  if (needsTimeframe) throw Object.assign(new Error(timeframeMessage), { stage: "timeframe_required" });
  if (!ready) throw new Error("Campaign generation ended before the World was ready.");
}
