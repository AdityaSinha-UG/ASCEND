/**
 * ASCEND Global World Map Layout Engine
 *
 * Designed for a compact, organic, constellation-like RPG realm map.
 * Goals are placed deterministically as distinct destinations (Realms)
 * in an organic archipelago around the world origin.
 */

export const REALM_CARD_WIDTH = 230;
export const REALM_CARD_HEIGHT = 142;

// Legacy constants for backwards compatibility with any existing imports
export const GLOBAL_GOAL_CARD_WIDTH = REALM_CARD_WIDTH;
export const GLOBAL_GOAL_CARD_HEIGHT = REALM_CARD_HEIGHT;
export const GLOBAL_WORLD_WIDTH = 2000;
export const GLOBAL_WORLD_HEIGHT = 1600;

export interface GlobalWorldGoal {
  id: string;
  title?: string;
  category?: string;
}

export interface WorldPoint {
  x: number;
  y: number;
}

export interface WorldEdge {
  fromId: string;
  toId: string;
  distance: number;
  isPrimary: boolean; // Primary MST route vs secondary trade path
}

export interface GlobalWorldLayout {
  positions: Record<string, WorldPoint>;
  edges: WorldEdge[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  width: number;
  height: number;
}

// ── Deterministic Hashing ───────────────────────────────────────────────────

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed: number, step: number): number {
  let value = (seed + Math.imul(step + 1, 0x6d2b79f5)) >>> 0;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

// ── Organic Phyllotaxis & Cluster Positioning ───────────────────────────────

/**
 * Checks rectangular Goal-card collision bounds plus horizontal/vertical
 * breathing room. The rendered cards are rectangular, so ellipse-only spacing
 * could still allow their corners to overlap.
 */
function isFarEnough(candidate: WorldPoint, occupied: WorldPoint[]): boolean {
  const minHorizontal = REALM_CARD_WIDTH + 44;
  const minVertical = REALM_CARD_HEIGHT + 36;

  for (const point of occupied) {
    const dx = Math.abs(candidate.x - point.x);
    const dy = Math.abs(candidate.y - point.y);
    if (dx < minHorizontal && dy < minVertical) return false;
  }
  return true;
}

/**
 * Calculates a compact, organic placement for a goal. Its candidates are
 * seeded by the stable Goal ID; collision resolution is deterministic.
 */
function computeDeterministicPosition(
  goalId: string,
  occupied: WorldPoint[],
  worldCenterX: number,
  worldCenterY: number
): WorldPoint {
  const seed = hashString(`ascend-realm:${goalId}`);
  const GOLDEN_ANGLE = 2.399963229728653;
  const baseAngle = seededRandom(seed, 0) * Math.PI * 2;
  const baseRadius = 250 + seededRandom(seed, 1) * 240;

  // Each Goal gets an identity-seeded 2D candidate sequence. Goals are
  // processed in stable ID order below, never in account creation order.
  for (let attempt = 0; attempt < 4000; attempt += 1) {
    const theta = baseAngle + attempt * GOLDEN_ANGLE + (seededRandom(seed, attempt + 2) - 0.5) * 0.24;
    const radius = baseRadius + Math.sqrt(attempt) * 48;
    const candidate: WorldPoint = {
      x: Math.round(worldCenterX + Math.cos(theta) * radius * 0.92),
      y: Math.round(worldCenterY + Math.sin(theta) * radius * 0.72),
    };
    if (isFarEnough(candidate, occupied)) {
      return candidate;
    }
  }

  return { x: worldCenterX + 350, y: worldCenterY + 250 };
}

// ── World Connections (Ley-Lines & Trade Routes) ────────────────────────────

function squaredDistance(a: WorldPoint, b: WorldPoint): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

/**
 * Builds a clean, organic network of world routes:
 * 1. A Minimum Spanning Tree (MST) ensures full connectivity with zero isolated nodes.
 * 2. Secondary organic trade routes add subtle loop pathways for nearby neighbor realms.
 */
function buildWorldEdges(
  goals: GlobalWorldGoal[],
  positions: Record<string, WorldPoint>
): WorldEdge[] {
  if (goals.length < 2) return [];

  const stableGoals = [...goals].sort((left, right) => left.id.localeCompare(right.id));
  const candidates: Array<{ a: string; b: string; distance: number }> = [];
  for (let i = 0; i < stableGoals.length; i += 1) {
    for (let j = i + 1; j < stableGoals.length; j += 1) {
      const a = stableGoals[i].id;
      const b = stableGoals[j].id;
      if (!positions[a] || !positions[b]) continue;
      const dist = Math.sqrt(squaredDistance(positions[a], positions[b]));
      candidates.push({ a, b, distance: dist });
    }
  }

  // Sort by Euclidean distance with deterministic ID tie-breaking
  candidates.sort(
    (left, right) =>
      left.distance - right.distance ||
      `${left.a}:${left.b}`.localeCompare(`${right.a}:${right.b}`)
  );

  // Kruskal's MST for primary routes
  const parent = new Map(stableGoals.map(({ id }) => [id, id]));
  const find = (id: string): string => {
    const current = parent.get(id)!;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };

  const edges: WorldEdge[] = [];
  const edgeSet = new Set<string>();

  for (const candidate of candidates) {
    const rootA = find(candidate.a);
    const rootB = find(candidate.b);
    if (rootA === rootB) continue;
    parent.set(rootA, rootB);

    const edgeKey = candidate.a < candidate.b ? `${candidate.a}:${candidate.b}` : `${candidate.b}:${candidate.a}`;
    edgeSet.add(edgeKey);
    edges.push({
      fromId: candidate.a,
      toId: candidate.b,
      distance: candidate.distance,
      isPrimary: true,
    });

    if (edges.length === goals.length - 1) break;
  }

  // Add a few secondary close-neighbor links (for worlds with >= 4 goals) to make it feel like a real map
  if (goals.length >= 4) {
    let extraLinks = 0;
    const maxExtra = Math.min(3, Math.floor(goals.length / 3));

    for (const candidate of candidates) {
      if (extraLinks >= maxExtra) break;
      const edgeKey = candidate.a < candidate.b ? `${candidate.a}:${candidate.b}` : `${candidate.b}:${candidate.a}`;
      if (!edgeSet.has(edgeKey) && candidate.distance < 550) {
        edgeSet.add(edgeKey);
        edges.push({
          fromId: candidate.a,
          toId: candidate.b,
          distance: candidate.distance,
          isPrimary: false,
        });
        extraLinks += 1;
      }
    }
  }

  return edges;
}

// ── Master Layout Function ──────────────────────────────────────────────────

/**
 * Computes deterministic positions and connection routes for all goals. The
 * stable identity ordering keeps input/query order from controlling placement.
 */
export function layoutGlobalWorld(inputGoals: GlobalWorldGoal[]): GlobalWorldLayout {
  if (inputGoals.length === 0) {
    return {
      positions: {},
      edges: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 },
      width: 1200,
      height: 800,
    };
  }

  const worldCenterX = 1000;
  const worldCenterY = 700;
  const positions: Record<string, WorldPoint> = {};
  const occupied: WorldPoint[] = [];

  const stableGoals = [...inputGoals].sort((left, right) => left.id.localeCompare(right.id));
  stableGoals.forEach((goal) => {
    const pos = computeDeterministicPosition(goal.id, occupied, worldCenterX, worldCenterY);
    positions[goal.id] = pos;
    occupied.push(pos);
  });

  // Keep cards and their SVG connections inside the scalable world canvas even
  // as dense campaigns expand into negative candidate coordinates. A uniform
  // translation preserves all organic spacing and edge geometry.
  const minCenterX = Math.min(...Object.values(positions).map((point) => point.x));
  const minCenterY = Math.min(...Object.values(positions).map((point) => point.y));
  const offsetX = Math.max(0, REALM_CARD_WIDTH / 2 + 80 - minCenterX);
  const offsetY = Math.max(0, REALM_CARD_HEIGHT / 2 + 80 - minCenterY);
  if (offsetX || offsetY) {
    for (const point of Object.values(positions)) {
      point.x += offsetX;
      point.y += offsetY;
    }
  }

  // Calculate tight bounding box
  const allX = Object.values(positions).map((p) => p.x);
  const allY = Object.values(positions).map((p) => p.y);

  const minX = Math.min(...allX) - REALM_CARD_WIDTH / 2;
  const maxX = Math.max(...allX) + REALM_CARD_WIDTH / 2;
  const minY = Math.min(...allY) - REALM_CARD_HEIGHT / 2;
  const maxY = Math.max(...allY) + REALM_CARD_HEIGHT / 2;

  const boundsWidth = Math.max(1, maxX - minX);
  const boundsHeight = Math.max(1, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const edges = buildWorldEdges(stableGoals, positions);

  // Total canvas dimensions with generous exploration padding
  const totalWidth = Math.max(2000, maxX + 400);
  const totalHeight = Math.max(1600, maxY + 400);

  return {
    positions,
    edges,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: boundsWidth,
      height: boundsHeight,
      centerX,
      centerY,
    },
    width: totalWidth,
    height: totalHeight,
  };
}

