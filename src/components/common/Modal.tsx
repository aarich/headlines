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
      // Store the original body overflow style
      const originalOverflow = document.body.style.overflow;
      // Prevent background scroll
      document.body.style.overflow = 'hidden';

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      // Cleanup function to restore original body overflow and remove listener
      return () => {
        document.body.style.overflow = originalOverflow;
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);
  if (!isOpen) return null;

  const sizeClass = `max-w-md ${mdSize ? 'md:max-w-' + mdSize : ''}`;
  return (
    <div
      className="modal z-50 flex items-center justify-center"
      onClick={onClose}
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={`modal-content ${sizeClass}`} onClick={e => e.stopPropagation()}>
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
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
