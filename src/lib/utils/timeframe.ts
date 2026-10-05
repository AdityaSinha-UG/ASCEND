export type TimeframeUnit = "days" | "weeks" | "months" | "years";
export type TimeframeContext = "preparation" | "learning" | "development" | "habit" | "goal";

export type Timeframe = {
  value: number;
  unit: TimeframeUnit;
  context: TimeframeContext;
};

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10, twelve: 12,
};

function numberValue(value: string): number | null {
  return /^\d{1,4}$/.test(value) ? Number(value) : NUMBER_WORDS[value.toLowerCase()] ?? null;
}

export function inferTimeframeContext(goal: string): TimeframeContext {
  const normalized = goal.toLowerCase();
  if (/\b(prepare|preparing|preparation|get ready)\b/.test(normalized)) return "preparation";
  if (/\b(learn|learning|study|studying|master|practice|practise)\b/.test(normalized)) return "learning";
  if (/\b(routine|habit|consistent|consistency)\b/.test(normalized)) return "habit";
  if (/\b(become|career|developer|profession|job|launch|build)\b/.test(normalized)) return "development";
  return "goal";
}

/** Extract an explicitly stated duration; missing durations are never inferred. */
export function parseTimeframe(text: string, goalContext = text): Timeframe | null {
  const match = text.match(/\b(\d{1,4}|a|an|one|two|three|four|five|six|seven|eight|nine|ten|twelve)\s*(days?|weeks?|months?|years?)\b/i);
  const yearMatch = match ?? text.match(/\b(a|an|one)\s+(day|week|month|year)\b/i);
  if (!yearMatch) return null;
  const value = numberValue(yearMatch[1]);
  const rawUnit = yearMatch[2].toLowerCase().replace(/s$/, "");
  if (!value || value < 1 || value > 3650 || !["day", "week", "month", "year"].includes(rawUnit)) return null;
  const unit = `${rawUnit}s` as TimeframeUnit;
  if ((unit === "days" && value > 1095) || (unit === "weeks" && value > 520) || (unit === "months" && value > 120) || (unit === "years" && value > 10)) return null;
  return { value, unit, context: inferTimeframeContext(goalContext) };
}

export function timeframeLabel(timeframe: Pick<Timeframe, "value" | "unit">): string {
  return `${timeframe.value} ${timeframe.unit.replace(/s$/, "")}${timeframe.value === 1 ? "" : "s"}`;
}
