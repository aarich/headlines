import { Score } from 'types';

export const getCurrentStreak = (scores: Score[], latestGameNum: number) => {
  // Sort the scores by game number biggest to smallest
  const sortedScores = scores.sort((a, b) => b.n - a.n);

  let streak = 0;

  if (sortedScores.length === 0 || latestGameNum > sortedScores[0].n) {
    // If there are no scores, or if the game number for which we're checking the streak (`latestGameNum`)
    // is greater than the game number of the most recent game won by the user,
    // then the current streak is 0 (as they haven't won `latestGameNum` or a more recent game).
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
