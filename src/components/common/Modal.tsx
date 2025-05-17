import { XMarkIcon } from '@heroicons/react/24/outline';
import React, { useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string | React.ReactNode;
  children: React.ReactNode;
  mdSize?: '3xl' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, mdSize }) => {
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      // Prevent background scroll
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  let responsiveSizeClass = '';
  if (mdSize === 'xl') {
    responsiveSizeClass = 'md:max-w-xl';
  } else if (mdSize === '3xl') {
    responsiveSizeClass = 'md:max-w-3xl';
  }

  const modalContentClasses = `modal-content max-w-md ${responsiveSizeClass}`.trim();

  return (
    <div
      className="modal z-50 flex items-center justify-center"
      onClick={onClose}
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={modalContentClasses} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white" id="modal-title">
            {title}
          </h2>
          <button
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            onClick={onClose}
            aria-label="Close Modal"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto scrollbar-width-none [&::-webkit-scrollbar]:hidden">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;
