import React from 'react';
import Modal from './common/Modal';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="How to Play">
    <div className="space-y-4 text-gray-700 dark:text-gray-200">
      <p>Guess the missing word from yesterday's real news headline.</p>
      <ul className="list-disc pl-6">
        <li>One new headline every day.</li>
        <li>Expert mode allows you to enter your own guess.</li>
        <li>The headlines are sourced from Reddit's r/nottheonion.</li>
      </ul>
    </div>
  </Modal>
);

export default HelpModal;
