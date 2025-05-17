import React from 'react';
import Modal from './common/Modal';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import GuessDisplay from './GuessDisplay';
import { useSettings } from '../contexts/SettingsContext';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GUESS = 'onion';

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const { colorBlindMode } = useSettings().settings;
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="How to Play" mdSize="3xl">
      <div className="space-y-4 text-gray-700 dark:text-gray-200">
        <ul className="list-disc pl-6">
          <li>We show you a real headline with one word missing. Your job? Guess that word!</li>
          <li>
            Guess by typing the word you think fits. Or, switch off Expert mode to choose from
            pre-selected choices.
          </li>
          <li>
            Headlines are real stories from the last day or so. They come from{' '}
            <a
              href="https://reddit.com/r/nottheonion"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:text-blue-600"
            >
              r/nottheonion
            </a>
            , a community dedicated to weird (but true) news.
          </li>
          <li>A new headline drops daily!</li>
        </ul>

        <h3 className="text-xl font-semibold mt-6">Hints</h3>
        <p>
          Stuck? Use the <LightBulbIcon className="w-5 h-5 inline" /> button for a hint:
        </p>
        <ul className="list-disc pl-6">
          <li>Reveal the next letter of the word.</li>
          <li>Unlock a clue about the word.</li>
        </ul>
        <h3 className="text-xl font-semibold mt-6">Guesses</h3>
        <p>An example, shown with two revealed letter hints:</p>
        <div className="flex justify-center font-bold">
          <GuessDisplay
            currentGuess={GUESS}
            gameState={{
              correct: false,
              wrongGuesses: [],
              hints: { chars: 2, clue: false },
            }}
            correctAnswer={'x' + GUESS.slice(1) + 'x'.repeat(4)}
            forceExpertMode
            prefix=""
            suffix=""
          />
        </div>
        <ul className="list-disc pl-6">
          <li>The first letter is incorrect (red{colorBlindMode ? ' and struck-through' : ''}).</li>
          <li>The second letter is correct (green{colorBlindMode ? ' and underlined' : ''}).</li>
          <li>The rest are unknown.</li>
          <li>The guess is short by four letters.</li>
          {!colorBlindMode && (
            <li>Trouble seeing the colors? Enable colorblind mode in settings.</li>
          )}
        </ul>
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
        <p>If you like this game, consider sharing it with your friends 😇</p>
      </div>
    </Modal>
  );
};

export default HelpModal;
