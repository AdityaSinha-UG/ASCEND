export interface WorldLandmark {
  id: string;
  title: string;
  category: "main" | "long_term" | "side" | "locked";
  icon: string;
  progress?: number;
  status: "available" | "in_progress" | "completed" | "locked";
  position: { x: number; y: number }; // percentage coords on desktop map
  description?: string;
}

export interface WorldThemeConfig {
  id: string;
  name: string;
  bgGradient: string;
  landmarks: WorldLandmark[];
}

export const PROGRAMMING_THEME: WorldThemeConfig = {
  id: "ascend-world",
  name: "Your ASCEND World",
  bgGradient: "radial-gradient(ellipse at center, rgba(31, 27, 24, 0.9) 0%, rgba(13, 11, 10, 0.98) 100%)",
  // Goal landmarks are supplied from the authenticated user's database rows.
  landmarks: [],
};
