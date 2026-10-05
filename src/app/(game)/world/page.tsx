"use client";

import React, { useEffect, useState } from "react";
import { useGame } from "@/store/gameContext";
import { WorldMap } from "@/components/world/WorldMap";
import { GoalPathMap } from "@/components/world/GoalPathMap";
import { PathDetailDrawer } from "@/components/world/PathDetailDrawer";
import type { Goal } from "@/lib/types";

export default function WorldPage() {
  const { activeGoal, goals, quests } = useGame();

  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(activeGoal || goals[0] || null);
  const [activeLayer, setActiveLayer] = useState<"world" | "goal_path">("world");
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  useEffect(() => {
    const requestedGoalId = new URLSearchParams(window.location.search).get("goalId");
    const requestedGoal = goals.find((goal) => goal.id === requestedGoalId);
    if (requestedGoal) setActiveLayer("goal_path");
    setSelectedGoal(
      requestedGoal || activeGoal || goals[0] || null,
    );
  }, [activeGoal, goals]);

  // Filter paths/quests for the selected goal
  const currentGoalPaths = selectedGoal
    ? quests.filter((quest) => quest.goalId === selectedGoal.id)
    : [];

  // Dynamically derive selectedPath from live quests state
  const selectedPath = selectedPathId
    ? quests.find((q) => q.id === selectedPathId) || null
    : null;

  return (
    <div className="w-full flex flex-col items-center">
      {activeLayer === "world" ? (
        <WorldMap
          onSelectLandmark={(landmark) => {
            const goal = goals.find((item) => item.id === landmark.id);
            if (goal) {
              setSelectedGoal(goal);
              setActiveLayer("goal_path");
            }
          }}
        />
      ) : (
        selectedGoal && (
          <GoalPathMap
            goal={selectedGoal}
            paths={currentGoalPaths}
            onBackToWorld={() => setActiveLayer("world")}
            onSelectPath={(path) => setSelectedPathId(path.id)}
          />
        )
      )}

      {/* Path Detail Drawer Overlay */}
      {selectedPath && (
        <PathDetailDrawer
          path={selectedPath}
          onClose={() => setSelectedPathId(null)}
        />
      )}
    </div>
  );
}
