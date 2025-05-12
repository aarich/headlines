import React, { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { Headline, GameState } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import HeadlineDisplay from './HeadlineDisplay';
import AnswerWheel from './AnswerWheel';
import ExpertInput from './ExpertInput';
import ShareButtons from './ShareButtons';
import { checkAnswer, getNextHint, getNextHintPrompt, getNextRevealType } from '../lib/game';
import { incrementStat, saveResult } from '../lib/storage';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import { useToast } from '../contexts/ToastContext';
import { recordGameCompleted } from '../lib/api';
import { toastWrongAnswer } from '../lib/ui';
import WrongGuessList from './WrongGuessList';

interface GameContainerProps {
  headline: Headline;
  gameState: GameState;
  setGameState: Dispatch<SetStateAction<GameState>>;
}

const GameContainer: React.FC<GameContainerProps> = ({ headline, gameState, setGameState }) => {
  const { expertMode } = useSettings().settings;
  const [currentGuess, setCurrentGuess] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const expertInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (gameState.correct && !isGameOver) {
      setIsGameOver(true);
      const hasIdParam = window.location.search.includes('id=');
      if (hasIdParam) {
        toast('Great job!', 'success');
      } else {
        toast('Great job today!', 'success');
      }
    }
  }, [gameState.correct, isGameOver, toast]);

  const handleGuess = useCallback(() => {
    if (!currentGuess) return;
    const isCorrect = checkAnswer(currentGuess, headline.correctAnswer, expertMode);
    setIsGameOver(isCorrect);

    if (isCorrect) {
      toast('Nice!', 'success');
      setCurrentGuess(headline.correctAnswer);
      setGameState(prev => ({ ...prev, correct: true }));
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
    if (!isGameOver) {
      const handleKeyPress = ({ key }: { key: string }) =>
        key === 'Enter' && !isGameOver && handleGuess();

      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [handleGuess, isGameOver]);

  const nextHintType = getNextRevealType(gameState.hints, headline.correctAnswer);

  const onHintClick = useCallback(() => {
    if (nextHintType) {
      if (window.confirm(getNextHintPrompt(gameState, headline.correctAnswer, expertMode))) {
        setGameState(g => ({ ...g, hints: getNextHint(headline, g) }));
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
          isGameOver={isGameOver}
          gameState={gameState}
        />
        <div className="flex flex-col items-center w-full">
          <div className="w-full flex justify-center">
            {isGameOver ? null : expertMode ? (
              <ExpertInput
                ref={expertInputRef}
                onSetGuess={setCurrentGuess}
                currentGuess={currentGuess}
              />
            ) : (
              <AnswerWheel choices={headline.possibleAnswers} onSetGuess={setCurrentGuess} />
            )}
          </div>

          {/* Button row: grid for game, flex for share */}
          <div
            className={
              isGameOver
                ? 'flex justify-center mt-4 w-full'
                : 'grid grid-cols-3 items-center gap-4 mt-4 w-full'
            }
          >
            {isGameOver ? (
              <ShareButtons gameState={gameState} headline={headline} isExpert={expertMode} />
            ) : (
              <>
                <div />
                <button
                  className="justify-self-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                  onClick={handleGuess}
                  disabled={!currentGuess}
                >
                  Submit
                </button>
                {nextHintType ? (
                  <button
                    className="justify-self-start py-2 text-white transition-colors"
                    title={nextHintType ? 'Get a hint' : 'No more hints available'}
                    onClick={onHintClick}
                  >
                    <LightBulbIcon className="w-5 h-5" />
                  </button>
                ) : (
                  <div />
                )}
              </>
            )}
          </div>

          {gameState.hints?.clue && (
            <div className="mt-4 w-full max-w-md">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Hint: {headline.hint}
              </div>
            </div>
          )}

          <WrongGuessList guesses={gameState.wrongGuesses} />
        </div>
      </section>
    </>
  );
};

export default GameContainer;
