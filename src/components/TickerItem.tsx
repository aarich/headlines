import React from 'react';
import { HeadlineHistory } from '../types';
import { timeSince } from '../lib/ui';
import { PlayIcon } from '@heroicons/react/24/outline';

interface TickerItemProps {
  headline: HeadlineHistory;
  revealWord: boolean;
  isLatest: boolean;
}

const TickerItem: React.FC<TickerItemProps> = ({
  headline: {
    beforeBlank,
    afterBlank,
    publishTime,
    totalCorrectGuesses,
    totalPlays,
    firstGuessCorrectCount,
    wrongGuesses,
    articleUrl,
    redditUrl,
    headline,
    id,
  },
  revealWord,
  isLatest,
}) => {
  const articleSite = articleUrl.split('/')[2];

  const percentSolved = (100 * totalCorrectGuesses) / (totalPlays || 1);
  const percentFirstTry = (100 * firstGuessCorrectCount) / (totalPlays || 1);
  return (
    <div className="mb-2 p-2 rounded bg-gray-100 dark:bg-gray-700">
      {/* HEADLINE */}
      <a
        className="italic underline text-blue-500"
        href={articleUrl}
        target="_blank"
        rel="noopener noreferrer"
      >
        {revealWord ? headline : `${beforeBlank} [???] ${afterBlank}`}
      </a>
      <div className="text-xs text-gray-500 mb-1">
        <span className="font-light text-xs text-gray-500">{articleSite}</span>
        <span className="mx-1">•</span>
        {timeSince(new Date(publishTime), 'h')} ago
      </div>

      {/* WRONG GUESSES */}
      {wrongGuesses.length > 0 ? (
        <div className="mt-1 text-xs">
          <span>
            Top wrong guesses:{' '}
            {wrongGuesses
              .sort((g1, g2) => g1.count - g2.count)
              .slice(0, 5)
              .map(g => g.word)
              .join(', ')}
          </span>
        </div>
      ) : null}

      {/* STATS + LINKS */}
      <div className="flex flex-wrap text-sm flex-row justify-between">
        <span className="flex flex-row gap-4">
          <span>
            Solved: <b>{percentSolved.toFixed(0)}%</b>
          </span>
          <span>
            First try: <b>{percentFirstTry.toFixed(0)}%</b>
          </span>
        </span>
        <span className="px-2">
          <a href={isLatest ? '/' : `/?id=${id}`} className="pr-4" title="Play this headline">
            <PlayIcon className="w-5 h-5 inline-block" />
          </a>
          <a href={redditUrl} target="_blank" rel="noopener noreferrer" title="View on Reddit">
            <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
            </svg>
          </a>
        </span>
      </div>
    </div>
  );
};

export default TickerItem;