// ── Organic Curved Ley-Line Path Generator ──────────────────────────────────

/**
 * Generates an organic, curved bezier path connecting two realm positions.
 * Clips at the card edge so lines meet cleanly at the card's glowing anchor points.
 */
export function worldEdgePath(
  from: WorldPoint,
  to: WorldPoint,
  edgeKey: string
): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.max(1, Math.hypot(dx, dy));

  const ux = dx / dist;
  const uy = dy / dist;

  // Approximate card radius along direction vector
  const cardRadiusX = REALM_CARD_WIDTH / 2;
  const cardRadiusY = REALM_CARD_HEIGHT / 2;
  const startOffset = Math.min(dist * 0.4, Math.hypot(ux * cardRadiusX, uy * cardRadiusY));
  const endOffset = Math.min(dist * 0.4, Math.hypot(ux * cardRadiusX, uy * cardRadiusY));

  const startX = from.x + ux * startOffset;
  const startY = from.y + uy * startOffset;
  const endX = to.x - ux * endOffset;
  const endY = to.y - uy * endOffset;

  // Normal vector for gentle organic curvature
  const nx = -uy;
  const ny = ux;

  // Deterministic curve direction and amplitude
  const seed = hashString(edgeKey);
  const bendDirection = seed % 2 === 0 ? 1 : -1;
  const maxBend = Math.min(75, dist * 0.16);
  const bendAmount = maxBend * bendDirection * (0.6 + (seed % 40) / 100);

  const cp1X = startX + dx * 0.3 + nx * bendAmount;
  const cp1Y = startY + dy * 0.3 + ny * bendAmount;
  const cp2X = startX + dx * 0.7 + nx * (bendAmount * 0.85);
  const cp2Y = startY + dy * 0.7 + ny * (bendAmount * 0.85);

  return `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
}
