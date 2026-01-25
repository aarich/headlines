import Modal from 'components/common/Modal';
import { createUserHeadline, CreateUserHeadlinePayload } from 'lib/api';
import React, { useCallback, useState, useMemo } from 'react';

interface CreateUserHeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateUserHeadlineModal: React.FC<CreateUserHeadlineModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(1);
  const [headline, setHeadline] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [hint, setHint] = useState('');
  const [articleUrl, setArticleUrl] = useState('');
  const [occurrence, setOccurrence] = useState(1);
  const [error, setError] = useState('');

  const occurrences = useMemo(() => {
    if (!headline || !correctAnswer) return [];
    const regex = new RegExp(correctAnswer.replace(/[-/\\^$*+?.()|[\\\]{}]/g, '\\$&'), 'gi');
    let match;
    const indices = [];
    while ((match = regex.exec(headline)) !== null) {
      indices.push(match.index);
    }
    return indices;
  }, [headline, correctAnswer]);

  const handleCorrectAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newWord = e.target.value;
    setCorrectAnswer(newWord);
    setOccurrence(1);

    if (newWord.includes(' ')) {
      setError('Word to hide cannot contain spaces.');
    } else if (headline.toLowerCase().indexOf(newWord.toLowerCase()) === -1 && newWord.length > 0) {
      setError('Word not found in headline.');
    } else {
      setError('');
    }
  };

  const getPreviewHeadline = () => {
    if (!correctAnswer || occurrences.length === 0) return headline;
    const index = occurrences[occurrence - 1];
    const before = headline.substring(0, index);
    const after = headline.substring(index + correctAnswer.length);
    return (
      <>
        {before}
        <span className="bg-gray-400 dark:bg-gray-600 rounded">
          {'_'.repeat(correctAnswer.length)}
        </span>
        {after}
      </>
    );
  };

  const onNext = () => setStep(step + 1);
  const onBack = () => setStep(step - 1);

  const onCreate = useCallback(async () => {
    if (!headline || !correctAnswer) return;

    const index = occurrences[occurrence - 1];
    const beforeBlank = headline.substring(0, index);
    const afterBlank = headline.substring(index + correctAnswer.length);

    const payload: CreateUserHeadlinePayload = {
      headline,
      hint,
      articleUrl,
      correctAnswer,
      publishTime: new Date()
        .toISOString()
        .replace('T', ' ')
        .slice(0, 'YYYY-MM-DD HH:MM:SS'.length),
      beforeBlank,
      afterBlank,
    };

    try {
      const result = await createUserHeadline(payload);
      window.location.href = `/custom/${result.id}`;
    } catch (err) {
      setError('Failed to create headline. Please try again.');
    }
  }, [headline, correctAnswer, hint, articleUrl, occurrence, occurrences]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Enter full headline
            </h3>
            <textarea
              className="w-full h-32 p-2 mt-2 border rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              value={headline}
              onChange={e => setHeadline(e.target.value)}
              placeholder="e.g. Men Walk on the Moon"
            />
            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 text-white bg-blue-600 rounded disabled:bg-gray-400"
                onClick={onNext}
                disabled={!headline.trim()}
              >
                Next
              </button>
            </div>
          </div>
        );
      case 2:
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Enter word to hide
            </h3>
            <div className="p-4 my-2 bg-gray-100 rounded dark:bg-gray-800">
              {getPreviewHeadline()}
            </div>
            <input
              type="text"
              className="w-full p-2 mt-2 border rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              value={correctAnswer}
              onChange={handleCorrectAnswerChange}
              placeholder="e.g. Moon"
            />
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            {!error && correctAnswer && (
              <p className="mt-1 text-sm text-green-500">Word is valid.</p>
            )}

            {occurrences.length > 1 && (
              <div className="flex items-center mt-2">
                <p className="mr-2 text-sm">Use occurrence:</p>
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => setOccurrence(Math.max(1, occurrence - 1))}
                  disabled={occurrence === 1}
                >
                  &larr;
                </button>
                <span className="mx-2">
                  {occurrence} of {occurrences.length}
                </span>
                <button
                  className="px-2 py-1 border rounded"
                  onClick={() => setOccurrence(Math.min(occurrences.length, occurrence + 1))}
                  disabled={occurrence === occurrences.length}
                >
                  &rarr;
                </button>
              </div>
            )}
            <div className="flex justify-between mt-4">
              <button className="px-4 py-2 text-gray-700 bg-gray-200 rounded" onClick={onBack}>
                Back
              </button>
              <button
                className="px-4 py-2 text-white bg-blue-600 rounded disabled:bg-gray-400"
                onClick={onNext}
                disabled={!!error || !correctAnswer.trim()}
              >
                Next
              </button>
            </div>
          </div>
        );
      case 3:
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Hint</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Help the player guess the missing word.
            </p>
            <input
              type="text"
              className="w-full p-2 mt-2 border rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              value={hint}
              onChange={e => setHint(e.target.value)}
              placeholder="e.g. There was already a man in it."
            />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
              Source (optional)
            </h3>
            <input
              type="url"
              className="w-full p-2 mt-2 border rounded dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600"
              value={articleUrl}
              onChange={e => setArticleUrl(e.target.value)}
              placeholder="https://example.com/article"
            />
            <div className="flex justify-between mt-4">
              <button className="px-4 py-2 text-gray-700 bg-gray-200 rounded" onClick={onBack}>
                Back
              </button>
              <button className="px-4 py-2 text-white bg-blue-600 rounded" onClick={onNext}>
                Next
              </button>
            </div>
          </div>
        );
      case 4:
        return (
          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">Review</h3>
            <div className="p-4 my-2 bg-gray-100 rounded dark:bg-gray-800">
              <p>
                <strong>Headline:</strong> {getPreviewHeadline()}
              </p>
              <p>
                <strong>Hidden Word:</strong> {correctAnswer}
              </p>
              <p>
                <strong>Hint:</strong> {hint || 'None'}
              </p>
              <p>
                <strong>Source:</strong> {articleUrl || 'None'}
              </p>
            </div>
            {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
            <div className="flex justify-between mt-4">
              <button className="px-4 py-2 text-gray-700 bg-gray-200 rounded" onClick={onBack}>
                Back
              </button>
              <button className="px-4 py-2 text-white bg-green-600 rounded" onClick={onCreate}>
                Create
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Custom Leek" mdSize="3xl">
      <div className="p-6">{renderStep()}</div>
    </Modal>
  );
};

export default CreateUserHeadlineModal;
