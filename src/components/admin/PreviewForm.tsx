import React, { useState, useEffect } from 'react';
import {
  EditablePreviewHeadlineFields,
  CreatePreviewHeadlinePayload,
  createPreviewHeadline,
  updatePreviewHeadline,
} from 'lib/api';
import { useToast } from 'contexts/ToastContext';

interface PreviewFormProps {
  initialDataForEdit?: EditablePreviewHeadlineFields & { id: number }; // For edit mode
  formMode: 'create' | 'edit';
  onSuccess: () => void; // Callback for successful submission
  onCancel: () => void;
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
  initialDataForEdit,
  formMode,
  onSuccess,
  onCancel,
}) => {
  const isEditMode = formMode === 'edit';
  const [formData, setFormData] = useState<
    EditablePreviewHeadlineFields | CreatePreviewHeadlinePayload
  >(isEditMode && initialDataForEdit ? initialDataForEdit : defaultFormData);

  // Separate state for possibleAnswers text input
  const [possibleAnswersText, setPossibleAnswersText] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const toast = useToast();

  useEffect(() => {
    if (isEditMode && initialDataForEdit) {
      setFormData(initialDataForEdit);
      setPossibleAnswersText(
        Array.isArray(initialDataForEdit.possibleAnswers)
          ? initialDataForEdit.possibleAnswers.join(',')
          : ''
      );
    } else {
      setFormData(defaultFormData);
      setPossibleAnswersText(
        Array.isArray(defaultFormData.possibleAnswers)
          ? defaultFormData.possibleAnswers.join(',')
          : ''
      );
    }
  }, [initialDataForEdit, isEditMode]);

  const tailwindInputClass =
    'mt-1 block w-full min-w-0 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm';

  const handleFieldChange = (
    field: keyof (EditablePreviewHeadlineFields | CreatePreviewHeadlinePayload),
    value: any
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(undefined);

    // Construct the final data object, parsing possibleAnswers from its text state
    const finalPossibleAnswers = possibleAnswersText
      .split(',')
      .map(s => s.trim())
      .filter(s => s);

    const dataToSubmitWithParsedAnswers = { ...formData, possibleAnswers: finalPossibleAnswers };

    try {
      if (isEditMode && initialDataForEdit?.id) {
        const result = await updatePreviewHeadline(
          initialDataForEdit.id,
          dataToSubmitWithParsedAnswers as EditablePreviewHeadlineFields
        );
        toast(result.message || 'Preview updated!', 'success');
      } else if (formMode === 'create') {
        const result = await createPreviewHeadline(
          dataToSubmitWithParsedAnswers as CreatePreviewHeadlinePayload
        );
        toast(result.message || 'Preview created!', 'success');
      } else {
        throw new Error('Invalid form mode or missing data.');
      }
      onSuccess(); // Call the success callback
    } catch (err: any) {
      const defaultMessage =
        formMode === 'create' ? 'Failed to create preview.' : 'Failed to save preview.';
      setError(err.message || defaultMessage);
      toast(err.message || defaultMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 text-gray-700 dark:text-gray-200">
      {error && (
        <p className="text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 p-2 rounded">
          {error}
        </p>
      )}
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
          required={!isEditMode}
        />
      </div>
      <div className="mt-5 sm:mt-6 sm:grid sm:grid-flow-row-dense sm:grid-cols-2 sm:gap-3">
        <button
          type="submit"
          className="btn btn-primary w-full sm:col-start-2"
          disabled={isLoading}
        >
          {isEditMode ? 'Save Changes' : 'Create Preview'}
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
