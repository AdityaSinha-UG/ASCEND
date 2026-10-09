"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LegalModal } from "@/components/legal/LegalModal";
import { createClient } from "@/lib/supabase/client";
import { AscendLogo } from "@/components/ui/AscendLogo";

export function AuthScreen() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  
  // Sign In fields
  const [emailOrUser, setEmailOrUser] = useState<string>("");
  
  // Sign Up fields
  const [signupName, setSignupName] = useState<string>("");
  const [signupEmail, setSignupEmail] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);

  // Common fields
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [notice, setNotice] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");

    if (mode === "signup") {
      if (!signupName.trim()) {
        setError("Please enter your name.");
        return;
      }
      if (!signupEmail.trim() || !signupEmail.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }
      if (password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!agreedToTerms) {
        setError("You must agree to the Terms & Conditions and Privacy Policy to continue.");
        return;
      }

      setIsSubmitting(true);
      try {
        const supabase = createClient();
        const origin =
          typeof window !== "undefined" && window.location.origin
            ? window.location.origin
            : process.env.NEXT_PUBLIC_SITE_URL ?? "";
        const emailRedirectTo = origin
          ? `${origin}/auth/callback?next=/onboarding`
          : undefined;
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: signupEmail.trim(),
          password,
          options: {
            emailRedirectTo,
            data: { username: signupName.trim() },
          },
        });

        if (signUpError) {
          setError(signUpError.message);
          return;
        }

        if (!data.user) {
          setError("Account creation did not return a user. Please try again.");
          return;
        }

        if (!data.session) {
          setNotice("Check your email for a confirmation link. You can sign in after confirming your account.");
          return;
        }

        router.replace("/onboarding");
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "We could not create your account. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      if (!emailOrUser.trim()) {
        setError("Please enter your email address.");
        return;
      }
      if (!emailOrUser.includes("@")) {
        setError("Please enter a valid email address.");
        return;
      }

      setIsSubmitting(true);
      try {
        const supabase = createClient();
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: emailOrUser.trim(),
          password,
        });

        if (signInError) {
          setError(signInError.message);
          return;
        }

        router.replace("/onboarding");
      } catch (authError) {
        setError(authError instanceof Error ? authError.message : "We could not sign you in. Please try again.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-dvh w-full flex flex-col items-center justify-center p-4 relative overflow-hidden bg-transparent text-[var(--color-text-primary)]">
      {/* Environmental Artwork Background Overlay */}
      <div className="absolute inset-0 bg-cover bg-center opacity-25 pointer-events-none mix-blend-luminosity bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[var(--color-ascend-gold)]/20 via-[var(--color-bg-base)] to-[var(--color-bg-base)]" />
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[var(--color-ascend-coral)]/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[var(--color-ascend-gold)]/15 blur-3xl pointer-events-none" />

      {/* Auth Card Container */}
      <div className="w-full max-w-md bg-[var(--color-bg-surface)]/95 backdrop-blur-xl border border-[var(--color-border-default)] rounded-3xl p-6 sm:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex flex-col gap-6 relative z-10 animate-fadeIn">
        {/* ASCEND Logo & Branding */}
        <div className="flex flex-col items-center text-center gap-2">
          <AscendLogo size={72} priority className="mb-1" />
          <h1 className="text-3xl font-black text-[var(--color-text-primary)] tracking-tight">
            ASCEND
          </h1>
          <p className="text-xs text-[var(--color-text-secondary)] font-medium tracking-wide">
            Your Real Life, A Greater Story...
          </p>
        </div>

        {/* Toggle Tabs: Sign In / Sign Up */}
        <div className="flex items-center p-1 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)]">
          <button
            type="button"
            onClick={() => { setMode("signin"); setError(""); setNotice(""); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "signin"
                ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] shadow"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode("signup"); setError(""); setNotice(""); }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
              mode === "signup"
                ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)] shadow"
                : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {mode === "signup" ? (
            <>
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Full Name
                </label>
                <input
                  type="text"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  placeholder="e.g. Alex Hunter"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs sm:text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] transition-colors"
                  required
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs sm:text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] transition-colors"
                  required
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Password
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create password (min. 6 characters)..."
                    className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs sm:text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] transition-colors pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs sm:text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] transition-colors"
                  required
                />
              </div>

              {/* Required Terms & Conditions Checkbox */}
              <div className="flex items-start gap-2.5 pt-1.5">
                <input
                  type="checkbox"
                  id="legal-agreement"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-[var(--color-ascend-coral)] cursor-pointer focus:ring-2 focus:ring-[var(--color-ascend-gold)] shrink-0"
                  required
                />
                <label htmlFor="legal-agreement" className="text-xs text-[var(--color-text-secondary)] leading-tight select-none">
                  I agree to the{" "}
                  <button
                    type="button"
                    onClick={() => setLegalModal("terms")}
                    className="text-[var(--color-ascend-gold)] font-bold hover:underline inline cursor-pointer"
                  >
                    Terms &amp; Conditions
                  </button>{" "}
                  and acknowledge the{" "}
                  <button
                    type="button"
                    onClick={() => setLegalModal("privacy")}
                    className="text-[var(--color-ascend-gold)] font-bold hover:underline inline cursor-pointer"
                  >
                    Privacy Policy
                  </button>
                  .
                </label>
              </div>
            </>
          ) : (
            <>
              {/* Sign In Fields */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)]">
                  Email Address
                </label>
                <input
                  type="email"
                  value={emailOrUser}
                  onChange={(e) => setEmailOrUser(e.target.value)}
                  placeholder="Enter your email address..."
                  className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] transition-colors"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-[var(--color-text-secondary)] flex justify-between">
                  <span>Password</span>
                  <span className="text-[11px] text-[var(--color-ascend-coral)] cursor-pointer hover:underline">
                    Forgot?
                  </span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full px-4 py-3 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-sm text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-ascend-coral)] transition-colors pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>
            </>
          )}

          {error && (
            <span className="text-xs font-semibold text-[var(--color-ascend-coral)] animate-pulse">
              {error}
            </span>
          )}
          {notice && (
            <span className="text-xs font-semibold text-[var(--color-text-secondary)]">
              {notice}
            </span>
          )}

          {/* Primary Action Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-sm tracking-wide shadow-lg transition-all transform hover:scale-[1.01] mt-2 uppercase cursor-pointer"
          >
            {isSubmitting
              ? mode === "signin" ? "Signing In..." : "Creating Account..."
              : mode === "signin" ? "Sign In" : "Agree & Create Account"}
          </button>
        </form>

        {/* Legal Modal Popup */}
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />

        {/* Social Login Options */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <span className="text-[11px] text-[var(--color-text-muted)] uppercase tracking-wider font-semibold">
            OR CONTINUE WITH
          </span>
          <div className="flex items-center justify-center gap-3 w-full">
            <button
              onClick={() => setError("Social sign-in is not available yet. Please use email and password.")}
              className="flex-1 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold hover:border-[var(--color-border-default)] transition-colors flex items-center justify-center gap-2"
            >
              <span>🌐</span> Google
            </button>
            <button
              onClick={() => setError("Social sign-in is not available yet. Please use email and password.")}
              className="flex-1 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold hover:border-[var(--color-border-default)] transition-colors flex items-center justify-center gap-2"
            >
              <span>🐙</span> GitHub
            </button>
            <button
              onClick={() => setError("Social sign-in is not available yet. Please use email and password.")}
              className="flex-1 py-2.5 rounded-xl bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-xs font-semibold hover:border-[var(--color-border-default)] transition-colors flex items-center justify-center gap-2"
            >
              <span>🍏</span> Apple
            </button>
          </div>
        </div>

        {/* Footer switch prompt */}
        <div className="text-center pt-2 border-t border-[var(--color-border-subtle)]">
          <p className="text-xs text-[var(--color-text-secondary)]">
            {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
            <span
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="text-[var(--color-ascend-coral)] font-bold cursor-pointer hover:underline"
            >
              {mode === "signin" ? "Sign Up" : "Sign In"}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
