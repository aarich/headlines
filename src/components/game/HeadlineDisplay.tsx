import { GlobeAltIcon } from '@heroicons/react/24/outline';
import { useHeadline } from 'contexts/HeadlineContext';
import { useSettings } from 'contexts/SettingsContext';
import { extractHeadlineParts, MODAL_CLOSE_LISTENERS } from 'lib/ui';
import { getDomainFromUrl } from 'lib/utils';
import React, { useCallback, useEffect, useState } from 'react';
import { PLACEHOLDER_VALUE } from './AnswerWheel';
import GuessDisplay from './GuessDisplay';
import SolvedHeadlineDisplay from './SolvedHeadlineDisplay';

interface HeadlineDisplayProps {
  currentGuess: string;
  isGameOver: boolean;
}

const HeadlineDisplay: React.FC<HeadlineDisplayProps> = ({ currentGuess, isGameOver }) => {
  const headline = useHeadline();
  const { expertMode } = useSettings().settings;
  const [showTooltip, setShowTooltip] = useState(false);

  const { beforeBlank, afterBlank, prefix, suffix } = extractHeadlineParts(
    headline.beforeBlank,
    headline.afterBlank
  );

  const showTooltipWithTimer = useCallback(() => {
    setShowTooltip(true);
    const timer = setTimeout(() => setShowTooltip(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    return expertMode ? showTooltipWithTimer() : setShowTooltip(false);
  }, [expertMode, headline.correctAnswer, showTooltipWithTimer]);

  useEffect(() => {
    MODAL_CLOSE_LISTENERS.add(showTooltipWithTimer);
    return () => {
      MODAL_CLOSE_LISTENERS.delete(showTooltipWithTimer);
    };
  }, [showTooltipWithTimer]);

  return (
    <div
      className={`${isGameOver ? 'mb-3' : 'mb-6'} text-lg sm:text-xl md:text-2xl lg:text-3xl font-semibold text-center text-gray-800 dark:text-gray-100 leading-relaxed px-2`}
    >
      {isGameOver ? (
        <SolvedHeadlineDisplay />
      ) : (
        <>
          <div className="mb-6">
            <div>{beforeBlank}</div>
            <div className={`inline-block align-middle mt-2 mb-2 relative`}>
              {/* If currentGuess is PLACEHOLDER_VALUE, it means "Choose one →" is selected in AnswerWheel. */}
              {/* In that case, display underscores. Otherwise, display the actual currentGuess. */}
              <GuessDisplay
                currentGuess={currentGuess === PLACEHOLDER_VALUE ? '__________' : currentGuess}
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
                    <svg height="32" width="105">
                      <path
                        d="M 0 16 L 12 1 L 104 1 L 104 31 L 12 31 Z"
                        fill="#1f2937"
                        stroke="#4b5563"
                        strokeWidth="1"
                      />
                      <text
                        x="55"
                        y="21"
                        fill="white"
                        textAnchor="middle"
                        className="text-sm font-medium"
                      >
                        {headline.correctAnswer.length} characters
                      </text>
                    </svg>
                  </div>
                </div>
              )}
            </div>
            <div>{afterBlank}</div>
          </div>
          {headline.articleUrl && (
            <div
              className="text-sm text-gray-500 dark:text-gray-400 mt-2"
              title="Complete the game to visit the article"
            >
              <GlobeAltIcon className="w-5 h-5 inline-block mr-1" viewBox="0 0 24 24" />
              {getDomainFromUrl(headline.articleUrl)}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default HeadlineDisplay;
