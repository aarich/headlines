import React from 'react';

interface ExpertInputProps {
  onSetGuess: (guess: string) => void;
  disabled?: boolean;
  currentGuess: string;
}

const ExpertInput: React.FC<ExpertInputProps> = ({ onSetGuess, disabled, currentGuess }) => {
  return (
    <input
      type="text"
      value={currentGuess}
      onChange={e => {
        onSetGuess(e.target.value);
      }}
      disabled={disabled}
      placeholder="?"
      className="w-48 px-2 py-1 text-2xl border-2 border-gray-300 dark:border-gray-700 rounded-lg
            focus:outline-none focus:border-blue-500 dark:focus:border-blue-400
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
            disabled:opacity-50 disabled:cursor-not-allowed text-center"
    />
  );
};

export default ExpertInput;
