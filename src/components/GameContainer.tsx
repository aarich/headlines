import React, { useState } from 'react';
import { Headline, Feedback as FeedbackType } from '../types';
import { useSettings } from '../contexts/SettingsContext';
import HeadlineDisplay from './HeadlineDisplay';
import AnswerWheel from './AnswerWheel';
import ExpertInput from './ExpertInput';
import Feedback from './Feedback';
import ShareButtons from './ShareButtons';
import { checkAnswer } from '../lib/game';
import AnimatedBackground from './AnimatedBackground';

interface GameContainerProps {
  headline: Headline;
  onCorrectGuess: () => void;
}

const GameContainer: React.FC<GameContainerProps> = ({ headline, onCorrectGuess }) => {
  const { settings } = useSettings();
  const [currentGuess, setCurrentGuess] = useState('');
  const [feedback, setFeedback] = useState<FeedbackType>({ correct: false, wrongGuesses: [] });
  const [isGameOver, setIsGameOver] = useState(false);

  const handleGuess = React.useCallback(() => {
    if (!currentGuess) return;
    const isCorrect = checkAnswer(currentGuess, headline.correctAnswer, settings.expertMode);
    setIsGameOver(isCorrect);

    if (isCorrect) {
      setCurrentGuess(headline.correctAnswer);
      onCorrectGuess();
      setFeedback(({ wrongGuesses }) => ({ correct: true, wrongGuesses }));
    } else {
      setFeedback(({ wrongGuesses, correct }) => ({
        correct,
        wrongGuesses: [...wrongGuesses, { guess: currentGuess, timestamp: Date.now() }],
      }));
      if (settings.expertMode) {
        setCurrentGuess('');
      }
    }
  }, [currentGuess, headline.correctAnswer, settings.expertMode, onCorrectGuess]);

  React.useEffect(() => {
    if (!isGameOver) {
      const handleKeyPress = ({ key }: { key: string }) =>
        key === 'Enter' && !isGameOver && handleGuess();

      window.addEventListener('keydown', handleKeyPress);
      return () => {
        window.removeEventListener('keydown', handleKeyPress);
      };
    }
  }, [handleGuess, isGameOver]);

  return (
    <>
      {settings.showAnimations && <AnimatedBackground />}
      <section className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 max-w-4xl mx-auto  z-10">
        <HeadlineDisplay headline={headline} currentGuess={currentGuess} isGameOver={isGameOver} />
        <div className="flex flex-col items-center">
          {settings.expertMode ? (
            <ExpertInput
              onSetGuess={setCurrentGuess}
              disabled={isGameOver}
              currentGuess={currentGuess}
            />
          ) : (
            <AnswerWheel
              choices={headline.possibleAnswers}
              onSetGuess={setCurrentGuess}
              disabled={isGameOver}
            />
          )}

          {/* Flex row for enter and share buttons */}
          <div className="flex flex-row items-center justify-center gap-4 mt-4">
            {isGameOver ? (
              <ShareButtons wrongGuesses={feedback.wrongGuesses} />
            ) : (
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                onClick={handleGuess}
                disabled={!currentGuess}
              >
                [enter]
              </button>
            )}
          </div>

          {feedback && feedback.wrongGuesses.length > 0 && (
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

        {isGameOver && feedback && <Feedback feedback={feedback} />}
      </section>
    </>
  );
};

export default GameContainer;
