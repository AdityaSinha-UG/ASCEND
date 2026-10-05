import "server-only";
import { searchWeb, type ResearchResult } from "./serpapi";

export type HelpResource = { title: string; url: string; source: string; snippet: string; kind: "video" | "website" };
export type HelpPlan = { answer: string; resources: HelpResource[] };

function clipSentence(value: string, limit: number): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  const sentence = clean.slice(0, limit).replace(/\s+\S*$/, "").trim();
  return sentence.length >= 40 ? `${sentence}…` : `${clean.slice(0, limit - 1).trimEnd()}…`;
}

function isVideo(result: ResearchResult): boolean {
  try {
    const host = new URL(result.url).hostname.toLowerCase();
    return host === "youtube.com" || host.endsWith(".youtube.com") || host === "youtu.be";
  } catch { return false; }
}

function uniqueResources(results: ResearchResult[]): HelpResource[] {
  const seen = new Set<string>();
  const resources: HelpResource[] = [];
  for (const result of results) {
    try {
      const url = new URL(result.url);
      if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) continue;
      const key = url.origin + url.pathname;
      if (seen.has(key)) continue;
      seen.add(key);
      resources.push({
        title: clipSentence(result.title, 120),
        url: url.toString(),
        source: result.source,
        snippet: clipSentence(result.snippet, 220),
        kind: isVideo(result) ? "video" : "website",
      });
      if (resources.length >= 5) break;
    } catch { /* Invalid URLs are excluded. */ }
  }
  return resources;
}

/** Research-backed, deterministic help. Resource links always come from SerpApi results. */
export async function planContextualHelp(input: {
  question: string;
  goal: string;
  path?: string;
  quest?: string;
  objective?: string;
}): Promise<HelpPlan> {
  const context = input.quest ?? input.path ?? input.goal;
  const focus = `${context} ${input.objective ?? ""}`.slice(0, 65);
  const query = `${input.question.slice(0, 100)} ${focus} learning resources tutorial video`.slice(0, 190);
  const { results } = await searchWeb(query);
  const resources = uniqueResources(results);
  if (!resources.length) {
    return { answer: "I couldn't find a useful, verified resource for this question right now. Try again later or use the Quest objective as your next step.", resources: [] };
  }
  const primary = resources[0];
  const answer = `${primary.title}${primary.snippet ? `: ${primary.snippet}` : ""} This resource is relevant to ${context}.`;
  return { answer: clipSentence(answer, 480), resources };
}
