import React from 'react';
import { GameState } from '../types';
import { useSettings } from '../contexts/SettingsContext';

interface GuessDisplayProps {
  currentGuess: string;
  gameState: GameState;
  correctAnswer: string;
  forceExpertMode?: boolean;
  /** prefix and suffix are in case the removed word is quoted or otherwise surrounded by punction */
  prefix: string;
  suffix: string;
}

type CharDisplay = { char: string; className?: string };

const WRONG_CHAR_CLASS = 'text-red-500';
const CORRECT_CHAR_CLASS = 'text-green-500';
const GHOST_CHAR_CLASS = 'text-gray-500';
const SPACE_CHAR_CLASS = 'font-normal tracking-widest';

const GuessDisplay: React.FC<GuessDisplayProps> = ({
  currentGuess,
  gameState: { hints },
  correctAnswer,
  forceExpertMode,
  prefix,
  suffix,
}) => {
  const { expertMode, colorBlindMode } = useSettings().settings;

  const isExpertMode = forceExpertMode || expertMode;

  const wrongCharClass = WRONG_CHAR_CLASS + (colorBlindMode ? ' line-through' : '');
  const correctCharClass = CORRECT_CHAR_CLASS + (colorBlindMode ? ' underline' : '');

  const chars: CharDisplay[] = [];
  const numCharsToDisplay = isExpertMode
    ? Math.max(currentGuess.length, correctAnswer.length)
    : currentGuess.length;

  for (let i = 0; i < numCharsToDisplay; i++) {
    if (i > currentGuess.length - 1) {
      // No guess yet. If the letter was revealed already, show it as a ghost. Otherwise, show a space.
      if (hints?.chars && i < hints.chars) {
        chars.push({ char: correctAnswer[i], className: GHOST_CHAR_CLASS });
      } else {
        chars.push({ char: ' ' });
      }
    } else if (i > correctAnswer.length - 1) {
      // Extra guess
      const className = forceExpertMode ? wrongCharClass : undefined;
      chars.push({ char: currentGuess[i], className });
    } else if (i >= (hints?.chars ?? 0)) {
      // No information about this character
      chars.push({ char: currentGuess[i] });
    } else if (currentGuess[i].toLowerCase() === correctAnswer[i].toLowerCase()) {
      // Correct character
      chars.push({ char: currentGuess[i], className: correctCharClass });
    } else {
      // Wrong character
      chars.push({ char: currentGuess[i], className: wrongCharClass });
    }
  }

  return (
    <>
      <span>{prefix}</span>
      {chars.map(({ char, className = '' }, index) => {
        const isSpace = char === ' ';
        return (
          <span
            key={`${index}-${char}`}
            className={`${className} ${isSpace ? SPACE_CHAR_CLASS : ''}`}
          >
            {isSpace && forceExpertMode ? 'ˍ' : char}
          </span>
        );
      })}
      <span>{suffix}</span>
    </>
  );
};

export default GuessDisplay;
