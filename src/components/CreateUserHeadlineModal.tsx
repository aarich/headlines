import PreviewForm from 'components/admin/PreviewForm';
import Modal from 'components/common/Modal';
import React from 'react';

interface CreateUserHeadlineModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CreateUserHeadlineModal: React.FC<CreateUserHeadlineModalProps> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Custom Leek" mdSize="3xl">
      <PreviewForm
        formMode="create"
        initialDataForEdit={undefined}
        onSuccess={id => {
          onClose();
          window.location.href = `/custom/${id}`;
        }}
        onCancel={onClose}
        editing="user_headline"
      />
    </Modal>
  );
};

export default CreateUserHeadlineModal;
