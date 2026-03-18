/**
 * XP System Constants
 *
 * All configuration values for the XP and ranking system
 */

// Rank thresholds based on total XP
// Based on ~150 challenges (60 easy, 60 medium, 30 hard) = ~15,000 XP total
// Legend rank achievable at ~80% completion (12,000 XP / ~120 challenges)
export const RANK_THRESHOLDS = [
  { name: "Novice", minXp: 0 },
  { name: "Beginner", minXp: 300 }, // ~3-6 challenges (2-4%)
  { name: "Advanced", minXp: 1200 }, // ~12-18 challenges (8-12%)
  { name: "Expert", minXp: 3500 }, // ~35 challenges (23%)
  { name: "Master", minXp: 7000 }, // ~70 challenges (47%)
  { name: "Legend", minXp: 12000 }, // ~120 challenges (80%)
] as const;

// XP rewards based on challenge difficulty
export const XP_REWARDS = {
  easy: 50,
  medium: 100,
  hard: 200,
} as const;

// First challenge bonus (awarded once per user)
export const FIRST_CHALLENGE_BONUS = 50;

// Streak bonus: +10 XP per consecutive day
export const STREAK_BONUS_PER_DAY = 10;

// Maximum days to look back for streak calculation
export const MAX_STREAK_WINDOW_DAYS = 90;
