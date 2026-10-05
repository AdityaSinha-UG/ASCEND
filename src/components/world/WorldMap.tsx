"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/store/gameContext";
import type { WorldLandmark } from "@/lib/constants/worldThemes";
import type { Goal } from "@/lib/types";
import {
  REALM_CARD_HEIGHT,
  REALM_CARD_WIDTH,
  layoutGlobalWorld,
  worldEdgePath,
} from "@/lib/utils/globalWorldLayout";

interface WorldMapProps {
  onSelectLandmark: (landmark: WorldLandmark) => void;
}

interface Camera {
  x: number;
  y: number;
  scale: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

const MIN_ZOOM = 0.35;
const MAX_ZOOM = 1.75;

// Thematic Realm archetype detector based on title keywords
function getRealmArchetype(title: string, category?: string) {
  const t = (title + " " + (category || "")).toLowerCase();
  if (/python|code|programming|developer|software|engineer|javascript|react|css|html|web|backend|frontend|ai|algorithm/.test(t)) {
    return { icon: "💻", badge: "CYBER SANCTUARY", tag: "Tech Mastery", color: "#E5B869" };
  }
  if (/japan|travel|trip|tokyo|kyoto|language|japanese|explore|flight|country|visit/.test(t)) {
    return { icon: "⛩️", badge: "EASTERN DOMAIN", tag: "Wanderer Expedition", color: "#FF6E57" };
  }
  if (/fitness|gym|workout|health|run|muscle|exercise|train|lift|cardio|weight|diet/.test(t)) {
    return { icon: "⚔️", badge: "IRON CITADEL", tag: "Trial of Might", color: "#F59E0B" };
  }
  if (/read|book|study|math|science|learn|school|exam|grade|degree|research|write/.test(t)) {
    return { icon: "📜", badge: "GRAND ARCHIVE", tag: "Domain of Wisdom", color: "#A855F7" };
  }
  if (/career|job|business|startup|money|finance|promote|income|invest|lead|sales/.test(t)) {
    return { icon: "👑", badge: "SOVEREIGN PEAK", tag: "Summit of Ambition", color: "#EAB308" };
  }
  if (/game|art|music|design|create|draw|paint|story|film|creative/.test(t)) {
    return { icon: "🎨", badge: "ASTRAL SANCTUM", tag: "Sphere of Creation", color: "#10B981" };
  }
  return { icon: "✦", badge: "ASCEND REALM", tag: "Personal Expedition", color: "#E5B869" };
}

function goalStatus(goal: Goal): WorldLandmark["status"] {
  if (goal.status === "completed") return "completed";
  if (goal.status === "paused" || goal.status === "archived") return "locked";
  return "in_progress";
}

/**
 * Calculates optimal camera framing to fit all realms inside viewport
 * with comfortable margins and high readability.
 */
function fitCameraToBounds(
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number; centerX: number; centerY: number },
  viewport: ViewportSize,
  goalCount: number
): Camera {
  if (!goalCount || !viewport.width || !viewport.height) {
    return { x: 0, y: 0, scale: 1 };
  }

  // Padding around world boundaries
  const padX = viewport.width < 640 ? 60 : 130;
  const padY = viewport.height < 640 ? 70 : 110;

  const availW = Math.max(100, viewport.width - padX);
  const availH = Math.max(100, viewport.height - padY);

  const rawScaleX = availW / Math.max(REALM_CARD_WIDTH, bounds.width);
  const rawScaleY = availH / Math.max(REALM_CARD_HEIGHT, bounds.height);
  const fitScale = Math.min(rawScaleX, rawScaleY);

  // Scaled readability floors based on world complexity
  let scale: number;
  if (goalCount === 1) {
    scale = 1.0;
  } else if (goalCount <= 3) {
    scale = Math.min(1.0, Math.max(0.85, fitScale));
  } else if (goalCount <= 6) {
    scale = Math.min(0.95, Math.max(0.75, fitScale));
  } else if (goalCount <= 12) {
    scale = Math.min(0.9, Math.max(0.62, fitScale));
  } else {
    scale = Math.min(0.85, Math.max(0.5, fitScale));
  }

  return {
    scale,
    x: Math.round(viewport.width / 2 - bounds.centerX * scale),
    y: Math.round(viewport.height / 2 - bounds.centerY * scale),
  };
}

