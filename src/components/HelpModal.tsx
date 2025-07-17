import React from 'react';
import Modal from 'components/common/Modal';
import { EyeIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import GuessDisplay from 'components/game/GuessDisplay';
import { useSettings } from 'contexts/SettingsContext';
import { Hint } from 'types';
import { HeadlineProvider } from 'contexts/HeadlineContext';

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
          <li>Your job? Guess the missing word from a real headline!</li>
          <li>
            Guess by typing the word you think fits. Or, switch off Expert mode to choose from
            pre-selected choices.
          </li>
          <li>
            Headlines are real, recent stories. They come from{' '}
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
        <p>Stuck? Get a hint:</p>
        <ul className="list-none pl-3">
          <li>
            <EyeIcon className="w-5 h-5 inline" />
            &nbsp; Reveal the next letter of the word (expert mode only)
          </li>
          <li>
            <LightBulbIcon className="w-5 h-5 inline" />
            &nbsp; Get a clue about the word
          </li>
        </ul>
        <h3 className="text-xl font-semibold mt-6">Guesses</h3>
        <p>An example with two revealed letter hints:</p>
        <div className="flex justify-center font-bold">
          <HeadlineProvider
            state={{ headline: undefined, game: [{ actions: [Hint.CHAR, Hint.CHAR] }, () => {}] }}
          >
            <GuessDisplay
              currentGuess={GUESS}
              correctAnswer={'x' + GUESS.slice(1) + 'x'.repeat(4)}
              forceExpertMode
              prefix=""
              suffix=""
            />
          </HeadlineProvider>
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
          . To share feedback or report an issue,{' '}
          <a
            href="https://mrarich.com/contact?m=Feedback for Leeks:%20"
            className="text-blue-500 hover:text-blue-600"
            target="_blank"
            rel="noreferrer"
          >
            contact
          </a>{' '}
          me!
        </p>
        <p>If you like this game, consider sharing it with your friends 😇</p>
      </div>
    </Modal>
  );
};

export default HelpModal;
