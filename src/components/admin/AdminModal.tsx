import { EyeIcon, EyeSlashIcon, DocumentMagnifyingGlassIcon } from '@heroicons/react/24/outline';
import React, { ReactNode, useEffect, useState } from 'react';
import { EditablePreviewHeadlineFields, deleteFromPreview } from 'lib/api';
import { getAdminKey, storeAdminKey } from 'lib/storage';
import { PreviewHeadline } from 'types';
import Modal from 'components/common/Modal';
import PreviewForm from 'components/admin/PreviewForm';
import ScriptLogViewer from './ScriptLogViewer';
import PreviewList from './PreviewList'; // Import PreviewList directly
import { useToast } from 'contexts/ToastContext';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}
type AdminView = 'previews' | 'form' | 'logs';
const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [adminKey, setAdminKey] = useState(getAdminKey());
  const [revealWords, setRevealWords] = useState(false);

  const [currentView, setCurrentView] = useState<AdminView>('previews');
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [previewDataForForm, setPreviewDataForForm] = useState<
    EditablePreviewHeadlineFields & { id: number }
  >();

  useEffect(() => {
    if (!isOpen) {
      setPreviewDataForForm(undefined);
    }
  }, [isOpen, currentView]);

  const handleSetKey = () => storeAdminKey(adminKey ?? '');

  const handleRequestEditPreview = (preview: PreviewHeadline) => {
    setPreviewDataForForm(preview as EditablePreviewHeadlineFields & { id: number });
    setFormMode('edit');
    setCurrentView('form');
  };

  const handleRequestCreatePreview = () => {
    setPreviewDataForForm(undefined);
    setFormMode('create');
    setCurrentView('form');
  };

  const handleFormSuccessOrCancel = () => {
    setFormMode('create');
    setPreviewDataForForm(undefined);
    setCurrentView('previews');
  };

  const handleRequestViewLogs = () => {
    setCurrentView('logs');
  };

  const handleBackToMain = () => {
    setCurrentView('previews');
  };

  const handleDeleteAllPreviews = async () => {
    if (window.confirm('Delete ALL preview headlines?')) {
      try {
        const result = await deleteFromPreview();
        toast(result.message || 'All previews deleted!', 'success');
      } catch (err: any) {
        toast(err.message || 'Failed to delete all previews.', 'error');
      }
    }
  };

  let title: string | ReactNode;
  switch (currentView) {
    case 'previews':
      title = (
        <>
          Admin
          <button className="mx-4" onClick={() => setRevealWords(!revealWords)}>
            {revealWords ? <EyeIcon className="w-5 h-5" /> : <EyeSlashIcon className="w-5 h-5" />}
          </button>
        </>
      );
      break;
    case 'logs':
      title = 'Script Execution Logs';
      break;
    case 'form':
      title =
        formMode === 'edit' ? `Edit Preview #${previewDataForForm?.id}` : 'Create New Preview';
      break;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} mdSize="3xl">
      {currentView === 'form' && (
        <PreviewForm
          formMode={formMode}
          initialDataForEdit={formMode === 'edit' ? previewDataForForm : undefined}
          onSuccess={handleFormSuccessOrCancel}
          onCancel={handleFormSuccessOrCancel}
        />
      )}
      {currentView === 'logs' && <ScriptLogViewer onBack={handleBackToMain} />}
      {currentView === 'previews' && (
        <div className="space-y-4 text-gray-700 dark:text-gray-200">
          <PreviewList revealWords={revealWords} onEditRequest={handleRequestEditPreview} />
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleDeleteAllPreviews}
              className="btn w-full bg-red-600 hover:bg-red-700 text-white"
              disabled={!adminKey}
            >
              Delete All Previews
            </button>
            <button
              onClick={handleRequestCreatePreview}
              className="btn btn-primary w-full"
              disabled={!adminKey}
            >
              Create New Preview
            </button>
            <button
              onClick={handleRequestViewLogs}
              className="btn btn-info w-full flex items-center justify-center"
              disabled={!adminKey}
            >
              <DocumentMagnifyingGlassIcon className="w-5 h-5 mr-2" />
              Logs
            </button>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <input
              value={adminKey || ''}
              onChange={e => setAdminKey(e.target.value)}
              placeholder="Enter Admin Key"
              className="px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded-md"
            />
            <button onClick={handleSetKey} className="btn btn-secondary ml-2 sm:ml-4">
              Set Key
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AdminModal;
