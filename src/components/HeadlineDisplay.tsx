import React from 'react';
import { Headline } from '../types';

interface HeadlineDisplayProps {
  headline: Headline;
  currentGuess: string;
  isGameOver: boolean;
}

const HeadlineDisplay: React.FC<HeadlineDisplayProps> = ({
  headline,
  currentGuess,
  isGameOver,
}) => {
  return (
    <div className="mb-12 text-2xl md:text-3xl lg:text-4xl font-semibold text-center text-gray-800 dark:text-gray-100 leading-relaxed">
      {isGameOver ? (
        <div className="flex flex-col items-center">
          <a
            href={headline.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {headline.headline}
          </a>
          <a
            href={headline.articleUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-500 dark:text-gray-400 mt-1"
          >
            {headline.articleUrl}
          </a>
        </div>
      ) : (
        <>
          <div>{headline.beforeBlank}</div>
          <div
            className={`inline-block align-middle mt-5 mb-5 ${currentGuess ? 'font-black ' : ''}`}
          >
            {currentGuess ? currentGuess : <>[???]</>}
          </div>
          <div>{headline.afterBlank}</div>
        </>
      )}
    </div>
  );
};

export default HeadlineDisplay;
