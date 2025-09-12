import React from 'react';
import { Hint } from 'types';
import { useSettings } from 'contexts/SettingsContext';
import { useGameState } from 'contexts/HeadlineContext';

interface GuessDisplayProps {
  currentGuess: string;
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
const SPACE_CHAR_CLASS = 'font-normal tracking-[0.25em]';

const GuessDisplay: React.FC<GuessDisplayProps> = ({
  currentGuess,
  correctAnswer,
  forceExpertMode,
  prefix,
  suffix,
}) => {
  const [{ actions = [] }] = useGameState();
  const { expertMode: expertModeSetting, colorBlindMode } = useSettings().settings;

  const isExpertMode = forceExpertMode || expertModeSetting;

  const wrongCharClass = WRONG_CHAR_CLASS + (colorBlindMode ? ' line-through' : '');
  const correctCharClass = CORRECT_CHAR_CLASS + (colorBlindMode ? ' underline' : '');

  const chars: CharDisplay[] = [];
  const numCharsToDisplay = isExpertMode
    ? Math.max(currentGuess.length, correctAnswer.length)
    : currentGuess.length;

  for (let i = 0; i < numCharsToDisplay; i++) {
    const numCharHints = actions?.filter(a => a === Hint.CHAR).length ?? 0;
    if (i > currentGuess.length - 1) {
      // No guess yet. If the letter was revealed already, show it as a ghost. Otherwise, show a space.
      if (i < numCharHints) {
        chars.push({ char: correctAnswer[i], className: GHOST_CHAR_CLASS });
      } else {
        chars.push({ char: ' ' });
      }
    } else if (i > correctAnswer.length - 1) {
      // Extra guess
      const className = isExpertMode ? wrongCharClass : undefined;
      chars.push({ char: currentGuess[i], className });
    } else if (i >= numCharHints) {
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
            {isSpace && isExpertMode ? 'ˍ' : char}
          </span>
        );
      })}
      <span>{suffix}</span>
    </>
  );
};

export default GuessDisplay;
