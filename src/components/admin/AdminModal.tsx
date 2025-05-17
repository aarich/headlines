import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import React, { ReactNode, useCallback, useEffect, useState } from 'react';
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
import { PreviewHeadline, PreviewHeadlineStatus } from 'types';
import Modal from 'components/common/Modal';
import PreviewForm from 'components/admin/PreviewForm';
import PreviewList from './PreviewList';

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

  let title: string | ReactNode = (
    <>
      Admin
      <button className="mx-4" onClick={() => setRevealWords(!revealWords)}>
        {revealWords ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
      </button>
    </>
  );

  if (formMode) {
    title =
      formMode === 'edit' && editingPreview
        ? `Edit Preview #${editingPreview.id}`
        : 'Create New Preview';
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} mdSize="3xl">
      {formMode ? (
        <PreviewForm
          initialData={formMode === 'edit' ? editingPreview : undefined}
          onSubmit={handleSubmitForm}
          onCancel={handleCancelForm}
          isLoading={isLoading}
        />
      ) : (
        <div className="space-y-4 text-gray-700 dark:text-gray-200">
          {adminKey && (
            <>
              <PreviewList
                previews={previews}
                revealWords={revealWords}
                isLoading={isLoading}
                error={error}
                handleEdit={handleEdit}
                handleSetStatus={handleSetStatus}
                handlePublish={handlePublish}
              />
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
      )}
    </Modal>
  );
};

export default AdminModal;
