"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NavIcon, NavIconName } from "@/components/ui/AscendIcon";

interface NavItem {
  id: NavIconName;
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home",     label: "Home",     href: "/home"     },
  { id: "quest",    label: "Quest",    href: "/quests"   },
  { id: "world",    label: "World",    href: "/world"    },
  { id: "rewards",  label: "Rewards",  href: "/rewards"  },
  { id: "profile",  label: "Profile",  href: "/profile"  },
  { id: "settings", label: "Settings", href: "/settings" },
];

export function BottomNavBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-bg-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border-subtle)] px-2 py-2 shadow-2xl">
      <div className="max-w-xl mx-auto flex items-center justify-around">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.id}
              href={item.href}
              data-tutorial-target={`${item.id}-navigation`}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-[var(--color-ascend-coral)] bg-[var(--color-ascend-coral)]/15 font-bold scale-105"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-elevated)]"
              }`}
            >
              <NavIcon name={item.id} active={isActive} size={24} />
              <span className="text-[10px] sm:text-xs tracking-wider">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
