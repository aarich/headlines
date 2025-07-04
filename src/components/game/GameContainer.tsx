import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Headline, GameState, Hint } from 'types';
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

interface GameContainerProps {
  headline: Headline;
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
}

const GameContainer: React.FC<GameContainerProps> = ({ headline, gameState, setGameState }) => {
  const { expertMode } = useSettings().settings;
  const [currentGuess, setCurrentGuess] = useState('');
  const expertInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (gameState.completedAt) {
      const hasParam =
        window.location.search.includes('id=') || window.location.search.includes('game=');
      if (hasParam) {
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
    const isCorrect = checkAnswer(currentGuess, headline.correctAnswer, expertMode);

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

  return (
    <>
      <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 sm:p-8 w-full max-w-4xl mx-auto">
        <HeadlineDisplay
          headline={headline}
          currentGuess={currentGuess}
          isGameOver={!!gameState.completedAt}
          gameState={gameState}
        />
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
              <ShareButtons gameState={gameState} headline={headline} isExpert={expertMode} />{' '}
            </div>
          ) : (
            <div className={'grid grid-cols-3 items-center gap-4 mt-4 w-full'}>
              {expertMode ? (
                <div className="flex flex-col items-center">
                  <button
                    className={`mb-1 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={'Reveal a letter'}
                    onClick={() => onHintClick(Hint.CHAR)}
                    disabled={!isHintAvailable(expertMode, gameState, headline, Hint.CHAR)}
                  >
                    <EyeIcon className="w-5 h-5" />
                  </button>
                  <span className="text-xs text-gray-500">
                    -{getHintPenalty(headline, Hint.CHAR)} pts
                  </span>
                </div>
              ) : (
                <div />
              )}

              <button
                className="justify-self-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleGuess}
                disabled={!currentGuess || currentGuess === PLACEHOLDER_VALUE}
              >
                Submit
              </button>

              <div className="flex flex-col items-center">
                <button
                  className="mb-1 text-gray-700 dark:text-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={'Get a hint'}
                  onClick={() => onHintClick(Hint.CLUE)}
                  disabled={!isHintAvailable(expertMode, gameState, headline, Hint.CLUE)}
                >
                  <LightBulbIcon className="w-5 h-5" />
                </button>
                <span className="text-xs text-gray-500">
                  -{getHintPenalty(headline, Hint.CLUE)} pts
                </span>
              </div>
            </div>
          )}

          <HintsAndGuesses headline={headline} gameState={gameState} isExpert={expertMode} />

          <Suggestions headline={headline} gameState={gameState} setGameState={setGameState} />
        </div>
      </section>
    </>
  );
};

export default GameContainer;
