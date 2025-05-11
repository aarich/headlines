import React from 'react';
import Modal from './common/Modal';
import { ChartPieIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import GuessDisplay from './GuessDisplay';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GUESS = 'onion';

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="How to Play">
    <div className="space-y-4 text-gray-700 dark:text-gray-200">
      <ul className="list-disc pl-6">
        <li>We show you a real headline with one word missing. Your job? Guess that word!</li>
        <li>Play in Normal mode (pick from choices) or go Expert (type your guess).</li>
        <li>Headlines are real stories from the last day or so.</li>
        <li>
          See your progress, past headlines, and more with the{' '}
          <ChartPieIcon className="w-5 h-5 inline" /> button.
        </li>
        <li>
          Headlines are sourced from{' '}
          <a
            href="https://reddit.com/r/nottheonion"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-600"
          >
            r/nottheonion
          </a>
          , a community dedicated to weird (but true!) news.
        </li>
        <li>A new headline drops daily!</li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">Hints</h3>
      <p>
        Stuck? Use the <LightBulbIcon className="w-5 h-5 inline" /> button for a hint:
      </p>
      <ul className="list-decimal pl-6">
        <li>Get the first letter of the word.</li>
        <li>Unlock a short description.</li>
      </ul>
      <p>Your guess is short by four characters:</p>
      <div className="flex justify-center font-bold">
        <GuessDisplay
          currentGuess={GUESS}
          gameState={{ correct: false, wrongGuesses: [] }}
          correctAnswer={GUESS + 'x'.repeat(4)}
        />
      </div>
      <p>Your guess is long by four characters:</p>
      <div className="flex justify-center font-bold">
        <GuessDisplay
          currentGuess={GUESS}
          gameState={{ correct: false, wrongGuesses: [] }}
          correctAnswer={GUESS.slice(0, -4)}
        />
      </div>
      <p>The first character is wrong:</p>
      <div className="flex justify-center font-bold">
        <GuessDisplay
          currentGuess={GUESS}
          gameState={{ correct: false, wrongGuesses: [], hints: { firstChar: true, clue: false } }}
          correctAnswer={'x' + GUESS.slice(1)}
        />
      </div>
      <p>
        The first character is wrong <span className="italic">and</span> the guess is long by four
        characters (what are you doing?):
      </p>
      <div className="flex justify-center font-bold">
        <GuessDisplay
          currentGuess={GUESS}
          gameState={{
            correct: false,
            wrongGuesses: [],
            hints: { firstChar: true, clue: false },
          }}
          correctAnswer={'x' + GUESS.slice(1, -4)}
        />
      </div>
      <h3 className="text-xl font-semibold mt-6">About</h3>
      <p>
        This game was made by{' '}
        <a
          href="https://mrarich.com/about"
          className="text-blue-500 hover:text-blue-600"
          target="_blank"
          rel="noreferrer"
        >
          Alex Rich
        </a>
        . It's open source, so you can peek at the{' '}
        <a
          href="https://github.com/aarich/headlines"
          className="text-blue-500 hover:text-blue-600"
          target="_blank"
          rel="noreferrer"
        >
          code
        </a>
        . Feel free to contribute or report any bugs!
      </p>
      <p>If you like this game, consider sharing it with your friends!</p>
    </div>
  </Modal>
);

export default HelpModal;
