import type { Goal, Quest } from "@/lib/types";

export interface CampaignMapNode {
  quest: Quest;
  x: number;
  y: number;
  depth: number;
  parentId: string | null;
}

export interface CampaignMapLayout {
  width: number;
  height: number;
  goalX: number;
  goalY: number;
  nodes: CampaignMapNode[];
  edges: Array<{ fromId: string | null; toId: string; kind: "progression" | "prerequisite" }>;
}

interface TreeNode {
  quest: Quest;
  children: TreeNode[];
}

function samePath(left: Quest, right: Quest): boolean {
  return !left.pathId || !right.pathId || left.pathId === right.pathId;
}

function stableOrder(left: Quest, right: Quest): number {
  return left.order - right.order || left.id.localeCompare(right.id);
}

function buildCampaignTree(quests: Quest[]): { roots: TreeNode[]; primaryParent: Map<string, string> } {
  const byId = new Map(quests.map((quest) => [quest.id, quest]));
  const primaryParent = new Map<string, string>();

  for (const quest of quests) {
    const persistedParentId = quest.parentQuestId ??
      (quest.pathId && quest.pathId !== quest.id ? quest.pathId : null);
    const parent = persistedParentId ? byId.get(persistedParentId) : undefined;
    if (parent && parent.id !== quest.id && samePath(parent, quest)) {
      primaryParent.set(quest.id, parent.id);
      continue;
    }
    const prerequisiteParent = quest.prerequisites
      .map((id) => byId.get(id))
      .find((candidate) => candidate && candidate.id !== quest.id && samePath(candidate, quest));
    if (prerequisiteParent) primaryParent.set(quest.id, prerequisiteParent.id);
  }

  const childrenByParent = new Map<string, Quest[]>();
  for (const quest of quests) {
    const parentId = primaryParent.get(quest.id);
    if (!parentId) continue;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(quest);
    childrenByParent.set(parentId, children);
  }
  for (const children of childrenByParent.values()) children.sort(stableOrder);

  const included = new Set<string>();
  const build = (quest: Quest, ancestors: Set<string>): TreeNode => {
    included.add(quest.id);
    const nextAncestors = new Set(ancestors).add(quest.id);
    const children = (childrenByParent.get(quest.id) ?? [])
      .filter((child) => !nextAncestors.has(child.id) && !included.has(child.id))
      .map((child) => build(child, nextAncestors));
    return { quest, children };
  };

  const roots = quests.filter((quest) => !primaryParent.has(quest.id)).sort(stableOrder);
  const tree = roots.map((root) => build(root, new Set()));
  // Malformed/cyclic records remain visible, but receive no invented cross-node edge.
  for (const quest of [...quests].sort(stableOrder)) {
    if (!included.has(quest.id)) tree.push(build(quest, new Set()));
  }
  return { roots: tree, primaryParent };
}

function leafCount(node: TreeNode): number {
  return node.children.length === 0 ? 1 : node.children.reduce((total, child) => total + leafCount(child), 0);
}

function hashKey(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** Creates a deterministic, goal-scoped progression tree from persisted relationships. */
export function layoutGoalCampaign(goal: Goal, goalQuests: Quest[]): CampaignMapLayout {
  const scopedQuests = goalQuests.filter((quest) => quest.goalId === goal.id);
  const { roots, primaryParent } = buildCampaignTree(scopedQuests);
  const leaves = roots.reduce((total, root) => total + leafCount(root), 0);
  const width = Math.max(620, (leaves + 1) * 205);
  const goalX = width / 2;
  const goalY = 112;
  const goalHalfHeight = 76;
  const nodeHalfHeight = 46;
  const verticalGap = 142;
  const firstNodeY = goalY + goalHalfHeight + 72;
  const deepestDepth = (items: TreeNode[], depth = 0): number =>
    items.reduce((max, node) => Math.max(max, deepestDepth(node.children, depth + 1)), depth);
  const maxDepth = roots.length ? deepestDepth(roots) - 1 : -1;
  const height = roots.length
    ? firstNodeY + Math.max(0, maxDepth) * verticalGap + nodeHalfHeight + 38
    : goalY + goalHalfHeight + 44;
  const slotGap = (width - 200) / Math.max(leaves, 1);
  let leafCursor = 0;
  const nodes: CampaignMapNode[] = [];
  const treeEdges: CampaignMapLayout["edges"] = [];
  const seed = hashKey(`${goal.id}:${goal.title}`);

  const place = (node: TreeNode, depth: number, parentId: string | null): number => {
    let baseX: number;
    if (!node.children.length) {
      baseX = 100 + slotGap * (leafCursor + 0.5);
      leafCursor += 1;
    } else {
      const childXs = node.children.map((child) => place(child, depth + 1, node.quest.id));
      baseX = childXs.reduce((sum, x) => sum + x, 0) / childXs.length;
    }
    const nodeSeed = hashKey(node.quest.id) + seed;
    const organicOffset = Math.sin((nodeSeed % 6283) / 1000 + depth * 0.73) * 15;
    const x = Math.max(92, Math.min(width - 92, baseX + organicOffset));
    const y = firstNodeY + depth * verticalGap;
    nodes.push({ quest: node.quest, x, y, depth, parentId });
    treeEdges.push({ fromId: parentId, toId: node.quest.id, kind: "progression" });
    return x;
  };

  for (const root of roots) place(root, 0, null);
  const edges = [...treeEdges];
  const edgeKeys = new Set(edges.map((edge) => `${edge.fromId ?? "goal"}:${edge.toId}`));
  for (const quest of scopedQuests) {
    for (const prerequisiteId of quest.prerequisites) {
      const prerequisite = scopedQuests.find((candidate) => candidate.id === prerequisiteId);
      if (!prerequisite || prerequisite.id === quest.id || !samePath(prerequisite, quest)) continue;
      // Parent progression already draws the same relationship.
      if (primaryParent.get(quest.id) === prerequisite.id || quest.parentQuestId === prerequisite.id) continue;
      const key = `${prerequisite.id}:${quest.id}`;
      if (!edgeKeys.has(key)) {
        edges.push({ fromId: prerequisite.id, toId: quest.id, kind: "prerequisite" });
        edgeKeys.add(key);
      }
    }
  }

  return { width, height, goalX, goalY, nodes, edges };
}
