import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Modal from './common/Modal';
import { fetchPreviewHeadlines, publishPreviewHeadline, deleteFromPreview } from '../lib/api';
import { getAdminKey, storeAdminKey } from '../lib/storage';
import { PreviewHeadline } from '../types';
import { useToast } from '../contexts/ToastContext';
import Loading from './common/Loading';
import { EyeIcon, EyeSlashIcon, PaperAirplaneIcon, TrashIcon } from '@heroicons/react/24/outline';
import { shuffleArray } from '../lib/ui';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const [adminKey, setAdminKey] = useState(getAdminKey());
  const [previews, setPreviews] = useState<PreviewHeadline[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealWords, setRevealWords] = useState(false);

  const toast = useToast();

  const loadPreviews = useCallback(async () => {
    if (!adminKey) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPreviewHeadlines();
      setPreviews(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load previews.');
      setPreviews([]); // Clear previews on error
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
    confirmMessage: string,
    action: () => Promise<T>
  ) => {
    if (window.confirm(confirmMessage)) {
      setIsLoading(true);
      try {
        const result = await action();
        toast(result.message || 'Done!', 'success');
        loadPreviews(); // Refresh the list
      } catch (err: any) {
        setError(err.message || 'Failed.');
        toast(err.message || 'Failed.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePublish = async (id: number) => {
    const headlineToPublish = previews.find(preview => preview.id === id)?.headline;
    const msg = `PUBLISH preview?\n\n${headlineToPublish}`;
    await doAction(msg, () => publishPreviewHeadline(id));
  };

  const handleDeleteSingle = async (id: number) => {
    const headlineToDelete = previews.find(preview => preview.id === id)?.headline;
    const msg = `DELETE preview?: ${id}?\n\n${headlineToDelete}`;
    await doAction(msg, () => deleteFromPreview(id));
  };

  const handleDeleteAll = async () => {
    await doAction(
      'Are you sure you want to delete ALL preview headlines? This action cannot be undone.',
      deleteFromPreview
    );
  };

  const items = useMemo(
    () =>
      previews.map(preview => {
        const { articleUrl: url, possibleAnswers, correctAnswer } = preview;
        const articleSite = url.split('/')[2];
        const choices = [...possibleAnswers, correctAnswer];
        shuffleArray(choices);
        return { ...preview, articleSite, choices };
      }),
    [previews]
  );

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
      large
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
              <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {items.map(preview => (
                  <li
                    key={preview.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md shadow-sm flex justify-between items-stretch"
                  >
                    <div>
                      <p>
                        {revealWords
                          ? preview.headline
                          : `${preview.beforeBlank} [???] ${preview.afterBlank}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {preview.choices.join(', ')}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-600 italic">
                        {preview.hint}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {preview.articleSite} | {preview.publishTime}
                      </p>
                    </div>
                    <div>
                      <div className="flex h-full flex-col justify-around">
                        <button
                          onClick={() => handlePublish(preview.id)}
                          className="btn btn-ghost btn-sm text-xs p-1 text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          disabled={isLoading}
                          title="Publish"
                        >
                          <PaperAirplaneIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteSingle(preview.id)}
                          className="btn btn-ghost btn-sm text-xs p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                          disabled={isLoading}
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleDeleteAll}
                className="btn w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={isLoading || previews.length === 0}
              >
                Delete All Previews
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
