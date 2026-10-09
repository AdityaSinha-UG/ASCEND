"use client";

import React from "react";
import Link from "next/link";
import { AscendLogo } from "@/components/ui/AscendLogo";

interface LegalModalProps {
  type: "terms" | "privacy" | null;
  onClose: () => void;
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null;

  const isTerms = type === "terms";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-modal-title"
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] bg-[var(--color-bg-surface)] border-2 border-[var(--color-ascend-gold)]/60 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-4 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <AscendLogo size={20} />
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-ascend-gold)]">
              ASCEND LEGAL
            </span>
            <h2 id="legal-modal-title" className="text-lg font-black text-white">
              {isTerms ? "Terms & Conditions" : "Privacy Policy"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-xs font-bold text-[var(--color-text-muted)] hover:text-white px-2 py-1 rounded-lg"
            aria-label="Close legal modal"
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Scrollable Document Content */}
        <div className="flex-1 overflow-y-auto pr-2 text-xs text-[var(--color-text-secondary)] leading-relaxed flex flex-col gap-4">
          {isTerms ? (
            <>
              <p className="text-[11px] italic text-[var(--color-text-muted)]">
                Summary of key provisions from the ASCEND Terms &amp; Conditions.
              </p>
              <div>
                <strong className="text-white block mb-0.5">1. Acceptance of Terms:</strong>
                By creating an account or playing ASCEND, you agree to these Terms. You use ASCEND for personal growth and agree to abide by community integrity standards.
              </div>
              <div>
                <strong className="text-white block mb-0.5">2. User-Generated Goals:</strong>
                You retain ownership of your goals and ambitions. You agree not to submit unlawful or abusive content.
              </div>
              <div>
                <strong className="text-white block mb-0.5">3. Game Progression &amp; XP:</strong>
                XP, Levels, and Titles are non-monetary virtual achievement markers designed for personal motivation.
              </div>
              <div>
                <strong className="text-white block mb-0.5">4. Disclaimers:</strong>
                ASCEND is an motivational Life RPG and does not provide formal medical, legal, or psychiatric counseling.
              </div>
              <div className="pt-2">
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-[var(--color-ascend-coral)] font-bold hover:underline"
                >
                  Open Full 15-Section Terms &amp; Conditions Page ↗
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-[11px] italic text-[var(--color-text-muted)]">
                Summary of key data protection practices from the ASCEND Privacy Policy.
              </p>
              <div>
                <strong className="text-white block mb-0.5">1. Account &amp; Goal Data:</strong>
                Supabase Auth manages your sign-in. Your player profile and goals are stored with your account and protected by row-level security.
              </div>
              <div>
                <strong className="text-white block mb-0.5">2. What We Process:</strong>
                Your chosen username, optional email, 8-digit numeric Player ID, and in-game RPG progression milestones.
              </div>
              <div>
                <strong className="text-white block mb-0.5">3. Player Rights &amp; Deletion:</strong>
                You can manage your profile and goals through ASCEND. Account deletion is handled through the account provider.
              </div>
              <div>
                <strong className="text-white block mb-0.5">4. No Third-Party Advertising:</strong>
                We never monetize or sell personal player data to external brokers.
              </div>
              <div className="pt-2">
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-[var(--color-ascend-coral)] font-bold hover:underline"
                >
                  Open Full Privacy Policy Page ↗
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[var(--color-border-subtle)] flex items-center justify-between">
          <span className="text-[10px] text-[var(--color-text-muted)]">
            Phase 2 Product Preview · Version 0.2.0
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white shadow"
          >
            Close &amp; Continue
          </button>
        </div>
      </div>
    </div>
  );
}
