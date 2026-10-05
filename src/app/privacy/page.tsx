"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function PrivacyPage() {
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
              ✦ ASCEND PRIVACY
            </span>
          </div>
          <Link
            href="/terms"
            className="text-xs font-bold text-[var(--color-ascend-coral)] hover:underline"
          >
            View Terms &amp; Conditions →
          </Link>
        </div>

        <div className="flex flex-col gap-2">
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-xs text-[var(--color-text-muted)] font-medium">
            Effective Date: Phase 2 (October 2026) · Product Privacy Architecture
          </p>
          <div className="p-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] leading-relaxed mt-2">
            <strong>Transparency Commitment:</strong> ASCEND is dedicated to honoring your privacy. This policy outlines what data is handled, where it is stored, and how our architecture protects player confidentiality.
          </div>
        </div>

        <div className="flex flex-col gap-6 text-xs sm:text-sm text-[var(--color-text-secondary)] leading-relaxed divide-y divide-[var(--color-border-subtle)]">
          {/* Section 1 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">1. Data Architecture: Account &amp; Goal Storage</h2>
            <p>
              Supabase Auth manages account credentials. ASCEND stores your player ID, display name, avatar, XP, tutorial status, and goals in Supabase. Row-level security restricts profile and goal access to the authenticated account owner. Paths and quests are not persisted as part of this release.
            </p>
          </section>

          {/* Section 2 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">2. Information We Handle</h2>
            <p>To deliver an adaptive RPG experience, ASCEND processes:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-[var(--color-text-secondary)]">
              <li><strong>Account Identifiers:</strong> Your chosen display username, optional email address, and 8-digit numeric Player ID.</li>
              <li><strong>Avatar Selection:</strong> Your chosen companion archetype and philosophy.</li>
              <li><strong>Campaign Data:</strong> Goals, generated progression paths, sub-quests, and milestone completion timestamps.</li>
              <li><strong>RPG Progression:</strong> Earned Experience Points (XP), current Level, unlocked Titles, and completed Achievements.</li>
              <li><strong>Client Preferences:</strong> Tutorial completion state and reduced-motion visual settings.</li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">3. How Your Information Is Used</h2>
            <p>
              Your data is utilized strictly to render your personalized World Map, calculate XP progression curves, update title unlocks, and guide your journey with Lara. We do not sell, rent, monetize, or broker player data to third-party advertisers.
            </p>
          </section>

          {/* Section 4 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">4. Account Data Security</h2>
            <p>
              Profile and goal records are accessed through the authenticated Supabase session and protected by Row-Level Security (RLS). Authentication credentials are managed by Supabase Auth.
            </p>
          </section>

          {/* Section 5 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">5. Player Rights &amp; Data Control</h2>
            <p>
              Your profile and goals are associated with your ASCEND account. The current Settings screen does not delete cloud account data; account deletion requests should be directed to the ASCEND team.
            </p>
          </section>

          {/* Section 6 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">6. Children&apos;s Privacy</h2>
            <p>
              ASCEND does not knowingly collect personal data from individuals under the age of 13. A parent or guardian who believes a child has provided identifying information may contact us for assistance.
            </p>
          </section>

          {/* Section 7 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">7. Security Safeguards</h2>
            <p>
              Row-Level Security restricts profile and goal access to the authenticated account owner. No service-role credential is exposed to the browser.
            </p>
          </section>

          {/* Section 8 */}
          <section className="flex flex-col gap-2 pt-4">
            <h2 className="text-base font-extrabold text-white">8. Policy Updates &amp; Contact</h2>
            <p>
              As ASCEND expands, this policy will reflect any technological enhancements. Direct any privacy inquiries or feedback to our team at{" "}
              <span className="text-[var(--color-text-primary)] font-mono">privacy@ascend.game</span>.
            </p>
          </section>
        </div>

        {/* Bottom Back Button */}
        <div className="pt-4 border-t border-[var(--color-border-subtle)] flex justify-end">
          <button
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-xs uppercase tracking-wider transition-all shadow"
          >
            I Acknowledge &amp; Return
          </button>
        </div>
      </div>
    </div>
  );
}
