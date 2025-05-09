import React from 'react';
import { Feedback as FeedbackType } from '../types';

interface FeedbackProps {
  feedback: FeedbackType;
}

const Feedback: React.FC<FeedbackProps> = ({ feedback }) => {
  const message = feedback.correct ? 'Correct!' : 'Incorrect!';
  return (
    <div
      className={`mt-4 text-center rounded-lg px-4 py-3 text-lg font-semibold
      ${feedback.correct ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}
    >
      {message}
    </div>
  );
};

export default Feedback;
