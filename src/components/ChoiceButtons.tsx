import React from 'react';

interface ChoiceButtonsProps {
  choices: string[];
  onGuess: (guess: string) => void;
  disabled?: boolean;
}

const ChoiceButtons: React.FC<ChoiceButtonsProps> = ({ choices, onGuess, disabled }) => (
  <div className="grid gap-4 mb-4">
    {choices.map((choice, idx) => (
      <button
        key={choice}
        className="btn btn-secondary w-full py-3 text-lg border border-gray-300 dark:border-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900 disabled:opacity-60 disabled:cursor-not-allowed"
        onClick={() => onGuess(choice)}
        disabled={disabled}
      >
        {choice}
      </button>
    ))}
  </div>
);

export default ChoiceButtons; 