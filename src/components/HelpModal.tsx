import React from 'react';
import Modal from './common/Modal';
import { LightBulbIcon } from '@heroicons/react/24/outline';
import GuessDisplay from './GuessDisplay';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="How to Play">
    <div className="space-y-4 text-gray-700 dark:text-gray-200">
      <p>Guess the missing word in one of yesterday's real news headlines.</p>
      <ul className="list-disc pl-6">
        <li>One new headline every day.</li>
        <li>Turn off expert mode to enable multiple choice.</li>
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
          .
        </li>
      </ul>

      <h3 className="text-xl font-semibold mt-6">Hints</h3>
      <p>
        Clicking <LightBulbIcon className="w-5 h-5 inline" /> reveals a hint:
      </p>
      <ul className="list-decimal pl-6">
        <li>Reveal the length of the missing word</li>
        <li>Reveal the first letter of the missing word</li>
        <li>Reveal a description</li>
      </ul>
      <p>Your guess is short by four characters:</p>
      <div className="flex justify-center font-bold">
        <GuessDisplay
          currentGuess="pancakes"
          feedback={{ correct: false, wrongGuesses: [], hintCharCount: 'pancakes'.length + 4 }}
        />
      </div>
      <p>Your guess is long by four characters:</p>
      <div className="flex justify-center font-bold">
        <GuessDisplay
          currentGuess="pancakes"
          feedback={{ correct: false, wrongGuesses: [], hintCharCount: 'pancakes'.length - 4 }}
        />
      </div>
      <p>The first character is wrong:</p>
      <div className="flex justify-center font-bold">
        <GuessDisplay
          currentGuess="pancakes"
          feedback={{ correct: false, wrongGuesses: [], hintFirstChar: 'x' }}
        />
      </div>
      <p>
        The first character is wrong <span className="italic">and</span> the guess is long by four
        characters (what are you doing?):
      </p>
      <div className="flex justify-center font-bold">
        <GuessDisplay
          currentGuess="pancakes"
          feedback={{
            correct: false,
            wrongGuesses: [],
            hintFirstChar: 'x',
            hintCharCount: 'pancakes'.length - 4,
          }}
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
        . It's open source, meaning you can look at the{' '}
        <a
          href="https://github.com/aarich/headlines"
          className="text-blue-500 hover:text-blue-600"
          target="_blank"
          rel="noreferrer"
        >
          code
        </a>
        . Feel free to contribute or raise bugs.
      </p>
      <p>If you like this game, consider sharing it with your friends!</p>
    </div>
  </Modal>
);

export default HelpModal;
