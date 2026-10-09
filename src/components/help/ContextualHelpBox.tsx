"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { AscendLogo } from "@/components/ui/AscendLogo";

export interface ContextualHelpBoxProps {
  goalId?: string;
  pathId?: string;
  questId?: string;
  title?: string;
  className?: string;
}

interface HelpQuestion {
  id: string;
  question: string;
  sortOrder?: number;
}

interface HelpResponse {
  answer: string;
  resources: { title: string; url: string; source: string; snippet: string; kind: "video" | "website" }[];
}

const STORED_QUESTION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ContextualHelpBox({
  goalId,
  pathId,
  questId,
  className = "",
}: ContextualHelpBoxProps) {
  const [questions, setQuestions] = useState<HelpQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<HelpQuestion | null>(null);
  const [answer, setAnswer] = useState<HelpResponse | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(true);
  const [loadingAnswer, setLoadingAnswer] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch contextual questions from Supabase backend
  const fetchQuestions = useCallback(async () => {
    setLoadingQuestions(true);
    setError(null);

    try {
      const supabase = createClient();
      if (!questId && !pathId && !goalId) {
        setQuestions([]);
        setLoadingQuestions(false);
        return;
      }

      const loadStoredQuestions = async () => {
        let query = supabase.from("help_questions").select("id, question, sort_order").eq("is_active", true).order("sort_order", { ascending: true });
        if (questId) query = query.eq("quest_id", questId);
        else if (pathId) query = query.eq("path_id", pathId);
        else query = query.eq("goal_id", goalId!);
        return query;
      };

      let { data, error: dbError } = await loadStoredQuestions();
      if (dbError || !data?.length) {
        // Populate through the existing owner-checked RPC, then read the actual
        // UUID rows. Context is always resolved from Supabase relationships.
        let owningGoalId = goalId;
        if (!owningGoalId && pathId) {
          const { data: path } = await supabase.from("paths").select("goal_id").eq("id", pathId).maybeSingle();
          owningGoalId = path?.goal_id;
        }
        if (!owningGoalId && questId) {
          const { data: quest } = await supabase.from("quests").select("path_id").eq("id", questId).maybeSingle();
          if (quest?.path_id) {
            const { data: path } = await supabase.from("paths").select("goal_id").eq("id", quest.path_id).maybeSingle();
            owningGoalId = path?.goal_id;
          }
        }
        if (owningGoalId) {
          await supabase.rpc("refresh_goal_help_questions", { p_goal_id: owningGoalId });
          ({ data, error: dbError } = await loadStoredQuestions());
        }
      }

      if (dbError || !data) {
        setQuestions([]);
        setError("Guidance questions are currently unavailable.");
        return;
      }
      const storedQuestions = data.filter((item) => STORED_QUESTION_ID.test(item.id) && typeof item.question === "string");
      setQuestions(storedQuestions.map((item) => ({ id: item.id, question: item.question, sortOrder: item.sort_order })));
      if (storedQuestions.length === 0) setError("Guidance questions are currently unavailable.");
    } catch {
      setError("Guidance questions are currently unavailable.");
    } finally {
      setLoadingQuestions(false);
    }
  }, [goalId, pathId, questId]);

  useEffect(() => {
    setSelectedQuestion(null);
    setAnswer(null);
    void fetchQuestions();
  }, [fetchQuestions]);

  // Request answer for selected question from API
  const handleSelectQuestion = async (q: HelpQuestion) => {
    if (!STORED_QUESTION_ID.test(q.id)) {
      setError("This Help question is unavailable. Please reload and try again.");
      return;
    }
    setSelectedQuestion(q);
    setLoadingAnswer(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await fetch("/api/help/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "A contextual answer could not be prepared.");
      }

      const data = await res.json();
      setAnswer({
        answer: typeof data.answer === "string" ? data.answer : "No specific advice available for this step.",
        resources: Array.isArray(data.resources) ? data.resources.filter((item: unknown) => {
          if (!item || typeof item !== "object") return false;
          const url = (item as { url?: unknown }).url;
          return typeof url === "string" && /^https?:\/\//i.test(url);
        }) : [],
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not generate guidance. Please try again."
      );
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleBack = () => {
    setSelectedQuestion(null);
    setAnswer(null);
    setError(null);
  };

  return (
    <div
      className={`w-full rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] p-4 shadow-lg flex flex-col gap-3 transition-all ${className}`}
    >
      {/* ── Box Header ───────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-2.5">
        <div className="flex items-center gap-2">
          <AscendLogo size={16} />
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-ascend-gold)]">
            ASCEND Guidance
          </span>
        </div>
        {selectedQuestion && (
          <button
            type="button"
            onClick={handleBack}
            className="text-[10px] font-bold text-[var(--color-text-secondary)] hover:text-white transition-colors"
          >
            ← Back to Questions
          </button>
        )}
      </div>

      {/* ── Loading Initial Questions ────────────────────────────────────────── */}
      {loadingQuestions && (
        <div className="flex flex-col gap-2 py-2">
          <div className="h-3 w-32 bg-[var(--color-bg-surface)] rounded animate-pulse" />
          <div className="h-10 w-full bg-[var(--color-bg-surface)] rounded-xl animate-pulse" />
          <div className="h-10 w-full bg-[var(--color-bg-surface)] rounded-xl animate-pulse" />
        </div>
      )}

      {/* ── Question Selection View ──────────────────────────────────────────── */}
      {!loadingQuestions && !selectedQuestion && (
        <div className="flex flex-col gap-2.5">
          <span className="text-xs font-black text-white">
            Need help with this?
          </span>

          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}

          <div className="flex flex-col gap-1.5">
            {questions.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => handleSelectQuestion(q)}
                className="w-full text-left p-3 rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] border border-[var(--color-border-subtle)] hover:border-[var(--color-ascend-gold)]/40 text-xs font-semibold text-[var(--color-text-primary)] hover:text-white transition-all flex items-center justify-between gap-3 group active:scale-[0.99] cursor-pointer"
              >
                <span className="line-clamp-2">{q.question}</span>
                <span className="text-xs font-bold text-[var(--color-ascend-coral)] group-hover:translate-x-0.5 transition-transform shrink-0">
                  →
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Answer / Loading Answer View ─────────────────────────────────────── */}
      {selectedQuestion && (
        <div className="flex flex-col gap-3 animate-fadeIn">
          {/* Active Question Badge */}
          <div className="p-2.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
            <span className="text-[11px] font-bold text-white leading-snug">
              {selectedQuestion.question}
            </span>
          </div>

          {/* Loading Answer Skeleton */}
          {loadingAnswer && (
            <div className="flex flex-col gap-2 py-3">
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] font-medium">
                <span className="w-2 h-2 rounded-full bg-[var(--color-ascend-gold)] animate-ping" />
                <span>Formulating guidance...</span>
              </div>
              <div className="h-2.5 w-full bg-[var(--color-bg-surface)] rounded animate-pulse" />
              <div className="h-2.5 w-4/5 bg-[var(--color-bg-surface)] rounded animate-pulse" />
              <div className="h-2.5 w-2/3 bg-[var(--color-bg-surface)] rounded animate-pulse" />
            </div>
          )}

          {/* Answer Display */}
          {!loadingAnswer && answer && (
            <div className="flex flex-col gap-3">
              <div className="p-3.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] leading-relaxed font-normal whitespace-pre-line">
                {answer.answer}
              </div>
              {answer.resources.length > 0 && (
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-[var(--color-ascend-gold)]">Research-backed resources</span>
                  {answer.resources.map((resource) => (
                    <a key={resource.url} href={resource.url} target="_blank" rel="noopener noreferrer" className="rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] p-3 hover:border-[var(--color-ascend-gold)]/50">
                      <span className="block text-xs font-bold text-white">{resource.kind === "video" ? "▶ Video · " : "↗ Website · "}{resource.title}</span>
                      <span className="block mt-1 text-[10px] text-[var(--color-text-muted)]">{resource.source}</span>
                      <span className="block mt-1 text-[11px] text-[var(--color-text-secondary)]">{resource.snippet}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {!loadingAnswer && error && (
            <div className="p-3 rounded-xl bg-red-950/30 border border-red-800/40 text-xs text-red-300 flex flex-col gap-2">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => handleSelectQuestion(selectedQuestion)}
                className="self-start text-[10px] font-bold text-[var(--color-ascend-gold)] hover:underline"
              >
                Retry
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
