"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useGame } from "@/store/gameContext";
import { TopHUD } from "@/components/player/TopHUD";
import { BottomNavBar } from "@/components/navigation/BottomNavBar";
import { QuestDetailDrawer } from "@/components/quests/QuestDetailDrawer";
import { LaraInAppTutorial } from "@/components/lara/LaraInAppTutorial";
import { NavIcon, NavIconName } from "@/components/ui/AscendIcon";
import { AscendLogo } from "@/components/ui/AscendLogo";

interface SidebarItem {
  id: NavIconName;
  label: string;
  href: string;
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "home",     label: "Home",     href: "/home"     },
  { id: "quest",    label: "Quest",    href: "/quests"   },
  { id: "world",    label: "World",    href: "/world"    },
  { id: "rewards",  label: "Rewards",  href: "/rewards"  },
  { id: "profile",  label: "Profile",  href: "/profile"  },
  { id: "settings", label: "Settings", href: "/settings" },
];

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { player, authUserId, selectedQuest, setSelectedQuest, isLoaded, dataError } = useGame();

  // Game routes require a restored Supabase Auth session.
  useEffect(() => {
    if (!isLoaded) return;
    if (!authUserId) {
      router.replace("/auth");
    }
  }, [authUserId, isLoaded, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 bg-[var(--color-bg-base)] text-[var(--color-text-muted)] font-bold text-xs uppercase tracking-widest animate-fadeIn">
        <AscendLogo size={64} priority />
        <span>Initializing ASCEND World...</span>
      </div>
    );
  }

  if (dataError) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 text-center text-sm text-[var(--color-ascend-coral)]">
        ASCEND could not load your account data: {dataError}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-dvh bg-transparent text-[var(--color-text-primary)] relative">
      {/* Top Status HUD */}
      <TopHUD />

      {/* Main Game Desktop Viewport Layout */}
      <div className="flex flex-1 w-full relative overflow-hidden">
        {/* Compact Left Sidebar (Desktop Navigation) */}
        <aside className="hidden lg:flex flex-col gap-2 w-44 p-3 bg-[var(--color-bg-surface)] border-r border-[var(--color-border-subtle)] shrink-0 z-20">
          <Link
            href="/home"
            className="flex items-center gap-2.5 px-3 py-2 text-xs font-black text-[var(--color-ascend-gold)] tracking-wider hover:opacity-85 transition-opacity"
            aria-label="ASCEND Home"
          >
            <AscendLogo size={22} priority />
            <span>ASCEND</span>
          </Link>

          <nav className="flex flex-col gap-1 mt-2">
            {SIDEBAR_ITEMS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  data-tutorial-target={`${item.id}-navigation`}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-[var(--color-ascend-coral)]/20 text-[var(--color-ascend-coral)] border border-[var(--color-ascend-coral)]/30"
                      : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
                  }`}
                >
                  <NavIcon name={item.id} active={isActive} size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Viewport */}
        <main className="flex-1 min-h-0 pb-24 lg:pb-20 overflow-y-auto w-full">
          {children}
        </main>
      </div>

      {/* Quest Detail Drawer Overlay */}
      {selectedQuest && (
        <QuestDetailDrawer
          quest={selectedQuest}
          onClose={() => setSelectedQuest(null)}
        />
      )}

      {/* In-App Lara Tutorial overlay if active */}
      {!player.tutorialCompleted && pathname !== "/onboarding" && pathname !== "/auth" && (
        <LaraInAppTutorial onComplete={() => {}} />
      )}

      {/* Persistent Bottom Navigation Dock */}
      <BottomNavBar />
    </div>
  );
}
