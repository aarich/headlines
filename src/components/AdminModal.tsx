import {
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  EyeIcon,
  EyeSlashIcon,
  PaperAirplaneIcon,
  PencilIcon,
  ShieldCheckIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useToast } from 'contexts/ToastContext';
import {
  deleteFromPreview,
  fetchPreviewHeadlines,
  publishPreviewHeadline,
  CreatePreviewHeadlinePayload,
  EditablePreviewHeadlineFields,
  createPreviewHeadline,
  updatePreviewHeadline,
} from 'lib/api';
import { getAdminKey, storeAdminKey } from 'lib/storage';
import { shuffleArray } from 'lib/ui';
import { PreviewHeadline, PreviewHeadlineStatus } from 'types';
import Loading from 'components/common/Loading';
import Modal from 'components/common/Modal';
import PreviewForm from 'components/PreviewForm';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [adminKey, setAdminKey] = useState(getAdminKey());
  const [previews, setPreviews] = useState<PreviewHeadline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [revealWords, setRevealWords] = useState(false);
  const [editingPreview, setEditingPreview] = useState<
    EditablePreviewHeadlineFields & { id: number }
  >();
  const [formMode, setFormMode] = useState<'create' | 'edit'>();

  const toast = useToast();

  const loadPreviews = useCallback(async () => {
    if (!adminKey) return;
    setIsLoading(true);
    setError(undefined);
    try {
      const data = await fetchPreviewHeadlines();
      setPreviews(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load previews.');
    } finally {
      setIsLoading(false);
    }
  }, [adminKey]);

  useEffect(() => {
    if (isOpen && adminKey) {
      loadPreviews();
    }
  }, [isOpen, adminKey, loadPreviews]);

  const handleSetKey = () => {
    if (adminKey) {
      storeAdminKey(adminKey);
      loadPreviews();
    }
  };

  const doAction = async <T extends { message: string }>(
    action: () => Promise<T>,
    previewsMutation: (previewsState: PreviewHeadline[]) => PreviewHeadline[],
    confirmMessage?: string
  ) => {
    if (!confirmMessage || window.confirm(confirmMessage)) {
      try {
        const result = await action();
        toast(result.message || 'Done!', 'success');
        setPreviews(previewsMutation);
      } catch (err: any) {
        setError(err.message || 'Failed.');
        toast(err.message || 'Failed.', 'error');
      }
    }
  };

  const handleEdit = (preview: PreviewHeadline) => {
    setEditingPreview(preview);
    setFormMode('edit');
  };

  const handleOpenCreateForm = () => {
    setEditingPreview(undefined);
    setFormMode('create');
  };

  const handleCancelForm = () => {
    setEditingPreview(undefined);
    setFormMode(undefined);
  };

  const handlePublish = async (id: number) => {
    const headlineToPublish = previews.find(preview => preview.id === id)?.headline;
    const msg = `PUBLISH preview?\n\n${headlineToPublish}`;
    await doAction(
      () => publishPreviewHeadline({ previewId: id }),
      () => [],
      msg
    );
  };

  const handleSubmitForm = async (
    data: EditablePreviewHeadlineFields | CreatePreviewHeadlinePayload
  ) => {
    setIsLoading(true);
    setError(undefined);

    try {
      if (formMode === 'edit' && editingPreview?.id) {
        const result = await updatePreviewHeadline(
          editingPreview.id,
          data as EditablePreviewHeadlineFields
        );
        toast(result.message || 'Preview updated!', 'success');
      } else if (formMode === 'create') {
        const result = await createPreviewHeadline(data as CreatePreviewHeadlinePayload);
        toast(result.message || 'Preview created!', 'success');
      } else {
        throw new Error('Invalid form mode or missing data.');
      }
      setFormMode(undefined);
      setEditingPreview(undefined);
      await loadPreviews();
    } catch (err: any) {
      const defaultMessage =
        formMode === 'create' ? 'Failed to create preview.' : 'Failed to save preview.';
      setError(err.message || defaultMessage);
      toast(err.message || defaultMessage, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetStatus = async (preview: PreviewHeadline, status: PreviewHeadlineStatus) => {
    const newStatus = preview.status === status ? null : status;
    const { id } = preview;

    const payload: EditablePreviewHeadlineFields = { ...preview, status: newStatus };
    await doAction(
      () => updatePreviewHeadline(id, payload),
      prevs => prevs.map(prev => (prev.id === id ? { ...prev, status: newStatus } : prev))
    );
  };

  const handleDeleteAll = async () => {
    await doAction(deleteFromPreview, () => [], 'Delete ALL preview headlines?');
  };

  const sortedPreviews = useMemo(() => {
    return [...previews]
      .sort((a, b) => {
        if (a.status === 'rejected' && b.status !== 'rejected') {
          return 1; // a comes after b
        }
        if (a.status !== 'rejected' && b.status === 'rejected') {
          return -1; // a comes before b
        }
        return 0;
      })
      .map(preview => {
        const { articleUrl: url, possibleAnswers, correctAnswer } = preview;
        const articleSite = url.split('/')[2];
        const choices = [...possibleAnswers, correctAnswer];
        shuffleArray(choices);
        return { ...preview, articleSite, choices };
      });
  }, [previews]);

  if (formMode) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={
          formMode === 'edit' && editingPreview
            ? `Edit Preview #${editingPreview.id}`
            : 'Create New Preview'
        }
        mdSize="3xl"
      >
        <PreviewForm
          initialData={formMode === 'edit' ? editingPreview : undefined}
          onSubmit={handleSubmitForm}
          onCancel={handleCancelForm}
          isLoading={isLoading}
        />
      </Modal>
    );
  }
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <>
          Admin
          <button className="mx-4" onClick={() => setRevealWords(!revealWords)}>
            {revealWords ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
          </button>
        </>
      }
      mdSize="3xl"
    >
      <div className="space-y-4 text-gray-700 dark:text-gray-200">
        {adminKey && (
          <>
            {isLoading && <Loading />}
            {error && (
              <p className="text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-300 p-2 rounded">
                {error}
              </p>
            )}
            {!isLoading && !error && previews.length === 0 && <p>No preview headlines found.</p>}
            {!isLoading && previews.length > 0 && (
              <ul className="space-y-3 pr-2 max-h-[50vh] overflow-y-auto">
                {sortedPreviews.map(preview => {
                  const isRejected = preview.status === 'rejected';
                  return (
                    <li
                      key={preview.id}
                      className={`p-3 rounded-md shadow-sm flex flex-row items-stretch bg-gray-50 dark:bg-gray-800 ${
                        isRejected ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex-1">
                        <p className={isRejected ? 'text-gray-400 dark:text-gray-500' : ''}>
                          {revealWords
                            ? preview.headline
                            : `${preview.beforeBlank || ''}[???]${preview.afterBlank || ''}`}
                        </p>
                        <p
                          className={`text-xs ${
                            isRejected
                              ? 'text-gray-400 dark:text-gray-500'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {preview.choices.join(', ')}
                        </p>
                        <p
                          className={`text-xs italic ${
                            isRejected
                              ? 'text-gray-400 dark:text-gray-500'
                              : 'text-gray-500 dark:text-gray-600'
                          }`}
                        >
                          {preview.hint}
                        </p>
                        <p
                          className={`text-xs ${isRejected ? 'text-gray-400 dark:text-gray-500' : 'text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-blue-400'}`}
                        >
                          <a
                            href={preview.articleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={isRejected ? 'pointer-events-none' : ''}
                          >
                            {preview.articleSite} | {preview.publishTime}
                          </a>
                        </p>
                        <div className="flex flex-row mt-2 gap-1">
                          <button
                            onClick={() => handleEdit(preview)}
                            className="btn btn-ghost btn-sm text-xs text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 flex-1"
                            disabled={isLoading}
                            title="Edit"
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleSetStatus(preview, 'selected')}
                            className={`btn btn-ghost btn-sm text-xs ${preview.status === 'selected' ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400'} flex-1`}
                            disabled={isLoading}
                            title="Select this preview"
                          >
                            <CheckCircleIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handlePublish(preview.id)}
                            className="btn btn-ghost btn-sm text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 flex-1"
                            disabled={isLoading}
                            title="Publish"
                          >
                            <PaperAirplaneIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleSetStatus(preview, 'final_selection')}
                            className={`btn btn-ghost btn-sm text-xs ${
                              preview.status === 'final_selection'
                                ? 'text-green-500 dark:text-green-400'
                                : 'text-gray-400 dark:text-gray-500 hover:text-green-500 dark:hover:text-green-400'
                            } flex-1`}
                            disabled={isLoading}
                            title="Final Selection"
                          >
                            <ShieldCheckIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleSetStatus(preview, 'rejected')}
                            className={`btn btn-ghost btn-sm text-xs ${isRejected ? 'text-yellow-500 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300' : 'text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300'} flex-1`}
                            disabled={isLoading}
                            title={isRejected ? 'Restore preview' : 'Reject preview'}
                          >
                            {isRejected ? (
                              <ArrowUturnLeftIcon className="h-5 w-5" />
                            ) : (
                              <TrashIcon className="h-5 w-5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex-row flex gap-4">
              <button
                onClick={handleDeleteAll}
                className="btn w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={isLoading || previews.length === 0}
              >
                Delete All
              </button>
              <button
                onClick={handleOpenCreateForm}
                className="btn btn-primary w-full"
                disabled={isLoading}
              >
                Create New
              </button>
            </div>
          </>
        )}
        <div>
          <input
            value={adminKey}
            onChange={e => setAdminKey(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <button onClick={handleSetKey} className="btn btn-secondary mx-4">
            Set
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AdminModal;
