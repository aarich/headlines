import {
  ArrowUturnLeftIcon,
  DocumentMagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import PreviewForm from 'components/admin/PreviewForm';
import Modal from 'components/common/Modal';
import { useToast } from 'contexts/ToastContext';
import { EditablePreviewHeadlineFields, deleteScriptExecutionLogs } from 'lib/api';
import { getAdminKey, storeAdminKey } from 'lib/storage';
import React, { useEffect, useState } from 'react';
import { PreviewHeadline } from 'types';
import Logs from './Logs';
import PreviewList from './PreviewList';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}
type AdminView = 'previews' | 'form' | 'logs';
const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const toast = useToast();
  const [revealWords, setRevealWords] = useState(false);
  const [currentView, setCurrentView] = useState<AdminView>('previews');
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [previewDataForForm, setPreviewDataForForm] = useState<
    EditablePreviewHeadlineFields & { id: number }
  >();

  const adminKey = getAdminKey();

  useEffect(() => {
    if (!isOpen) {
      setPreviewDataForForm(undefined);
    }
  }, [isOpen, currentView]);

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

  const handleUpdateAdminKey = () => {
    const newKey = window.prompt('Enter new admin key:', adminKey || '');
    if (newKey !== null) {
      storeAdminKey(newKey);
      toast('Admin key set successfully!', 'success');
    }
  };

  const handleDeleteAllLogs = async () => {
    if (window.confirm('Are you sure you want to delete ALL script execution logs?')) {
      try {
        const result = await deleteScriptExecutionLogs();
        setCurrentView('previews');
        toast(result.message || 'All logs deleted successfully!', 'success');
      } catch (err: any) {
        toast(err.message || 'Failed to delete logs.', 'error');
      }
    }
  };

  const actions: { Icon: React.ForwardRefExoticComponent<any>; onClick: () => void }[] = [];

  switch (currentView) {
    case 'previews':
      actions.push(
        {
          Icon: revealWords ? EyeIcon : EyeSlashIcon,
          onClick: () => setRevealWords(!revealWords),
        },
        {
          Icon: PencilSquareIcon,
          onClick: handleRequestCreatePreview,
        },
        {
          Icon: DocumentMagnifyingGlassIcon,
          onClick: () => setCurrentView('logs'),
        }
      );
      break;
    case 'logs':
      actions.push({
        Icon: ArrowUturnLeftIcon,
        onClick: () => setCurrentView('previews'),
      });
      actions.push({
        Icon: TrashIcon,
        onClick: handleDeleteAllLogs,
      });
      break;
    case 'form':
      actions.push({
        Icon: ArrowUturnLeftIcon,
        onClick: () => setCurrentView('previews'),
      });
      break;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <>
          Admin &nbsp;
          {actions.map(({ Icon, onClick }) => (
            <button className="mx-2" onClick={onClick} key={`${onClick}`}>
              <Icon className="w-5 h-5" />
            </button>
          ))}
        </>
      }
      mdSize="3xl"
    >
      {currentView === 'form' && (
        <PreviewForm
          formMode={formMode}
          initialDataForEdit={formMode === 'edit' ? previewDataForForm : undefined}
          onSuccess={handleFormSuccessOrCancel}
          onCancel={handleFormSuccessOrCancel}
        />
      )}
      {currentView === 'logs' && <Logs />}
      {currentView === 'previews' && (
        <div className="space-y-4 text-gray-700 dark:text-gray-200">
          <PreviewList revealWords={revealWords} onEditRequest={handleRequestEditPreview} />
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button onClick={handleUpdateAdminKey} className="btn btn-secondary">
              Set Admin Key
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default AdminModal;
