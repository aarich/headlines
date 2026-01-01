import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Hint } from 'types';
import { useSettings } from 'contexts/SettingsContext';
import HeadlineDisplay from './HeadlineDisplay';
import AnswerWheel, { PLACEHOLDER_VALUE } from './AnswerWheel';
import ExpertInput from './ExpertInput';
import ShareButtons from 'components/ShareButtons';
import {
  checkAnswer,
  countWrongGuesses,
  getHintPenalty,
  getHintPrompt,
  getWrongGuesses,
  isHintAvailable,
} from 'lib/game';
import { incrementStat, saveResult } from 'lib/storage';
import { EyeIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import { useToast } from 'contexts/ToastContext';
import { recordGameCompleted } from 'lib/api';
import { toastWrongAnswer } from 'lib/ui';
import HintsAndGuesses from './HintsAndGuesses';
import Suggestions from './Suggestions';
import { useGameState, useHeadline } from 'contexts/HeadlineContext';

const GameContainer: React.FC = () => {
  const [gameState, setGameState] = useGameState();
  const headline = useHeadline();
  const { expertMode } = useSettings().settings;
  const [currentGuess, setCurrentGuess] = useState('');
  const expertInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (gameState.completedAt) {
      const hasParam =
        window.location.search.includes('id=') || window.location.search.includes('game=');
      // If it's like domain.com/[game]
      const hasUrlSegment = window.location.pathname.split('/').length > 1;
      if (hasParam || hasUrlSegment) {
        toast('Great job!', 'success');
      } else {
        // We are on today's game. If it was completed in the last ~5 seconds, it means we just completed it
        // and should say "Nice". If it's older than that, say "Great job today" as a reminder the game is already won.
        const isOlderThanFiveSeconds = Date.now() - gameState.completedAt! > 5000;
        if (gameState.completedAt)
          toast(isOlderThanFiveSeconds ? 'Great job today!' : 'Nice!', 'success');
      }
    }
  }, [gameState.completedAt, toast]);

  const handleGuess = useCallback(() => {
    if (!currentGuess) return;
    const isCorrect = checkAnswer(currentGuess, headline.correctAnswer);

    if (isCorrect) {
      setCurrentGuess(headline.correctAnswer);
      setGameState(prev => ({ ...prev, correct: true, completedAt: Date.now() }));
      incrementStat('totalPlays');
      if (!countWrongGuesses(gameState)) {
        incrementStat('firstGuessCorrectCount');
      }
      saveResult(headline, new Date(), countWrongGuesses(gameState), expertMode);
      recordGameCompleted(headline.id, getWrongGuesses(gameState));
    } else {
      expertInputRef.current?.focus();

      if (getWrongGuesses(gameState).find(g => g === currentGuess)) {
        toast('Already guessed!', 'warning');
        return;
      } else {
        toastWrongAnswer(toast);
      }
      incrementStat('totalIncorrectGuesses');
      setGameState(({ actions = [], ...rest }) => ({
        ...rest,
        actions: [...actions, currentGuess],
      }));
      if (expertMode) {
        setCurrentGuess('');
      }
    }
  }, [currentGuess, gameState, headline, setGameState, expertMode, toast]);

  useEffect(() => {
    if (!gameState.completedAt) {
      const handleKeyPress = ({ key }: { key: string }) => key === 'Enter' && handleGuess();

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [handleGuess, gameState.completedAt]);

  const onHintClick = useCallback(
    (hintType: Hint) => {
      if (window.confirm(getHintPrompt(gameState, headline.correctAnswer, hintType))) {
        setGameState(g => ({ ...g, actions: [...(g.actions || []), hintType] }));
        toast('Hint revealed!', 'info');
      }
    },
    [gameState, headline.correctAnswer, setGameState, toast]
  );

  useEffect(() => {
    if (expertMode) {
      setCurrentGuess('');
    }
  }, [expertMode]);

  const renderHintButton = (hintType: Hint) => {
    return (
      <div className="flex flex-col items-center">
        {/* To center the button vertically */}
        <span className="text-xs">&nbsp;</span>
        <button
          className="mb-1 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title={hintType === Hint.CHAR ? 'Reveal a letter' : 'Get a hint'}
          onClick={() => onHintClick(hintType)}
          disabled={!isHintAvailable(expertMode, gameState, headline, hintType)}
        >
          {hintType === Hint.CHAR ? (
            <EyeIcon className="w-5 h-5" />
          ) : (
            <LightBulbIcon className="w-5 h-5" />
          )}
        </button>
        <span className="text-xs text-gray-500">-{getHintPenalty(headline, hintType)} pts</span>
      </div>
    );
  };

  return (
    <>
      <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 sm:p-8 w-full max-w-4xl mx-auto">
        <HeadlineDisplay currentGuess={currentGuess} isGameOver={!!gameState.completedAt} />
        <div className="flex flex-col items-center w-full">
          <div className="w-full flex justify-center">
            {gameState.completedAt ? null : expertMode ? (
              <ExpertInput
                ref={expertInputRef}
                onSetGuess={setCurrentGuess}
                currentGuess={currentGuess}
              />
            ) : (
              <AnswerWheel choices={headline.possibleAnswers} onSetGuess={setCurrentGuess} />
            )}
          </div>

          {gameState.completedAt ? (
            <div className="w-full">
              <ShareButtons />
            </div>
          ) : (
            <div className="grid grid-cols-3 items-center gap-4 mt-4 w-full">
              {expertMode ? renderHintButton(Hint.CHAR) : <div />}

              <button
                className="justify-self-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleGuess}
                disabled={!currentGuess || currentGuess === PLACEHOLDER_VALUE}
              >
                Submit
              </button>

              {renderHintButton(Hint.CLUE)}
            </div>
          )}

          <HintsAndGuesses />

          {process.env.REACT_APP_SHOW_SUGGESTIONS && <Suggestions />}
        </div>
      </section>
    </>
  );
};

export default GameContainer;
