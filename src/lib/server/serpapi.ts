import "server-only";

const MAX_QUERY_LENGTH = 200;
const MAX_RESULTS = 5;
const FIELD_LENGTH = 500;

export type ResearchResult = {
  title: string;
  url: string;
  snippet: string;
  source: string;
};

export type ResearchResponse = {
  query: string;
  results: ResearchResult[];
};

export class ResearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResearchError";
  }
}

export function validateSearchQuery(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const query = value.trim();
  if (query.length < 2 || query.length > MAX_QUERY_LENGTH) return null;
  if (/[\u0000-\u001f\u007f]/.test(query)) return null;
  return query;
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim().slice(0, FIELD_LENGTH) : "";
}

function toResearchResult(value: unknown): ResearchResult | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const title = cleanText(row.title);
  const snippet = cleanText(row.snippet ?? row.description);
  const rawUrl = cleanText(row.link);
  if (!title || !snippet || !rawUrl) return null;

  try {
    const url = new URL(rawUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return { title, url: url.toString(), snippet, source: url.hostname };
  } catch {
    return null;
  }
}

export async function searchWeb(queryValue: unknown): Promise<ResearchResponse> {
  const query = validateSearchQuery(queryValue);
  if (!query) throw new ResearchError("Enter a valid search query (2–200 characters).");

  const apiKey = process.env.SERPAPI_API_KEY;
  if (!apiKey) throw new ResearchError("Web research is not configured on the server.");

  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", apiKey);

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(10_000), cache: "no-store" });
  } catch {
    throw new ResearchError("Web research is temporarily unavailable.");
  }

  if (!response.ok) throw new ResearchError("Web research provider returned an error.");

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ResearchError("Web research provider returned an invalid response.");
  }

  if (!payload || typeof payload !== "object") {
    throw new ResearchError("Web research provider returned an invalid response.");
  }

  const providerPayload = payload as Record<string, unknown>;
  if (typeof providerPayload.error === "string") {
    throw new ResearchError("Web research provider returned an error.");
  }

  const organicResults = providerPayload.organic_results;
  const results = Array.isArray(organicResults)
    ? organicResults
        .map(toResearchResult)
        .filter((result): result is ResearchResult => result !== null)
        .slice(0, MAX_RESULTS)
    : [];

  return { query, results };
}
