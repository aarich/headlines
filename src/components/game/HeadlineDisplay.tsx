import React from 'react';
import { GameState, Headline } from 'types';
import GuessDisplay from './GuessDisplay';
import SolvedHeadlineDisplay from './SolvedHeadlineDisplay';
import { PLACEHOLDER_VALUE } from './AnswerWheel';

interface HeadlineDisplayProps {
  headline: Headline;
  currentGuess: string;
  isGameOver: boolean;
  gameState: GameState;
}

const HeadlineDisplay: React.FC<HeadlineDisplayProps> = ({
  headline,
  currentGuess,
  isGameOver,
  gameState,
}) => {
  // Initialize processed parts of the headline
  let { beforeBlank, afterBlank } = headline;
  let prefix = '';
  let suffix = '';

  // Regex for boundary characters including various quotes and punctuation
  const boundaryRegex = /[.,;:!?()'"“”‘’]/;

  // Process beforeBlank to extract a potential prefix
  if (beforeBlank.length > 0) {
    const lastChar = beforeBlank.slice(-1);
    if (boundaryRegex.test(lastChar)) {
      prefix = lastChar;
      beforeBlank = beforeBlank.slice(0, -1).trim();
    }
  }

  // Process afterBlank to extract a potential suffix
  if (afterBlank.length > 0) {
    const firstChar = afterBlank.slice(0, 1);
    if (boundaryRegex.test(firstChar)) {
      suffix = firstChar;
      afterBlank = afterBlank.slice(1).trim();
    }
  }

  return (
    <div
      className={`${isGameOver ? 'mb-3' : 'mb-6'} text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-center text-gray-800 dark:text-gray-100 leading-relaxed px-2`}
    >
      {isGameOver ? (
        <SolvedHeadlineDisplay headline={headline} />
      ) : (
        <div className="mb-6">
          <div>{beforeBlank}</div>
          <div className={`inline-block align-middle mt-2 mb-2 `}>
            {/* If currentGuess is PLACEHOLDER_VALUE, it means "Choose one →" is selected in AnswerWheel. */}
            {/* In that case, display underscores. Otherwise, display the actual currentGuess. */}
            <GuessDisplay
              currentGuess={currentGuess === PLACEHOLDER_VALUE ? '__________' : currentGuess}
              gameState={gameState}
              correctAnswer={headline.correctAnswer}
              prefix={prefix}
              suffix={suffix}
            />
          </div>
          <div>{afterBlank}</div>
        </div>
      )}
    </div>
  );
};

export default HeadlineDisplay;
