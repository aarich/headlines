import React, { useEffect, useState } from 'react';
import { GameState, Headline } from 'types';
import GuessDisplay from './GuessDisplay';
import SolvedHeadlineDisplay from './SolvedHeadlineDisplay';
import { PLACEHOLDER_VALUE } from './AnswerWheel';
import { extractHeadlineParts } from 'lib/ui';
import { useSettings } from 'contexts/SettingsContext';

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
  const { expertMode } = useSettings().settings;
  const [showTooltip, setShowTooltip] = useState(false);

  const { beforeBlank, afterBlank, prefix, suffix } = extractHeadlineParts(
    headline.beforeBlank,
    headline.afterBlank
  );

  useEffect(() => {
    setShowTooltip(expertMode);
    const timer = setTimeout(() => setShowTooltip(false), 3000);
    return () => clearTimeout(timer);
  }, [expertMode, headline.correctAnswer]);

  return (
    <div
      className={`${isGameOver ? 'mb-3' : 'mb-6'} text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-center text-gray-800 dark:text-gray-100 leading-relaxed px-2`}
    >
      {isGameOver ? (
        <SolvedHeadlineDisplay headline={headline} />
      ) : (
        <div className="mb-6">
          <div>{beforeBlank}</div>
          <div className={`inline-block align-middle mt-2 mb-2 relative`}>
            {/* If currentGuess is PLACEHOLDER_VALUE, it means "Choose one →" is selected in AnswerWheel. */}
            {/* In that case, display underscores. Otherwise, display the actual currentGuess. */}
            <GuessDisplay
              currentGuess={currentGuess === PLACEHOLDER_VALUE ? '__________' : currentGuess}
              gameState={gameState}
              correctAnswer={headline.correctAnswer}
              prefix={prefix}
              suffix={suffix}
            />
            {showTooltip && (
              <div
                className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-10"
                style={{ whiteSpace: 'nowrap' }}
                role="tooltip"
              >
                <div className="relative animate-fade-in">
                  <svg height="32" width="100">
                    <path
                      d="M 0 16 L 12 1 L 99 1 L 99 31 L 12 31 Z"
                      fill="#1f2937"
                      stroke="#4b5563"
                      strokeWidth="1"
                    />
                    <text
                      x="55.5"
                      y="21"
                      fill="white"
                      textAnchor="middle"
                      className="text-sm font-medium"
                    >
                      {headline.correctAnswer.length} letters
                    </text>
                  </svg>
                </div>
              </div>
            )}
          </div>
          <div>{afterBlank}</div>
        </div>
      )}
    </div>
  );
};

export default HeadlineDisplay;
