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
                <div className="relative flex items-center animate-fade-in">
                  {/* Arrow on the left, flush with rectangle */}
                  <svg
                    width="12"
                    height="32"
                    viewBox="0 0 12 32"
                    className="block"
                    style={{ flexShrink: 0 }}
                  >
                    <polygon points="0,16 12,0 12,32" fill="#1f2937" />
                  </svg>
                  <div
                    className="pl-2 pr-3 py-1 bg-gray-800 text-white text-sm rounded shadow-lg flex items-center relative"
                    style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
                  >
                    <span className="mr-2">{headline.correctAnswer.length} letters</span>
                  </div>
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
