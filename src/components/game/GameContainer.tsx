import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Headline, GameState } from 'types';
import { useSettings } from 'contexts/SettingsContext';
import HeadlineDisplay from './HeadlineDisplay';
import AnswerWheel, { PLACEHOLDER_VALUE } from './AnswerWheel';
import ExpertInput from './ExpertInput';
import ShareButtons from 'components/ShareButtons';
import { checkAnswer, getNextHint, getNextHintPrompt, getNextRevealType } from 'lib/game';
import { incrementStat, saveResult } from 'lib/storage';
import { LightBulbIcon } from '@heroicons/react/24/outline';
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
    if (gameState.correct) {
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
  }, [gameState.completedAt, gameState.correct, toast]);

  const handleGuess = useCallback(() => {
    if (!currentGuess) return;
    const isCorrect = checkAnswer(currentGuess, headline.correctAnswer, expertMode);

    if (isCorrect) {
      setCurrentGuess(headline.correctAnswer);
      setGameState(prev => ({ ...prev, correct: true, completedAt: Date.now() }));
      incrementStat('totalPlays');
      if (gameState.wrongGuesses.length === 0) {
        incrementStat('firstGuessCorrectCount');
      }
      saveResult(headline, new Date(), gameState.wrongGuesses.length, expertMode);
      recordGameCompleted(headline.id, { guesses: gameState.wrongGuesses.map(g => g.guess) });
    } else {
      expertInputRef.current?.focus();

      if (gameState.wrongGuesses.find(g => g.guess === currentGuess)) {
        toast('Already guessed!', 'warning');
        return;
      } else {
        toastWrongAnswer(toast);
      }
      incrementStat('totalIncorrectGuesses');
      setGameState(({ wrongGuesses, ...rest }) => ({
        ...rest,
        wrongGuesses: [...wrongGuesses, { guess: currentGuess, timestamp: Date.now() }],
      }));
      if (expertMode) {
        setCurrentGuess('');
      }
    }
  }, [currentGuess, gameState, headline, setGameState, expertMode, toast]);

  useEffect(() => {
    if (!gameState.correct) {
      const handleKeyPress = ({ key }: { key: string }) =>
        key === 'Enter' && !gameState.correct && handleGuess();

      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [handleGuess, gameState.correct]);

  const nextHintType = getNextRevealType(gameState.hints, headline.correctAnswer, expertMode);

  const onHintClick = useCallback(() => {
    if (nextHintType) {
      if (window.confirm(getNextHintPrompt(gameState, headline.correctAnswer, expertMode))) {
        setGameState(g => ({ ...g, hints: getNextHint(headline, g, expertMode) }));
        toast('Hint revealed!', 'info');
      }
    }
  }, [nextHintType, gameState, headline, setGameState, expertMode, toast]);

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
          isGameOver={gameState.correct}
          gameState={gameState}
        />
        <div className="flex flex-col items-center w-full">
          <div className="w-full flex justify-center">
            {gameState.correct ? null : expertMode ? (
              <ExpertInput
                ref={expertInputRef}
                onSetGuess={setCurrentGuess}
                currentGuess={currentGuess}
              />
            ) : (
              <AnswerWheel choices={headline.possibleAnswers} onSetGuess={setCurrentGuess} />
            )}
          </div>

          {gameState.correct ? (
            <div className="w-full">
              <ShareButtons gameState={gameState} headline={headline} isExpert={expertMode} />{' '}
            </div>
          ) : (
            <div className={'grid grid-cols-3 items-center gap-4 mt-4 w-full'}>
              <div />
              <button
                className="justify-self-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleGuess}
                disabled={!currentGuess || currentGuess === PLACEHOLDER_VALUE}
              >
                Submit
              </button>
              {nextHintType ? (
                <button
                  className="justify-self-start  text-gray-700 dark:text-gray-200"
                  title={'Get a hint'}
                  onClick={onHintClick}
                >
                  <LightBulbIcon className="w-5 h-5" />
                </button>
              ) : (
                <div />
              )}
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
