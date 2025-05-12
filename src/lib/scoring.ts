import { Score } from '../types';

export const getCurrentStreak = (scores: Score[], latestGameNum: number) => {
  // Sort the scores by game number biggest to smallest
  const sortedScores = scores.sort((a, b) => b.n - a.n);

  let streak = 0;

  // If the latest score is not the first score, return 0.
  if (sortedScores.length === 0 || latestGameNum > sortedScores[0].n) {
    return streak;
  }

  streak = 1;

  // Get the streak by checking if the next score is consecutive.
  for (let i = 0; i < sortedScores.length - 1; i++) {
    if (sortedScores[i].n - sortedScores[i + 1].n === 1) {
      streak++;
    } else {
      return streak;
    }
  }

  return streak;
};
