import { forwardRef } from 'react';

interface ExpertInputProps {
  onSetGuess: (guess: string) => void;
  currentGuess: string;
}

const ExpertInput = forwardRef<HTMLInputElement, ExpertInputProps>(
  ({ onSetGuess, currentGuess }, ref) => {
    return (
      <input
        ref={ref}
        autoCapitalize="off"
        autoCorrect="off"
        type="text"
        value={currentGuess}
        onChange={e => onSetGuess(e.target.value)}
        placeholder="Your guess"
        className="w-48 px-2 py-1 text-2xl border-2 border-gray-300 dark:border-gray-700 rounded-lg
            focus:outline-none focus:border-blue-500 dark:focus:border-blue-400
            bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-center"
      />
    );
  }
);

ExpertInput.displayName = 'ExpertInput';

export default ExpertInput;
