import React from 'react';
import { GameState } from '../types';

interface GuessDisplayProps {
  currentGuess: string;
  gameState: GameState;
  correctAnswer: string;
}

const GuessDisplay: React.FC<GuessDisplayProps> = ({ currentGuess, gameState, correctAnswer }) => {
  let redChars = '';
  let totalCharsShowing = 0;
  let regularChars = '';
  let greyChars = '';
  let numUnderscores = 0;

  if (gameState.hints?.firstChar) {
    if (currentGuess) {
      totalCharsShowing = currentGuess.length;
      if (!currentGuess.toLowerCase().startsWith(correctAnswer[0].toLowerCase())) {
        redChars = currentGuess[0];
        regularChars = currentGuess.slice(1);
      } else {
        regularChars = currentGuess;
      }
    } else {
      totalCharsShowing = 1;
      regularChars = correctAnswer[0];
    }
  } else {
    regularChars = currentGuess;
    totalCharsShowing = currentGuess.length;
  }

  const charCount = correctAnswer.length;
  const lengthDifference = totalCharsShowing - charCount;
  if (lengthDifference > 0) {
    // too long. show grey chars
    greyChars = currentGuess.slice(charCount);
    regularChars = regularChars.slice(0, charCount - (redChars ? 1 : 0));
  } else {
    numUnderscores = Math.abs(lengthDifference);
  }

  return (
    <>
      <span className="text-red-500">{redChars}</span>
      {regularChars}
      <span className="text-gray-500 font-normal">
        {' _'.repeat(numUnderscores)}
        {greyChars}
      </span>
    </>
  );
};

export default GuessDisplay;
