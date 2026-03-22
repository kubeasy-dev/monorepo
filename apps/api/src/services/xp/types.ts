/**
 * TypeScript types for the XP system
 */

import type { RANK_THRESHOLDS } from "./constants";

// Rank name type derived from constants
export type RankName = (typeof RANK_THRESHOLDS)[number]["name"];

// Challenge difficulty type
export type ChallengeDifficulty = "easy" | "medium" | "hard";

// Rank information with progress calculation
export interface RankInfo {
  name: RankName;
  minXp: number;
  nextRankXp: number | null; // null if already at max rank
  progress: number; // 0-100 percentage to next rank
}

// XP gain calculation parameters
export interface XPGainParams {
  difficulty: ChallengeDifficulty;
  isFirstChallenge: boolean;
  currentStreak: number; // Number of consecutive days
}

// XP gain calculation result
export interface XPGainResult {
  baseXP: number;
  firstChallengeBonus: number;
  streakBonus: number;
  total: number;
}
