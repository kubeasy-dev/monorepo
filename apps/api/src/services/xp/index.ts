/**
 * XP Service - Centralized XP calculation logic
 *
 * This module provides pure functions for calculating:
 * - User streaks (consecutive days)
 * - User levels/ranks (based on total XP)
 * - XP gains (from challenge completions)
 *
 * All functions are tested with comprehensive test coverage
 */

export { calculateLevel } from "./calculateLevel";
// Core functions
export { calculateStreak } from "./calculateStreak";
export { calculateXPGain } from "./calculateXPGain";

// Constants
export {
  FIRST_CHALLENGE_BONUS,
  MAX_STREAK_WINDOW_DAYS,
  RANK_THRESHOLDS,
  STREAK_BONUS_PER_DAY,
  XP_REWARDS,
} from "./constants";

// Types
export type {
  ChallengeDifficulty,
  RankInfo,
  RankName,
  XPGainParams,
  XPGainResult,
} from "./types";
