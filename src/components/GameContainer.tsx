import React, { Dispatch, SetStateAction, useCallback, useEffect, useState } from 'react';
import { Headline, Feedback } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import HeadlineDisplay from './HeadlineDisplay';
import AnswerWheel from './AnswerWheel';
import ExpertInput from './ExpertInput';
import ShareButtons from './ShareButtons';
import { checkAnswer, getNextHint, getNextHintPrompt } from '../lib/game';
import { incrementStat, saveResult } from '../lib/storage';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import { useToast } from '../contexts/ToastContext';
import { recordGameCompleted } from '../lib/api';

interface GameContainerProps {
  headline: Headline;
  feedback: Feedback;
  setFeedback: Dispatch<SetStateAction<Feedback>>;
}

const GameContainer: React.FC<GameContainerProps> = ({ headline, feedback, setFeedback }) => {
  const { settings } = useSettings();
  const [currentGuess, setCurrentGuess] = useState('');
  const [isGameOver, setIsGameOver] = useState(false);
  const toast = useToast();

  useEffect(() => {
    if (feedback.correct && !isGameOver) {
      setIsGameOver(true);
      const hasIdParam = window.location.search.includes('id=');
      if (hasIdParam) {
        toast('Great job!', 'success');
      } else {
        toast('Great job today!', 'success');
      }
    }
  }, [feedback.correct, isGameOver, toast]);

  const handleGuess = useCallback(() => {
    if (!currentGuess) return;
    const isCorrect = checkAnswer(currentGuess, headline.correctAnswer, settings.expertMode);
    setIsGameOver(isCorrect);

    if (isCorrect) {
      toast('Nice!', 'success');
      setCurrentGuess(headline.correctAnswer);
      setFeedback(prev => ({ ...prev, correct: true }));
      incrementStat('totalPlays');
      if (feedback.wrongGuesses.length === 0) {
        incrementStat('firstGuessCorrectCount');
      }
      saveResult(headline.id, new Date(), feedback.wrongGuesses.length, settings.expertMode);
      recordGameCompleted(headline.id, { guesses: feedback.wrongGuesses.map(g => g.guess) });
    } else {
      if (feedback.wrongGuesses.find(g => g.guess === currentGuess)) {
        toast('Already guessed!', 'warning');
        return;
      }
      incrementStat('totalIncorrectGuesses');
      setFeedback(({ wrongGuesses, ...rest }) => ({
        ...rest,
        wrongGuesses: [...wrongGuesses, { guess: currentGuess, timestamp: Date.now() }],
      }));
      if (settings.expertMode) {
        setCurrentGuess('');
      }
    }
  }, [currentGuess, feedback, headline, setFeedback, settings.expertMode, toast]);

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

  const canShowHint = !feedback.hintCharCount || !feedback.hintFirstChar || !feedback.hintText;

  const onHintClick = useCallback(() => {
    if (canShowHint) {
      // eslint-disable-next-line no-restricted-globals
      if (confirm(getNextHintPrompt(feedback))) {
        setFeedback(f => getNextHint(headline, f));
        toast('Hint revealed!', 'info');
      }
    }
  }, [canShowHint, feedback, headline, setFeedback, toast]);

  useEffect(() => {
    if (settings.expertMode) {
      setCurrentGuess('');
    }
  }, [settings.expertMode]);

  return (
    <>
      <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-4 sm:p-8 w-full max-w-4xl mx-auto">
        <HeadlineDisplay
          headline={headline}
          currentGuess={currentGuess}
          isGameOver={isGameOver}
          feedback={feedback}
        />
        <div className="flex flex-col items-center w-full">
          <div className="w-full flex justify-center">
            {isGameOver ? null : settings.expertMode ? (
              <ExpertInput onSetGuess={setCurrentGuess} currentGuess={currentGuess} />
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
              <ShareButtons
                feedback={feedback}
                headline={headline}
                isExpert={settings.expertMode}
              />
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
                {canShowHint ? (
                  <button
                    className="justify-self-start py-2 text-white transition-colors"
                    title={canShowHint ? 'Get a hint' : 'No more hints available'}
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

          {feedback.hintText && (
            <div className="mt-4 w-full max-w-md">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Hint: {feedback.hintText}
              </div>
            </div>
          )}

          {feedback.wrongGuesses.length > 0 && (
            <div className="mt-4 w-full max-w-md">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Guesses: {feedback.wrongGuesses.length}
              </div>
              <div className="space-y-2">
                {feedback.wrongGuesses.map(wrongGuess => (
                  <div
                    key={wrongGuess.timestamp}
                    className="text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 p-2 rounded"
                  >
                    {wrongGuess.guess}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
};

export default GameContainer;
