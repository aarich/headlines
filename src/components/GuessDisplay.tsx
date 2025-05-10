import React from 'react';
import { Feedback } from '../types';
import { hasAnyHints } from '../lib/game';

interface GuessDisplayProps {
  currentGuess: string;
  feedback: Feedback;
}

const GuessDisplay: React.FC<GuessDisplayProps> = ({ currentGuess, feedback }) => {
  if (!hasAnyHints(feedback)) {
    return <>{currentGuess || '[???]'}</>;
  }

  let redChars = '';
  let totalCharsShowing = 0;
  let regularChars = '';
  let greyChars = '';
  let numUnderscores = 0;

  if (feedback.hintFirstChar) {
    if (currentGuess) {
      totalCharsShowing = currentGuess.length;
      if (!currentGuess.toLowerCase().startsWith(feedback.hintFirstChar.toLowerCase())) {
        redChars = currentGuess[0];
        regularChars = currentGuess.slice(1);
      } else {
        regularChars = currentGuess;
      }
    } else {
      totalCharsShowing = 1;
      regularChars = feedback.hintFirstChar;
    }
  } else {
    regularChars = currentGuess;
    totalCharsShowing = currentGuess.length;
  }

  if (feedback.hintCharCount) {
    const lengthDifference = totalCharsShowing - feedback.hintCharCount;
    if (lengthDifference > 0) {
      // too long. show grey chars
      greyChars = currentGuess.slice(feedback.hintCharCount);
      regularChars = regularChars.slice(0, feedback.hintCharCount - (redChars ? 1 : 0));
    } else {
      numUnderscores = Math.abs(lengthDifference);
    }
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
