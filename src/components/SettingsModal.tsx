import React from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { DisplayMode } from '../types';
import Modal from './common/Modal';
import Toggle from './common/Toggle';
import ButtonGroup from './common/ButtonGroup';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const {
    settings: { displayMode, expertMode, showAnimations },
    updateSettings,
  } = useSettings();

  const handleDisplayModeChange = (displayMode: DisplayMode) => updateSettings({ displayMode });

  const handleExpertModeToggle = () => updateSettings({ expertMode: !expertMode });

  const handleShowAnimationsToggle = () => updateSettings({ showAnimations: !showAnimations });

  const displayModeOptions = [
    { value: 'light' as DisplayMode, label: 'Light' },
    { value: 'dark' as DisplayMode, label: 'Dark' },
    { value: 'system' as DisplayMode, label: 'System' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6">
        <ButtonGroup
          title="Display Mode"
          options={displayModeOptions}
          value={displayMode}
          onChange={handleDisplayModeChange}
        />
        <Toggle
          title="Expert Mode"
          description="Expert mode removes hints and makes the game more challenging."
          checked={expertMode}
          onChange={handleExpertModeToggle}
        />
        <Toggle
          title="Show Animations"
          description="Turn off animations if you're boring"
          checked={showAnimations}
          onChange={handleShowAnimationsToggle}
        />
      </div>
    </Modal>
  );
};

export default SettingsModal;
