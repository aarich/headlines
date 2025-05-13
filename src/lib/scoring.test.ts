import { getCurrentStreak } from './scoring';
import { Score } from '../types';

// Helper to create a mock Score object, only 'n' (gameNum) is relevant for getCurrentStreak
const createScore = (gameNum: number): Score => ({
  n: gameNum,
  // Other properties are not used by getCurrentStreak, so they can be omitted or set to defaults
  d: Date.now(),
  g: 0,
  e: false,
});

describe('scoring.ts', () => {
  describe('getCurrentStreak', () => {
    it('should return 0 if scores array is empty', () => {
      expect(getCurrentStreak([], 5)).toBe(0);
    });

    it('should return 0 if latestGameNum is greater than the newest score gameNum', () => {
      const scores = [createScore(3), createScore(2)];
      expect(getCurrentStreak(scores, 5)).toBe(0); // User hasn't played game 4 or 5, or didn't win
    });

    it('should return 1 if there is only one score and it matches latestGameNum', () => {
      const scores = [createScore(5)];
      expect(getCurrentStreak(scores, 5)).toBe(1);
    });

    it('should return 1 if the latest score matches latestGameNum but there is no prior consecutive score', () => {
      const scores = [createScore(5), createScore(3)];
      expect(getCurrentStreak(scores, 5)).toBe(1);
    });

    it('should correctly calculate a streak of multiple games ending at latestGameNum', () => {
      const scores = [createScore(5), createScore(4), createScore(3)];
      expect(getCurrentStreak(scores, 5)).toBe(3);
    });

    it('should handle unsorted scores array', () => {
      const scores = [createScore(3), createScore(5), createScore(4)];
      expect(getCurrentStreak(scores, 5)).toBe(3);
    });

    it('should return the correct streak if it is broken before the earliest game', () => {
      const scores = [createScore(5), createScore(4), createScore(2)]; // Streak of 2 (5,4), broken by missing 3
      expect(getCurrentStreak(scores, 5)).toBe(2);
    });

    it('should return 1 if the only score is much older than latestGameNum but is the most recent score', () => {
      // This tests the case where latestGameNum is not strictly greater,
      // so the function proceeds to calculate streak from the most recent score.
      const scores = [createScore(2)];
      expect(getCurrentStreak(scores, 5)).toBe(0); // latestGameNum (5) > sortedScores[0].n (2)

      const scores2 = [createScore(2)];
      expect(getCurrentStreak(scores2, 2)).toBe(1);
    });

    it('should calculate streak correctly even if latestGameNum is older than the most recent score (streak ends at most recent score)', () => {
      // This scenario implies the function calculates the streak based on the scores provided,
      // and latestGameNum is primarily to check if the user *just* completed a game that continues this streak.
      // If latestGameNum < most recent score, it means the user is looking at a past state,
      // but the streak is calculated from the actual latest score.
      const scores = [createScore(10), createScore(9)];
      expect(getCurrentStreak(scores, 8)).toBe(2); // Streak is 2 (10,9), latestGameNum 8 doesn't break it from being calculated
      expect(getCurrentStreak(scores, 9)).toBe(2);
      expect(getCurrentStreak(scores, 10)).toBe(2);
    });

    it('should return 0 if the most recent score does not match latestGameNum and latestGameNum is higher', () => {
      const scores = [createScore(4), createScore(3)];
      expect(getCurrentStreak(scores, 5)).toBe(0);
    });

    it('should handle a long streak correctly', () => {
      const scores = [
        createScore(10),
        createScore(9),
        createScore(8),
        createScore(7),
        createScore(6),
      ];
      expect(getCurrentStreak(scores, 10)).toBe(5);
    });

    it('should handle a streak of 1 when scores are not consecutive from latestGameNum', () => {
      const scores = [createScore(10), createScore(8), createScore(7)];
      expect(getCurrentStreak(scores, 10)).toBe(1); // Streak is just game 10
    });

    it('should handle scores where the most recent is part of a streak, but not starting from latestGameNum', () => {
      const scores = [createScore(8), createScore(7)];
      // If latestGameNum is 10, it means game 10 and 9 were missed or lost.
      expect(getCurrentStreak(scores, 10)).toBe(0);
    });

    it('should correctly identify a streak when latestGameNum is part of it but not the absolute latest score in a hypothetical full list', () => {
      // This tests if the sorting and checking logic works when latestGameNum is "in the middle" of a potential streak
      // if we consider games not in the scores array.
      // However, the function always starts from the highest 'n' in the scores array.
      const scores = [createScore(5), createScore(3), createScore(2)];
      // If latestGameNum is 3, the streak is based on scores ending at 5.
      // The condition `latestGameNum > sortedScores[0].n` (3 > 5) is false.
      // Streak calculation starts from 5. Result is 1.
      expect(getCurrentStreak(scores, 3)).toBe(1);
    });
  });
});