export function WorldMap({ onSelectLandmark }: WorldMapProps) {
  const router = useRouter();
  const { goals, quests, deleteGoal } = useGame();
  const viewportRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<ViewportSize>({ width: 0, height: 0 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [hoveredGoalId, setHoveredGoalId] = useState<string | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    camX: number;
    camY: number;
    hasMoved: boolean;
  } | null>(null);

  const fittedSignatureRef = useRef<string | null>(null);

  // Input goal objects with stable sequencing
  const layout = useMemo(() => layoutGlobalWorld(goals), [goals]);

  // Track viewport container dimensions
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setViewport({
        width: entry.contentRect.width,
        height: entry.contentRect.height,
      });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Initial auto-frame when viewport or goals change
  const currentSignature = goals.map((g) => g.id).join(":");
  useEffect(() => {
    if (!viewport.width || !viewport.height || goals.length === 0) return;
    if (fittedSignatureRef.current === currentSignature) return;

    const initialCamera = fitCameraToBounds(layout.bounds, viewport, goals.length);
    setCamera(initialCamera);
    fittedSignatureRef.current = currentSignature;
  }, [currentSignature, viewport, goals.length, layout.bounds]);

  // Recenter / Reset Action
  const handleRecenter = useCallback(() => {
    setIsTransitioning(true);
    setCamera(fitCameraToBounds(layout.bounds, viewport, goals.length));
    setTimeout(() => setIsTransitioning(false), 450);
  }, [layout.bounds, viewport, goals.length]);

  // Zoom at center or cursor
  const handleZoom = (factor: number, originX?: number, originY?: number) => {
    setIsTransitioning(true);
    setCamera((current) => {
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.scale * factor));
      const targetOriginX = originX ?? viewport.width / 2;
      const targetOriginY = originY ?? viewport.height / 2;

      // Maintain point under cursor/center
      const worldX = (targetOriginX - current.x) / current.scale;
      const worldY = (targetOriginY - current.y) / current.scale;

      const newX = targetOriginX - worldX * newScale;
      const newY = targetOriginY - worldY * newScale;

      return { scale: newScale, x: Math.round(newX), y: Math.round(newY) };
    });
    setTimeout(() => setIsTransitioning(false), 200);
  };

  // Handle trackpad and wheel interactions
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) return;

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setIsTransitioning(false);

    const isPinch = e.ctrlKey;
    const isHorizontalZoom = Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 1.5;

    // Zoom ONLY on horizontal trackpad movement or pinch gesture
    if (isPinch || isHorizontalZoom) {
      let zoomFactor = 1;
      if (isPinch) {
        zoomFactor = Math.exp(-e.deltaY * 0.012);
      } else {
        const delta = Math.min(Math.max(e.deltaX, -40), 40);
        zoomFactor = delta < 0 ? 1.045 : 1 / 1.045;
      }

      setCamera((current) => {
        const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, current.scale * zoomFactor));
        const worldX = (mouseX - current.x) / current.scale;
        const worldY = (mouseY - current.y) / current.scale;
        return {
          scale: newScale,
          x: mouseX - worldX * newScale,
          y: mouseY - worldY * newScale,
        };
      });
    } else {
      // Up/Down trackpad scrolling smoothly pans the map without changing zoom
      setCamera((current) => ({
        ...current,
        x: Math.round(current.x - e.deltaX),
        y: Math.round(current.y - e.deltaY),
      }));
    }
  };

  // Drag pan handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button, [role='button']")) return;
    setIsTransitioning(false);
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      camX: camera.x,
      camY: camera.y,
      hasMoved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      drag.hasMoved = true;
    }

    setCamera((curr) => ({
      ...curr,
      x: drag.camX + dx,
      y: drag.camY + dy,
    }));
  };

  const stopDragging = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current?.pointerId !== e.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
  };

  // Calculate live stats for each goal
  const goalStats = useMemo(() => {
    const stats: Record<string, { totalPaths: number; completedPaths: number; progressPct: number }> = {};
    goals.forEach((g) => {
      const goalQuests = quests.filter((q) => q.goalId === g.id);
      const total = goalQuests.length;
      const completed = goalQuests.filter((q) => q.status === "completed").length;
      const pct = total > 0 ? Math.round((completed / total) * 100) : (g.progress ?? 0);
      stats[g.id] = { totalPaths: total, completedPaths: completed, progressPct: pct };
    });
    return stats;
  }, [goals, quests]);

  return (
    <div className="w-full flex flex-col items-center gap-4 p-3 sm:p-6 animate-fadeIn select-none">
      {/* ── Top Header Panel ─────────────────────────────────────────────────── */}
      <div
        data-tutorial-target="world-header"
        className="w-full max-w-6xl flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[var(--color-bg-surface)]/95 backdrop-blur-md p-5 rounded-3xl border border-[var(--color-border-default)] shadow-xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-[radial-gradient(circle_at_top_right,rgba(229,184,105,0.08)_0%,transparent_70%)] pointer-events-none" />

        <div className="flex flex-col gap-1 z-10">
          <div className="flex items-center gap-2.5">
            <span className="text-base text-[var(--color-ascend-gold)]">▲</span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Global World Map
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[10px] font-extrabold text-[var(--color-ascend-gold)] uppercase tracking-wider">
              {goals.length} {goals.length === 1 ? "Realm" : "Realms"}
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Your real-life aspirations mapped as interconnected destinations across your personal Life RPG.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push("/onboarding?stage=goal")}
          className="px-5 py-2.5 rounded-xl bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg hover:shadow-[0_0_20px_rgba(255,110,87,0.35)] transform hover:scale-[1.02] active:scale-95 self-start md:self-auto shrink-0 z-10"
        >
          + Forge New Realm
        </button>
      </div>

      {/* ── Empty World State ────────────────────────────────────────────────── */}
      {goals.length === 0 ? (
        <section className="w-full max-w-6xl min-h-[min(65dvh,620px)] rounded-3xl border border-[var(--color-border-default)] bg-[radial-gradient(ellipse_at_50%_45%,rgba(229,184,105,0.12),rgba(15,14,13,0.98)_70%)] flex items-center justify-center p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 opacity-15 bg-[radial-gradient(circle,rgba(229,184,105,0.3)_1px,transparent_2px)] [background-size:32px_32px] pointer-events-none" />
          
          <div className="max-w-md flex flex-col items-center gap-4 z-10">
            <div className="w-16 h-16 rounded-2xl bg-[var(--color-bg-elevated)] border-2 border-[var(--color-ascend-gold)]/50 flex items-center justify-center text-3xl shadow-[0_0_30px_rgba(229,184,105,0.25)] animate-pulse">
              🗺️
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-black uppercase tracking-widest text-[var(--color-ascend-gold)]">
                UNEXPLORED FRONTIER
              </span>
              <h2 className="text-2xl font-black text-white">Your World Awaits</h2>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Transform your ambitions into expansive RPG realms. Set your first goal to forge your world map and embark on your campaign.
              </p>
            </div>
            <button
              type="button"
              onClick={() => router.push("/onboarding?stage=goal")}
              className="mt-2 px-6 py-3 rounded-xl bg-[var(--color-ascend-coral)] hover:bg-[var(--color-ascend-coral-hover)] text-white text-xs font-bold uppercase tracking-wider shadow-xl transition-all hover:scale-105 active:scale-95"
            >
              🚀 Forge First Realm
            </button>
          </div>
        </section>
      ) : (
        /* ── Active World Canvas ────────────────────────────────────────────── */
        <section
          aria-label="Global World Map Viewport"
          className="w-full max-w-6xl relative"
        >
          <div
            ref={viewportRef}
            className={`relative h-[min(72dvh,780px)] min-h-[480px] w-full overflow-hidden rounded-3xl border-2 border-[var(--color-border-default)] bg-[#0C0A09] shadow-[inset_0_0_120px_rgba(0,0,0,0.92)] ${
              isDragging ? "cursor-grabbing select-none" : "cursor-grab"
            }`}
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={stopDragging}
            onPointerCancel={stopDragging}
            onLostPointerCapture={stopDragging}
            onWheel={handleWheel}
          >
            {/* Ambient Background Nebulae & Celestial Star Grid */}
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_50%,rgba(229,184,105,0.12)_0%,transparent_60%),radial-gradient(ellipse_at_25%_75%,rgba(255,110,87,0.08)_0%,transparent_50%),radial-gradient(ellipse_at_80%_25%,rgba(168,85,247,0.06)_0%,transparent_50%)]" />
            <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(circle,rgba(229,184,105,0.35)_1px,transparent_2px)] [background-size:40px_40px]" />

            {/* Compass Rose (Top-Left Ornament) */}
            <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2 p-2 rounded-xl bg-[var(--color-bg-surface)]/80 border border-[var(--color-border-subtle)] backdrop-blur-md shadow-md text-[10px] font-mono text-[var(--color-text-muted)]">
              <span className="text-[var(--color-ascend-gold)] font-black">✦ N</span>
              <span className="w-1 h-3 border-l border-[var(--color-border-subtle)]" />
              <span>ASCEND REALM ENGINE</span>
            </div>

            {/* Floating Navigation Controls (Top-Right Dock) */}
            <div className="absolute right-4 top-4 z-30 flex items-center gap-1.5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/90 p-1.5 shadow-2xl backdrop-blur-md">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => handleZoom(1.2)}
                aria-label="Zoom in"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-bold text-white hover:bg-[var(--color-bg-elevated)] active:scale-95 transition-all"
                title="Zoom In"
              >
                +
              </button>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => handleZoom(1 / 1.2)}
                aria-label="Zoom out"
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base font-bold text-white hover:bg-[var(--color-bg-elevated)] active:scale-95 transition-all"
                title="Zoom Out"
              >
                −
              </button>
              <div className="w-[1px] h-4 bg-[var(--color-border-subtle)] mx-0.5" />
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={handleRecenter}
                aria-label="Recenter World Map"
                className="px-2.5 h-8 rounded-xl flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-wider text-[var(--color-ascend-gold)] hover:bg-[var(--color-bg-elevated)] active:scale-95 transition-all"
                title="Reset Camera"
              >
                <span>⊙</span> Recenter
              </button>
              <span className="px-2 py-0.5 rounded bg-[var(--color-bg-base)] text-[9px] font-mono font-bold text-[var(--color-text-muted)]">
                {Math.round(camera.scale * 100)}%
              </span>
            </div>

            {/* ── Interactive World Transform Container ──────────────────────── */}
            <div
              className={`absolute left-0 top-0 origin-top-left will-change-transform ${
                isTransitioning ? "transition-transform duration-400 ease-out" : ""
              }`}
              style={{
                width: layout.width,
                height: layout.height,
                transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.scale})`,
              }}
            >
              {/* World Astrolabe / Celestial Axis Rings */}
              <svg
                aria-hidden="true"
                className="absolute inset-0 z-0 h-full w-full overflow-visible pointer-events-none"
                viewBox={`0 0 ${layout.width} ${layout.height}`}
              >
                <defs>
                  {/* Glowing Road Filters */}
                  <filter id="ley-glow-heavy" x="-40%" y="-40%" width="180%" height="180%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                  </filter>

                  {/* Gradient Lines */}
                  <linearGradient id="gold-ley-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FF6E57" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#E5B869" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#FF6E57" stopOpacity="0.8" />
                  </linearGradient>

                  <linearGradient id="secondary-ley-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#E5B869" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#A855F7" stopOpacity="0.4" />
                  </linearGradient>
                </defs>

                {/* Celestial Astrolabe Center Ornament */}
                <g opacity="0.18">
                  <circle cx="1000" cy="700" r="160" fill="none" stroke="#E5B869" strokeWidth="1" strokeDasharray="3 6" />
                  <circle cx="1000" cy="700" r="320" fill="none" stroke="#E5B869" strokeWidth="1" strokeDasharray="6 10" />
                  <circle cx="1000" cy="700" r="540" fill="none" stroke="#E5B869" strokeWidth="1" strokeDasharray="4 8" opacity="0.6" />
                  <line x1="1000" y1="200" x2="1000" y2="1200" stroke="#E5B869" strokeWidth="1" strokeDasharray="4 8" opacity="0.4" />
                  <line x1="500" y1="700" x2="1500" y2="700" stroke="#E5B869" strokeWidth="1" strokeDasharray="4 8" opacity="0.4" />
                </g>

                {/* World Connection Ley-Lines */}
                {layout.edges.map((edge) => {
                  const from = layout.positions[edge.fromId];
                  const to = layout.positions[edge.toId];
                  if (!from || !to) return null;

                  const edgeKey = `${edge.fromId}:${edge.toId}`;
                  const pathD = worldEdgePath(from, to, edgeKey);
                  const isHovered = hoveredGoalId === edge.fromId || hoveredGoalId === edge.toId;

                  return (
                    <g key={edgeKey} className="transition-opacity duration-300">
                      {/* Ambient Glowing Aura */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={edge.isPrimary ? "#E5B869" : "#A855F7"}
                        strokeWidth={isHovered ? 14 : 9}
                        strokeOpacity={isHovered ? 0.28 : edge.isPrimary ? 0.16 : 0.08}
                        filter="url(#ley-glow-heavy)"
                      />

                      {/* Solid Ley-Line Thread */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke={edge.isPrimary ? "url(#gold-ley-gradient)" : "url(#secondary-ley-gradient)"}
                        strokeWidth={edge.isPrimary ? (isHovered ? 3 : 2) : 1.5}
                        strokeOpacity={isHovered ? 1.0 : edge.isPrimary ? 0.75 : 0.45}
                        strokeDasharray={edge.isPrimary ? "none" : "6 6"}
                      />

                      {/* Traveling Energy Pulse Motes */}
                      <path
                        d={pathD}
                        fill="none"
                        stroke="#FFF"
                        strokeWidth={edge.isPrimary ? 3 : 2}
                        strokeOpacity={isHovered ? 0.9 : 0.6}
                        strokeDasharray="6 24"
                        className="animate-[dash_12s_linear_infinite]"
                      />

                      {/* Luminous Waypoint Anchors */}
                      <circle
                        cx={from.x}
                        cy={from.y}
                        r={isHovered ? 6 : 4}
                        fill="#E5B869"
                        opacity={0.8}
                      />
                      <circle
                        cx={to.x}
                        cy={to.y}
                        r={isHovered ? 6 : 4}
                        fill="#E5B869"
                        opacity={0.8}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* ── Destination Realm Cards ──────────────────────────────────── */}
              {goals.map((goal, index) => {
                const pos = layout.positions[goal.id];
                if (!pos) return null;

                const status = goalStatus(goal);
                const archetype = getRealmArchetype(goal.title, goal.category);
                const stats = goalStats[goal.id] || { totalPaths: 0, completedPaths: 0, progressPct: 0 };
                const isHovered = hoveredGoalId === goal.id;

                const landmark: WorldLandmark = {
                  id: goal.id,
                  title: goal.title,
                  category: "main",
                  icon: archetype.icon,
                  progress: stats.progressPct,
                  status,
                  position: {
                    x: (pos.x / layout.width) * 100,
                    y: (pos.y / layout.height) * 100,
                  },
                  description: goal.description,
                };

                const cardBorder =
                  status === "completed"
                    ? "border-emerald-500/80 shadow-[0_0_35px_rgba(16,185,129,0.25)] bg-[#0F1E17]/95"
                    : status === "locked"
                    ? "border-[var(--color-border-subtle)] opacity-75 bg-[#141211]/90"
                    : isHovered
                    ? "border-[var(--color-ascend-gold)] shadow-[0_0_40px_rgba(229,184,105,0.4)] bg-[#1A1613]/95 scale-[1.04]"
                    : "border-[var(--color-ascend-gold)]/60 shadow-[0_0_25px_rgba(229,184,105,0.18)] bg-[#14110F]/95";

                return (
                  <div
                    key={goal.id}
                    className="absolute z-10 -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                    style={{
                      left: pos.x,
                      top: pos.y,
                      width: REALM_CARD_WIDTH,
                      height: REALM_CARD_HEIGHT,
                    }}
                    onMouseEnter={() => setHoveredGoalId(goal.id)}
                    onMouseLeave={() => setHoveredGoalId(null)}
                  >
                    {/* Ambient Glow Halo */}
                    <div
                      className={`absolute -inset-2 rounded-3xl blur-xl transition-opacity duration-300 pointer-events-none ${
                        status === "completed"
                          ? "bg-emerald-500/20 opacity-80"
                          : isHovered
                          ? "bg-[var(--color-ascend-gold)]/25 opacity-100"
                          : "bg-[var(--color-ascend-gold)]/10 opacity-60"
                      }`}
                    />

                    {/* Interactive Destination Card */}
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => onSelectLandmark(landmark)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onSelectLandmark(landmark);
                        }
                      }}
                      data-tutorial-target={index === 0 ? "goal-node" : undefined}
                      aria-label={`Enter Goal Campaign: ${goal.title}`}
                      className={`relative w-full h-full p-3.5 rounded-2xl border-2 ${cardBorder} backdrop-blur-md flex flex-col justify-between text-left transition-all duration-300 cursor-pointer active:scale-95 group focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-ascend-gold)]`}
                    >
                      {/* Top Header: Badge & Status */}
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-base shrink-0" aria-hidden="true">
                            {archetype.icon}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-[var(--color-ascend-gold)] truncate">
                            {archetype.badge}
                          </span>
                        </div>

                        {/* Status Beacon & Delete Cross Button */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {status === "completed" ? (
                            <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-[8px] font-black uppercase text-emerald-400">
                              ✓ DONE
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-md bg-[var(--color-bg-elevated)] border border-[var(--color-border-subtle)] text-[8px] font-extrabold uppercase text-[var(--color-text-secondary)]">
                              {stats.progressPct}%
                            </span>
                          )}

                          {/* Cross Button to Delete Goal */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteError(null);
                              setGoalToDelete(goal);
                            }}
                            className="w-5 h-5 rounded-md bg-red-950/40 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/40 flex items-center justify-center text-[10px] font-bold transition-all active:scale-90 cursor-pointer"
                            title="Delete this Goal Realm"
                            aria-label={`Delete ${goal.title}`}
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Center: Goal Destination Title */}
                      <div className="flex flex-col gap-0.5 my-auto">
                        <h3 className="text-xs sm:text-[13px] font-black text-white leading-snug line-clamp-2 group-hover:text-[var(--color-ascend-gold)] transition-colors">
                          {goal.title}
                        </h3>
                        <span className="text-[9px] font-bold text-[var(--color-text-muted)] tracking-wide truncate">
                          {archetype.tag}
                        </span>
                      </div>

                      {/* Footer: Progress Bar & Action Cue */}
                      <div className="flex flex-col gap-1 pt-1.5 border-t border-[var(--color-border-subtle)]/70">
                        <div className="w-full h-1.5 rounded-full bg-[var(--color-bg-base)] overflow-hidden border border-[var(--color-border-subtle)]/50">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              status === "completed"
                                ? "bg-emerald-400"
                                : "bg-gradient-to-r from-[var(--color-ascend-coral)] to-[var(--color-ascend-gold)]"
                            }`}
                            style={{ width: `${Math.max(stats.progressPct || 10, 8)}%` }}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[8px] font-bold uppercase tracking-wider text-[var(--color-text-secondary)] pt-0.5">
                          <span>
                            {stats.totalPaths > 0
                              ? `${stats.completedPaths}/${stats.totalPaths} Paths Done`
                              : "Campaign Ready"}
                          </span>
                          <span className="text-[var(--color-ascend-coral)] group-hover:translate-x-0.5 transition-transform font-extrabold">
                            ENTER →
                          </span>
                        </div>
                      </div>

                      {/* Runic Corner Accent Brackets */}
                      <span className="absolute top-1 left-1 w-1.5 h-1.5 border-t border-l border-[var(--color-ascend-gold)]/60 pointer-events-none" />
                      <span className="absolute top-1 right-1 w-1.5 h-1.5 border-t border-r border-[var(--color-ascend-gold)]/60 pointer-events-none" />
                      <span className="absolute bottom-1 left-1 w-1.5 h-1.5 border-b border-l border-[var(--color-ascend-gold)]/60 pointer-events-none" />
                      <span className="absolute bottom-1 right-1 w-1.5 h-1.5 border-b border-r border-[var(--color-ascend-gold)]/60 pointer-events-none" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom-Left Legend & Helper Note */}
            <div className="pointer-events-none absolute bottom-3 left-4 z-20 flex items-center gap-2 p-2 rounded-xl bg-[var(--color-bg-surface)]/85 border border-[var(--color-border-subtle)] backdrop-blur-md shadow text-[9px] font-bold uppercase tracking-[.14em] text-[var(--color-text-secondary)]">
              <span className="text-[var(--color-ascend-gold)] animate-pulse">✦</span>
              <span>Drag to navigate world · Click realm to enter campaign</span>
            </div>
          </div>
        </section>
      )}

      {/* ── Goal Delete Confirmation Modal ────────────────────────────────────── */}
      {goalToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn"
          onClick={() => !isDeleting && setGoalToDelete(null)}
        >
          <div
            className="w-full max-w-md bg-[var(--color-bg-surface)] border-2 border-red-600/70 rounded-3xl p-6 shadow-2xl flex flex-col gap-4 text-center animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-500/60 flex items-center justify-center mx-auto text-red-300 text-xl font-bold">
              ✕
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-black text-white">Delete Goal Realm?</h3>
              <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                Are you sure you want to delete <span className="text-white font-bold">&ldquo;{goalToDelete.title}&rdquo;</span>? This will permanently remove this Realm and all associated Paths and Quests from your World.
              </p>
            </div>

            {deleteError && <p role="alert" className="text-xs text-red-300">{deleteError}</p>}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  setDeleteError(null);
                  try {
                    await deleteGoal(goalToDelete.id);
                    setGoalToDelete(null);
                  } catch (error) {
                    setDeleteError(error instanceof Error ? error.message : "This Goal could not be deleted. Please try again.");
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs uppercase tracking-wider transition-all cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete Realm"}
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => { setGoalToDelete(null); setDeleteError(null); }}
                className="flex-1 py-3 rounded-xl font-bold bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)] text-white text-xs uppercase tracking-wider transition-all border border-[var(--color-border-subtle)] cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
