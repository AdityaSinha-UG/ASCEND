"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-start p-4 sm:p-8 text-[var(--color-text-primary)]">
      <div className="w-full max-w-4xl bg-[var(--color-bg-surface)]/95 border border-[var(--color-border-default)] rounded-3xl p-6 sm:p-10 shadow-2xl backdrop-blur-md flex flex-col gap-6">
        {/* Navigation / Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="px-3.5 py-1.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs font-bold text-[var(--color-text-secondary)] hover:text-white transition-colors"
            >
              ← Back
            </button>
            <span className="text-xs font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider">
              ✦ ASCEND LEGAL
            </span>
          </div>
          <Link
            href="/privacy"
            className="text-xs font-bold text-[var(--color-ascend-coral)] hover:underline"
          >
            View Privacy Policy →
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Terms &amp; Conditions
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] font-medium">
            Last Updated: Phase 2 (October 2026) · Product Terms Preview
          </p>
          <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] leading-relaxed mt-2">
            <strong>Important Notice:</strong> These Terms &amp; Conditions constitute a structured product agreement designed for the ASCEND Life RPG application. This document outlines player expectations, account usage, and progression principles for Phase 2 and is subject to formal legal review prior to commercial distribution.
          </div>
        </div>

        <div className="flex flex-col gap-6 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed divide-y divide-[var(--color-border-subtle)]">
          {/* Section 1 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">1. Acceptance of Terms</h2>
            <p>
              By accessing, registering for, or using ASCEND (&quot;the Service&quot;), you acknowledge that you have read, understood, and agree to be bound by these Terms &amp; Conditions. If you do not agree with any part of these Terms, you may not use the Service.
            </p>
          </section>

          {/* Section 2 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">2. Account Registration</h2>
            <p>
              To participate in ASCEND progression, players must register an account by providing accurate and truthful information, including a username and email address. You are responsible for safeguarding your credentials and for all activities that occur under your account.
            </p>
          </section>

          {/* Section 3 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">3. User Responsibilities</h2>
            <p>
              You agree to use ASCEND solely for personal, non-commercial self-improvement and life progression purposes. You must not attempt to compromise application security, reverse engineer game mechanics, or disrupt the experience of other ascendants.
            </p>
          </section>

          {/* Section 4 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">4. User-Generated Goals and Content</h2>
            <p>
              ASCEND allows you to input real-life ambitions, customized paths, notes, and milestones (&quot;Goals&quot;). You retain ownership of your personal goals. However, you agree not to submit content that is illegal, defamatory, promotes self-harm, or violates third-party rights.
            </p>
          </section>

          {/* Section 5 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">5. Player Profiles</h2>
            <p>
              Your player profile displays your chosen avatar identity, earned titles, XP level, and campaign progress. Profiles represent personal in-game identity and must comply with community safety standards.
            </p>
          </section>

          {/* Section 6 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">6. Player IDs</h2>
            <p>
              Every player is assigned a unique 8-digit numeric Player ID. ASCEND stores this ID in the player profile associated with your Supabase Auth account.
            </p>
          </section>

          {/* Section 7 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">7. Game Progression and XP</h2>
            <p>
              Experience Points (XP), Levels, Titles, and Achievements are virtual incentives awarded for completing real-life milestones. They carry no real-world monetary value, cannot be redeemed for fiat currency, and are non-transferable between accounts.
            </p>
          </section>

          {/* Section 8 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">8. Appropriate Use</h2>
            <p>
              ASCEND is designed to support positive habit formation and goal tracking. The application does not provide certified medical, psychiatric, financial, or legal advice. Real-life actions and risks remain the sole responsibility of the player.
            </p>
          </section>

          {/* Section 9 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">9. Intellectual Property</h2>
            <p>
              All ASCEND game designs, character artwork (including Lara and Companion Avatars), progression algorithms, user interface systems, and trademarks are the proprietary intellectual property of the ASCEND team and its creators.
            </p>
          </section>

          {/* Section 10 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">10. Service Changes</h2>
            <p>
              As ASCEND evolves from Phase 2 to future versions, game balancing, quest generation formulas, milestone thresholds, and feature sets may be enhanced, tuned, or updated without prior notice.
            </p>
          </section>

          {/* Section 11 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">11. Account Suspension and Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that breach these Terms, engage in abuse, or threaten the integrity of the application. Contact the ASCEND team for account data deletion requests.
            </p>
          </section>

          {/* Section 12 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">12. Privacy Reference</h2>
            <p>
              Your privacy is vital to us. Our data handling, storage practices, and player protections are described in detail in the{" "}
              <Link href="/privacy" className="text-[var(--color-ascend-gold)] underline font-bold">
                ASCEND Privacy Policy
              </Link>
              .
            </p>
          </section>

          {/* Section 13 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">13. Disclaimers and Limitations</h2>
            <p>
              ASCEND is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot; basis without warranties of any kind. Under no circumstances shall ASCEND or its developers be held liable for indirect, incidental, or consequential damages resulting from your use of the application.
            </p>
          </section>

          {/* Section 14 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">14. Contact Information</h2>
            <p>
              For legal inquiries, feedback, or support regarding these Terms, contact our team at{" "}
              <span className="text-[var(--color-text-primary)] font-mono">support@ascend.game</span>.
            </p>
          </section>

          {/* Section 15 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">15. Changes to Terms</h2>
            <p>
              We may revise these Terms as ASCEND expands. Continued use of the application following published revisions confirms your acceptance of the updated Terms.
            </p>
          </section>
        </div>

        {/* Bottom Back Button */}
        <div className="pt-4 border-t border-[var(--color-border-subtle)] flex justify-end">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-xs uppercase tracking-wider transition-all shadow"
          >
            I Understand &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
}
