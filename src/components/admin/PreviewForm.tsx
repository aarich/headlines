import React, { useState, useEffect } from 'react';
import { EditablePreviewHeadlineFields, CreatePreviewHeadlinePayload } from 'lib/api';

interface PreviewFormProps {
  initialData?: EditablePreviewHeadlineFields & { id?: number };
  onSubmit: (data: EditablePreviewHeadlineFields | CreatePreviewHeadlinePayload) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

const defaultFormData: CreatePreviewHeadlinePayload = {
  headline: '',
  hint: '',
  articleUrl: '',
  redditUrl: '',
  correctAnswer: '',
  publishTime: '',
  possibleAnswers: [],
};

/**
 * Create or edit a preview headline. Note that status is not managed here. It has a default on create and isn't editable via the form.
 */
const PreviewForm: React.FC<PreviewFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const isEdit = !!initialData?.id;
  const [formData, setFormData] = useState<
    EditablePreviewHeadlineFields | CreatePreviewHeadlinePayload
  >(isEdit ? initialData : defaultFormData);

  // Separate state for possibleAnswers text input
  const [possibleAnswersText, setPossibleAnswersText] = useState<string>('');

  useEffect(() => {
    if (isEdit && initialData) {
      setFormData(initialData);
      setPossibleAnswersText(
        Array.isArray(initialData.possibleAnswers) ? initialData.possibleAnswers.join(',') : ''
      );
    } else {
      setFormData(defaultFormData);
      setPossibleAnswersText(
        Array.isArray(defaultFormData.possibleAnswers)
          ? defaultFormData.possibleAnswers.join(',')
          : ''
      );
    }
  }, [initialData, isEdit]);

  const tailwindInputClass =
    'mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';

  const handleFieldChange = (
    field: keyof (EditablePreviewHeadlineFields | CreatePreviewHeadlinePayload),
    value: any
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Construct the final data object, parsing possibleAnswers from its text state
    const finalPossibleAnswers = possibleAnswersText
      .split(',')
      .map(s => s.trim())
      .filter(s => s);

    const dataToSubmitWithParsedAnswers = { ...formData, possibleAnswers: finalPossibleAnswers };

    onSubmit(dataToSubmitWithParsedAnswers);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 text-gray-700 dark:text-gray-200 max-h-[70vh] overflow-y-auto pr-2"
    >
      <div>
        <label htmlFor="headline" className="block text-sm font-medium">
          Headline
        </label>
        <input
          type="text"
          id="headline"
          value={formData.headline}
          onChange={e => handleFieldChange('headline', e.target.value)}
          className={tailwindInputClass}
          required
        />
      </div>
      <div>
        <label htmlFor="correctAnswer" className="block text-sm font-medium">
          Correct Answer
        </label>
        <input
          type="text"
          id="correctAnswer"
          value={formData.correctAnswer}
          onChange={e => handleFieldChange('correctAnswer', e.target.value)}
          className={tailwindInputClass}
          required
        />
      </div>
      <div>
        <label htmlFor="hint" className="block text-sm font-medium">
          Hint
        </label>
        <input
          type="text"
          id="hint"
          value={formData.hint || ''}
          onChange={e => handleFieldChange('hint', e.target.value)}
          className={tailwindInputClass}
        />
      </div>
      <div>
        <label htmlFor="articleUrl" className="block text-sm font-medium">
          Article URL
        </label>
        <input
          type="url"
          id="articleUrl"
          value={formData.articleUrl}
          onChange={e => handleFieldChange('articleUrl', e.target.value)}
          className={tailwindInputClass}
          required
        />
      </div>
      <div>
        <label htmlFor="redditUrl" className="block text-sm font-medium">
          Reddit URL
        </label>
        <input
          type="url"
          id="redditUrl"
          value={formData.redditUrl}
          onChange={e => handleFieldChange('redditUrl', e.target.value)}
          className={tailwindInputClass}
          required
        />
      </div>
      <div>
        <label htmlFor="possibleAnswers" className="block text-sm font-medium">
          Possible Answers (comma separated)
        </label>
        <input
          id="possibleAnswers"
          value={possibleAnswersText}
          onChange={e => setPossibleAnswersText(e.target.value)}
          className={tailwindInputClass}
          required
        />
      </div>
      <div>
        <label htmlFor="publishTime" className="block text-sm font-medium">
          Publish Time
        </label>
        <input
          type="datetime-local"
          id="publishTime"
          value={formData.publishTime || ''}
          onChange={e => handleFieldChange('publishTime', e.target.value)}
          className={tailwindInputClass}
          required={!isEdit}
        />
      </div>
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button
          type="submit"
          className="btn btn-primary w-full sm:col-start-2"
          disabled={isLoading}
        >
          {isEdit ? 'Save' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary w-full mt-3 sm:mt-0 sm:col-start-1"
          disabled={isLoading}
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default PreviewForm;
