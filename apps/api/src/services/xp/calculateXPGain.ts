/**
 * Calculate XP gain for completing a challenge
 *
 * Combines base XP (by difficulty), first challenge bonus, and streak bonus
 */

import {
  FIRST_CHALLENGE_BONUS,
  STREAK_BONUS_PER_DAY,
  XP_REWARDS,
} from "./constants";
import type { XPGainParams, XPGainResult } from "./types";

/**
 * Calculate the total XP gained from completing a challenge
 *
 * @param params - Parameters for XP calculation
 * @returns Breakdown of XP components and total
 */
export function calculateXPGain(params: XPGainParams): XPGainResult {
  const { difficulty, isFirstChallenge, currentStreak } = params;

  // Base XP from challenge difficulty
  const baseXP = XP_REWARDS[difficulty];

  // First challenge bonus (one-time)
  const firstChallengeBonus = isFirstChallenge ? FIRST_CHALLENGE_BONUS : 0;

  // Streak bonus (linear: 10 XP per consecutive day)
  const streakBonus = currentStreak * STREAK_BONUS_PER_DAY;

  // Total XP
  const total = baseXP + firstChallengeBonus + streakBonus;

  return {
    baseXP,
    firstChallengeBonus,
    streakBonus,
    total,
  };
}
