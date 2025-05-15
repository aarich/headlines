import React, { useEffect, useState } from 'react';
import {
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  Bars3Icon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';
import { Headline } from '../types';

interface HeaderProps {
  onSettings: () => void;
  onHelp: () => void;
  onStats: () => void;
  headline: Headline | undefined;
}

const Header: React.FC<HeaderProps> = ({ onSettings, onHelp, onStats, headline }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on navigation or outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handle = () => {
      setMenuOpen(false);
    };
    window.addEventListener('click', handle);
    return () => window.removeEventListener('click', handle);
  }, [menuOpen]);

  return (
    <header className="w-full text-center py-6 relative">
      {/* Desktop icons */}
      <div className="absolute top-4 right-4 gap-2 hidden md:flex">
        <button
          className="bg-transparent p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
          onClick={onHelp}
          aria-label="Help"
        >
          <QuestionMarkCircleIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          className="bg-transparent p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
          onClick={onStats}
          aria-label="Statistics"
        >
          <ChartPieIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
        <button
          className="bg-transparent p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
          onClick={onSettings}
          aria-label="Settings"
        >
          <Cog6ToothIcon className="w-6 h-6 text-gray-700 dark:text-gray-300" />
        </button>
      </div>
      {/* Mobile hamburger */}
      <div className="absolute top-4 right-4 flex md:hidden z-30">
        <button
          className="bg-transparent p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-800 transition"
          onClick={e => {
            e.stopPropagation();
            setMenuOpen(m => !m);
          }}
          aria-label="Menu"
        >
          <Bars3Icon className="w-7 h-7 text-gray-700 dark:text-gray-300" />
        </button>
        {/* Dropdown menu */}
        {menuOpen && (
          <div
            className="absolute right-0 mt-12 w-40 bg-black bg-opacity-70 rounded-lg shadow-lg flex flex-col items-stretch py-2 z-50"
            onClick={e => e.stopPropagation()}
          >
            <button
              className="flex items-center gap-2 px-4 py-3 text-base text-gray-100 hover:bg-gray-800 transition text-left"
              onClick={() => {
                setMenuOpen(false);
                onHelp();
              }}
            >
              <QuestionMarkCircleIcon className="w-5 h-5" /> Help
            </button>
            <button
              className="flex items-center gap-2 px-4 py-3 text-base text-gray-100 hover:bg-gray-800 transition text-left"
              onClick={() => {
                setMenuOpen(false);
                onStats();
              }}
            >
              <ChartPieIcon className="w-5 h-5" /> History
            </button>
            <button
              className="flex items-center gap-2 px-4 py-3 text-base text-gray-100 hover:bg-gray-800 transition text-left"
              onClick={() => {
                setMenuOpen(false);
                onSettings();
              }}
            >
              <Cog6ToothIcon className="w-5 h-5" /> Settings
            </button>
          </div>
        )}
      </div>
      <div className="w-fit mx-auto">
        <h1
          className="relative text-3xl font-bold text-gray-900 dark:text-white tracking-tight
                     before:content-[''] before:absolute before:inset-0 before:bg-white before:dark:bg-black
                     before:blur-[20px] before:-z-10 before:rounded-xl"
        >
          <a href="/">Find the Leek</a>
        </h1>
        {headline && (
          <p
            className="relative text-sm text-gray-600 dark:text-gray-400 mt-1
                       before:content-[''] before:absolute before:inset-0 before:bg-white before:dark:bg-black
                       before:blur-[15px] before:opacity-60 before:-z-10 before:rounded-lg"
          >
            Game #{headline.gameNum}
          </p>
        )}
      </div>
    </header>
  );
};
export default Header;
