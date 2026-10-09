"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGame } from "@/store/gameContext";
import { SystemIcon, AscendLogo } from "@/components/ui/AscendIcon";
import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const { player, setUsername, replayTutorial, resetProgress } = useGame();

  const [nameInput, setNameInput] = useState(player.username || "Player");
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameSavedNotice, setNameSavedNotice] = useState(false);

  const [reducedMotion, setReducedMotion] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [settingsError, setSettingsError] = useState<string>("");
  const [isResetting, setIsResetting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Check initial user preference for reduced motion
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReducedMotion(prefersReduced);
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    const saved = await setUsername(nameInput.trim());
    if (!saved) return;
    setIsEditingName(false);
    setNameSavedNotice(true);
    setTimeout(() => setNameSavedNotice(false), 2500);
  };

  const handleReplayLara = async () => {
    const saved = await replayTutorial();
    if (!saved) return;
    router.push("/world");
  };

  const handleSignOut = async () => {
    setSettingsError("");
    const { error } = await createClient().auth.signOut();
    if (error) {
      setSettingsError(error.message);
      return;
    }
    router.replace("/auth");
  };

  const handleConfirmReset = async () => {
    setSettingsError("");
    setIsResetting(true);
    try {
      await resetProgress();
      setShowResetModal(false);
      router.replace("/onboarding?stage=goal");
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Your ASCEND progress could not be reset. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;
    setSettingsError("");
    setIsDeleting(true);
    const supabase = createClient();
    try {
      const { error } = await supabase.rpc("delete_my_account");
      if (error) throw new Error("Your account could not be deleted. Please try again or contact support.");
      // The database has deleted this authenticated user's Auth row and all
      // cascaded ASCEND data. Clear only this browser's now-invalid session.
      await supabase.auth.signOut({ scope: "local" });
      router.replace("/auth");
      router.refresh();
    } catch (error) {
      setSettingsError(error instanceof Error ? error.message : "Your account could not be deleted. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 flex flex-col gap-6 animate-fadeIn pb-20">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <SystemIcon name="location" size={20} />
          <h1 className="text-2xl sm:text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
            Settings &amp; Preferences
          </h1>
        </div>
        <p className="text-xs text-[var(--color-text-secondary)]">
          Manage your account, visual preferences, and ASCEND game data.
        </p>
      </div>

      {/* ── 1. ACCOUNT SECTION ─────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-[var(--color-border-subtle)] pb-3">
          <h2 className="text-sm font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider flex items-center gap-2">
            <span>👤</span> Account Information
          </h2>
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
            ID: #{player.playerId}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          {/* Username row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Player Display Name</span>
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                The name visible across your character sheet and campaigns.
              </span>
            </div>

            {!isEditingName ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-white px-2.5 py-1 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
                  {player.username}
                </span>
                <button
                  onClick={() => setIsEditingName(true)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface)] hover:bg-[var(--color-bg-hover)] text-xs font-bold text-[var(--color-ascend-gold)] border border-[var(--color-border-subtle)] transition-colors"
                >
                  Edit
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-ascend-gold)] text-xs text-white focus:outline-none"
                  autoFocus
                  required
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-ascend-coral)] text-white text-xs font-bold"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setNameInput(player.username);
                    setIsEditingName(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[var(--color-bg-surface)] text-gray-400 text-xs font-bold"
                >
                  Cancel
                </button>
              </form>
            )}
          </div>

          {nameSavedNotice && (
            <span className="text-xs text-emerald-400 font-bold px-2 animate-fadeIn">
              ✓ Username updated successfully.
            </span>
          )}
          {settingsError && (
            <span className="text-xs text-[var(--color-ascend-coral)] font-semibold px-2">
              {settingsError}
            </span>
          )}

          {/* Email row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Registered Email</span>
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                Associated login address for authentication.
              </span>
            </div>
            <span className="text-xs font-mono text-[var(--color-text-muted)] px-2.5 py-1 rounded bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)]">
              {player.email || "No email available"}
            </span>
          </div>

          {/* Sign Out row */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-[var(--color-text-muted)]">
              End your active session and return to the login portal.
            </span>
            <button
              onClick={handleSignOut}
              className="px-4 py-2 rounded-xl bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] text-xs font-bold text-[var(--color-text-secondary)] hover:text-white border border-[var(--color-border-subtle)] transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* ── 2. APPEARANCE ──────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl flex flex-col gap-4">
        <h2 className="text-sm font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-3">
          <span>🎨</span> Appearance &amp; Accessibility
        </h2>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Theme Palette</span>
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                Default Dark Charcoal &amp; Crimson Atmosphere
              </span>
            </div>
            <span className="px-3 py-1 rounded-xl bg-[var(--color-bg-surface)] border border-[var(--color-border-subtle)] text-[11px] font-extrabold text-[var(--color-ascend-gold)]">
              Dark RPG
            </span>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Reduced Motion</span>
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                Minimizes continuous glowing animations and pulse transitions.
              </span>
            </div>
            <input
              type="checkbox"
              id="reduced-motion-toggle"
              checked={reducedMotion}
              onChange={(e) => setReducedMotion(e.target.checked)}
              className="w-4 h-4 rounded accent-[var(--color-ascend-coral)] cursor-pointer"
              aria-label="Toggle reduced motion preference"
            />
          </div>
        </div>
      </div>

      {/* ── 3. GAME EXPERIENCE (LARA GUIDE) ────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl flex flex-col gap-4">
        <h2 className="text-sm font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-3">
          <span>🧭</span> Game Experience &amp; Tutorial
        </h2>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white">Lara Interactive In-App Guide</span>
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded ${
                  player.tutorialCompleted
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "bg-[var(--color-ascend-gold)]/20 text-[var(--color-ascend-gold)]"
                }`}
              >
                {player.tutorialCompleted ? "COMPLETED" : "IN PROGRESS"}
              </span>
            </div>
            <span className="text-[11px] text-[var(--color-text-secondary)]">
              Restart Lara&apos;s interactive guidance walkthrough across your live World and Paths.
            </span>
          </div>

          <button
            onClick={handleReplayLara}
            className="px-4 py-2 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-xs uppercase tracking-wider transition-all shadow shrink-0"
          >
            Replay Lara Guide 🚀
          </button>
        </div>
      </div>

      {/* ── 4. PRIVACY & DATA ARCHITECTURE ─────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl flex flex-col gap-4">
        <h2 className="text-sm font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-3">
          <span>📜</span> Legal &amp; Data Transparency
        </h2>

        <div className="p-3.5 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs text-[var(--color-text-secondary)] leading-relaxed">
          <strong className="text-white block mb-1">Player &amp; Goal Data:</strong>
          Your player profile and goals are stored in your ASCEND account and loaded after sign-in. Authentication and database access are protected by your Supabase session and row-level security.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/terms"
            className="p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-ascend-coral)] transition-colors flex items-center justify-between"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Terms &amp; Conditions</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Review player rules &amp; service terms
              </span>
            </div>
            <span className="text-xs text-[var(--color-ascend-coral)] font-bold">Read →</span>
          </Link>

          <Link
            href="/privacy"
            className="p-4 rounded-2xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] hover:border-[var(--color-ascend-gold)] transition-colors flex items-center justify-between"
          >
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-white">Privacy Policy</span>
              <span className="text-[10px] text-[var(--color-text-muted)]">
                Transparent data handling practices
              </span>
            </div>
            <span className="text-xs text-[var(--color-ascend-gold)] font-bold">Read →</span>
          </Link>
        </div>
      </div>

      {/* ── 5. ABOUT ASCEND ────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] shadow-xl flex flex-col gap-3">
        <h2 className="text-sm font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider flex items-center gap-2 border-b border-[var(--color-border-subtle)] pb-3">
          <AscendLogo size={20} /> About ASCEND
        </h2>

        <div className="flex flex-col gap-1.5 text-xs text-[var(--color-text-secondary)] leading-relaxed">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-white">Version:</span>
            <span className="px-2 py-0.5 rounded bg-[var(--color-bg-elevated)] text-[var(--color-ascend-gold)] font-mono font-bold text-[10px]">
              v0.2.0 (Phase 2 Master Release)
            </span>
          </div>
          <p className="pt-1">
            ASCEND is an AI-powered Life RPG designed to transform real-life ambitions into structured, motivating campaigns. Turn your goals into quests. Level yourself up.
          </p>
        </div>
      </div>

      {/* ── 6. DANGER ZONE ─────────────────────────────────────────────────────── */}
      <div className="p-6 rounded-3xl bg-red-950/20 border-2 border-red-900/40 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-red-900/30 pb-3">
          <h2 className="text-sm font-extrabold text-red-400 uppercase tracking-wider flex items-center gap-2">
            <span>⚠️</span> Danger Zone
          </h2>
          <span className="text-[10px] text-red-400 font-bold uppercase">Irreversible</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-white">Reset ASCEND Progress</span>
            <span className="text-[11px] text-red-300/70">
              Deletes your Goals and their Paths, Quests, and guidance. Resets XP and tutorial progress while keeping your account, Player ID, username, and avatar.
            </span>
          </div>

          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2.5 rounded-xl font-bold bg-red-600/30 hover:bg-red-600 text-red-200 hover:text-white border border-red-500/40 text-xs uppercase tracking-wider transition-all shrink-0 cursor-pointer"
          >
            Reset Progress
          </button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-red-900/30 pt-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-bold text-white">Delete Account</span>
            <span className="text-[11px] text-red-300/70">
              Permanently deletes your ASCEND profile, Player ID, goals, campaigns, stats, and Supabase account. This cannot be undone.
            </span>
          </div>
          <button
            onClick={() => { setSettingsError(""); setDeleteConfirmation(""); setShowDeleteModal(true); }}
            className="px-4 py-2.5 rounded-xl font-bold bg-red-800 hover:bg-red-700 text-white border border-red-500/60 text-xs uppercase tracking-wider transition-all shrink-0"
          >
            Delete Account
          </button>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => setShowResetModal(false)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg-surface)] border-2 border-red-600 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-950/60 border border-red-600/60 flex items-center justify-center mx-auto text-xl">
              ⚠️
            </div>
            <h3 className="text-lg font-black text-white">
              Reset All Progress?
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
              Your Goals, Paths, Quests, and related guidance will be deleted, and XP and tutorial progress will reset. Your account, Player ID, username, and avatar will remain.
            </p>
            {settingsError && <p role="alert" className="text-xs text-red-300">{settingsError}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white text-xs uppercase tracking-wider transition-all"
              >
                {isResetting ? "Resetting…" : "Yes, Reset Everything"}
              </button>
              <button
                onClick={() => setShowResetModal(false)}
                disabled={isResetting}
                className="flex-1 py-3 rounded-xl font-bold bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] text-white text-xs uppercase tracking-wider transition-all border border-[var(--color-border-subtle)]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn" onClick={() => !isDeleting && setShowDeleteModal(false)}>
          <div className="w-full max-w-md bg-[var(--color-bg-surface)] border-2 border-red-500 rounded-3xl p-6 shadow-2xl flex flex-col gap-4" onClick={(event) => event.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-950/70 border border-red-500/70 flex items-center justify-center mx-auto text-xl">⚠️</div>
            <h3 className="text-lg font-black text-white text-center">Permanently Delete Account?</h3>
            <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed text-center">
              This permanently removes your ASCEND account and all associated data, including your Player ID, profile, goals, Paths, Quests, XP, and stats. You will be signed out. This action cannot be undone.
            </p>
            <label htmlFor="delete-account-confirmation" className="text-xs font-bold text-red-200">Type DELETE to confirm</label>
            <input id="delete-account-confirmation" value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" className="w-full px-3 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-red-500/50 text-sm text-white focus:outline-none focus:border-red-400" />
            {settingsError && <p role="alert" className="text-xs text-red-300">{settingsError}</p>}
            <div className="flex items-center gap-3 pt-1">
              <button onClick={() => void handleDeleteAccount()} disabled={isDeleting || deleteConfirmation !== "DELETE"} className="flex-1 py-3 rounded-xl font-bold bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs uppercase tracking-wider transition-all">
                {isDeleting ? "Deleting…" : "Permanently Delete"}
              </button>
              <button onClick={() => setShowDeleteModal(false)} disabled={isDeleting} className="flex-1 py-3 rounded-xl font-bold bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] text-white text-xs uppercase tracking-wider transition-all border border-[var(--color-border-subtle)]">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
