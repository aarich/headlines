import React from 'react';
import { QuestionMarkCircleIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
  score: number;
  streak: number;
  onSettings: () => void;
  onHelp: () => void;
}

const Header: React.FC<HeaderProps> = ({ score, streak, onSettings, onHelp }) => (
  <header className="w-full text-center py-6 mb-6 relative">
    <div className="absolute top-4 right-4 flex gap-2">
      <button
        className="bg-transparent p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
        onClick={onHelp}
        aria-label="Help"
      >
        <QuestionMarkCircleIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </button>
      <button
        className="bg-transparent p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
        onClick={onSettings}
        aria-label="Settings"
      >
        <Cog6ToothIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
      </button>
    </div>
    <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
      Find the Leek
    </h1>
    <div className="flex justify-center gap-8 text-lg text-gray-700 dark:text-gray-200">
      <span>
        Score: <span className="font-semibold">{score}</span>
      </span>
      <span>
        Streak: <span className="font-semibold">{streak}</span>
      </span>
    </div>
  </header>
);

export default Header;
