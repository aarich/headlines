import { Score } from '../types';

export const getCurrentStreak = (scores: Score[], latestId: number) => {
  // Sort the scores by id biggest to smallest
  const sortedScores = scores.sort((a, b) => b.i - a.i);

  let streak = 0;

  // If the latest score is not the first score, return 0.
  if (sortedScores.length === 0 || latestId > sortedScores[0].i) {
    return streak;
  }

  streak = 1;

  // Get the streak by checking if the next score is consecutive.
  for (let i = 0; i < sortedScores.length - 1; i++) {
    if (sortedScores[i].i - sortedScores[i + 1].i === 1) {
      streak++;
    } else {
      return streak;
    }
  }

  return streak;
};
