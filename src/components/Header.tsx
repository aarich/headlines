import React, { useState } from 'react';
import {
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  Bars3Icon,
  ChartPieIcon,
} from '@heroicons/react/24/outline';

interface HeaderProps {
  onSettings: () => void;
  onHelp: () => void;
  onStats: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSettings, onHelp, onStats }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on navigation or outside click
  React.useEffect(() => {
    if (!menuOpen) return;
    const handle = () => {
      setMenuOpen(false);
    };
    window.addEventListener('click', handle);
    return () => window.removeEventListener('click', handle);
  }, [menuOpen]);

  return (
    <header className="w-full text-center py-6 mb-6 relative">
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
              <ChartPieIcon className="w-5 h-5" /> Statistics
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
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
        Find the Leek
      </h1>
    </header>
  );
};

export default Header;
