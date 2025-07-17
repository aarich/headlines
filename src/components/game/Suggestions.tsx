import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { useToast } from 'contexts/ToastContext';
import { createSuggestion, getGameSuggestions, voteForSuggestion } from 'lib/api';
import { formatSuggestionCasing, toastSuccessfulSuggestion } from 'lib/ui';
import React, { useEffect, useState } from 'react';
import { Suggestion, SUGGESTION_SKIPPED } from 'types';
import { useGameState, useHeadline } from '../../contexts/HeadlineContext';

const Suggestions: React.FC = () => {
  const [gameState, setGameState] = useGameState();
  const headline = useHeadline();
  const [suggestionText, setSuggestionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showHelpTooltip, setShowHelpTooltip] = useState(false);
  const [currentTopSuggestionIndex, setCurrentTopSuggestionIndex] = useState(0);
  const toast = useToast();

  useEffect(() => {
    if (gameState.completedAt) {
      setIsLoading(true);
      getGameSuggestions(headline.id)
        .then(data => data.sort((a, b) => b.votes - a.votes))
        .then(sorted => setSuggestions(sorted))
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [gameState.completedAt, headline.id, toast]);

  const handleSuggestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestionText.trim()) return;

    setIsSubmitting(true);
    try {
      const { id } = await createSuggestion(headline.id, suggestionText.trim());
      toastSuccessfulSuggestion(toast);
      setGameState(prev => ({ ...prev, suggestion: suggestionText.trim(), votes: [id] }));
      setSuggestionText('');
      getGameSuggestions(headline.id).then(setSuggestions).catch(console.error);
    } catch (error: any) {
      console.error('Failed to submit suggestion:', error);
      toast(`Error: ${error.message || 'Could not submit suggestion.'}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipSuggestion = () => {
    if (
      window.confirm(
        "Are you sure you want to skip? You won't be able to submit a suggestion for this headline."
      )
    ) {
      setGameState(prev => ({ ...prev, suggestion: SUGGESTION_SKIPPED }));
    }
  };

  const handleVote = async (suggestionId: number) => {
    try {
      await voteForSuggestion(suggestionId);
      toast('Vote counted!', 'success');
      setSuggestions(prevSuggestions =>
        prevSuggestions
          .map(s => (s.id === suggestionId ? { ...s, votes: s.votes + 1 } : s))
          .sort(
            (a, b) =>
              b.votes - a.votes || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
      );

      setGameState(prev => ({ ...prev, votes: [...(prev.votes ?? []), suggestionId] }));
    } catch (error: any) {
      console.error('Failed to vote:', error);
      toast(`Error: ${error.message || 'Could not record vote.'}`, 'error');
    }
  };

  const currentTopSuggestion = suggestions[currentTopSuggestionIndex];

  const handleNextTopSuggestion = () =>
    setCurrentTopSuggestionIndex(prevIndex => (prevIndex + 1) % suggestions.length);

  const handlePrevTopSuggestion = () =>
    setCurrentTopSuggestionIndex(
      prevIndex => (prevIndex - 1 + suggestions.length) % suggestions.length
    );

  useEffect(() => {
    setCurrentTopSuggestionIndex(0); // Reset index if the suggestions list changes
  }, [suggestions]);

  if (!gameState.completedAt) {
    return null;
  }

  return (
    <div className="mt-4 pt-6 border-t border-gray-200 dark:border-gray-700 w-full">
      <div className="flex items-center justify-center relative mb-2">
        <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
          Your Leek{gameState.suggestion ? 's' : ''}
        </h2>
        <button
          onClick={() => setShowHelpTooltip(!showHelpTooltip)}
          onMouseEnter={() => setShowHelpTooltip(true)}
          onMouseLeave={() => setShowHelpTooltip(false)}
          className="ml-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 focus:outline-none"
          aria-label="What is this?"
        >
          <QuestionMarkCircleIcon className="h-5 w-5" />
        </button>
        {showHelpTooltip && (
          <div
            className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 p-2 text-sm text-white bg-gray-700 dark:bg-gray-800 rounded-md shadow-lg z-10"
            role="tooltip"
          >
            Fill in the blank with your own funny take on the headline! Top-voted "leeks" get
            featured.
          </div>
        )}
      </div>
      {!gameState.suggestion ? (
        <form onSubmit={handleSuggestionSubmit} className="mb-6">
          <label
            htmlFor="suggestionInput"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            <span className="italic">
              {headline.beforeBlank}
              <span className="font-bold">{suggestionText || '_______'}</span>
              {headline.afterBlank}
            </span>
          </label>
          <div className="max-w-sm">
            <input
              type="text"
              id="suggestionInput"
              value={suggestionText}
              onChange={e => setSuggestionText(e.target.value)}
              placeholder="Got a funnier leek?"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-200"
              maxLength={250}
              required
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
            />
          </div>
          <div className="mt-3 flex items-center space-x-2">
            <button
              type="submit"
              disabled={isSubmitting || !suggestionText.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 dark:disabled:bg-gray-500"
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
            <button
              type="button"
              onClick={handleSkipSuggestion}
              disabled={isSubmitting}
              className="px-4 py-2 border-2 border-gray-500 text-gray-500 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700/30 transition-colors disabled:opacity-50 dark:border-gray-400 dark:text-gray-400"
            >
              Skip
            </button>
          </div>
        </form>
      ) : (
        gameState.suggestion &&
        gameState.suggestion !== SUGGESTION_SKIPPED && (
          <p className="text-center text-gray-600 dark:text-gray-400 mb-6 text-sm italic">
            You submitted: "{gameState.suggestion}"
          </p>
        )
      )}

      {/* Display suggestions only after user has submitted their own */}
      {gameState.suggestion && (
        <>
          {isLoading ? (
            <p className="text-center text-gray-600 dark:text-gray-400">
              Fetching the freshest leeks...
            </p>
          ) : (
            <>
              {suggestions.length > 1 && currentTopSuggestion ? (
                <div className="mb-8 text-center">
                  <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    <p className="text-lg sm:text-xl text-gray-800 dark:text-gray-200 mb-1 min-h-[3em] flex flex-col items-center justify-center">
                      <span>
                        {headline.beforeBlank}
                        <span className="font-bold">
                          {formatSuggestionCasing(
                            currentTopSuggestion.suggestionText,
                            headline.correctAnswer
                          )}
                        </span>
                        {headline.afterBlank}
                      </span>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Votes: {currentTopSuggestion.votes}
                    </p>
                    {suggestions.length > 1 && (
                      <div className="flex justify-center items-center space-x-3">
                        <button
                          onClick={handlePrevTopSuggestion}
                          className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                          aria-label="Previous suggestion"
                        >
                          &lt;
                        </button>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {currentTopSuggestionIndex + 1} / {suggestions.length}
                        </span>
                        <button
                          onClick={handleNextTopSuggestion}
                          className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                          aria-label="Next suggestion"
                        >
                          &gt;
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}

              {suggestions.length > 1 ? (
                <div>
                  <ul className="space-y-3">
                    {suggestions.map(suggestion => (
                      <li
                        key={suggestion.id}
                        className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md shadow-sm flex justify-between items-center"
                      >
                        <p className="text-gray-700 dark:text-gray-300 flex-grow mr-2">
                          {formatSuggestionCasing(
                            suggestion.suggestionText,
                            headline.correctAnswer
                          )}
                        </p>
                        <button
                          onClick={() => handleVote(suggestion.id)}
                          className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-600"
                          disabled={gameState.votes?.includes(suggestion.id)}
                          title={
                            gameState.votes?.includes(suggestion.id) ? 'Already voted' : 'Vote'
                          }
                        >
                          Vote ({suggestion.votes})
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                // This message shows if, after loading, the suggestions list is empty
                <p className="text-center text-gray-600 dark:text-gray-400 mb-6 text-sm">
                  No other leeks submitted yet. Check back later to see what others came up with!
                </p>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default Suggestions;
