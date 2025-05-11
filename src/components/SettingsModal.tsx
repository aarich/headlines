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
    settings: { displayMode, expertMode, showAnimations, colorBlindMode },
    updateSettings,
  } = useSettings();

  const handleDisplayModeChange = (displayMode: DisplayMode) => updateSettings({ displayMode });
  const handleExpertModeToggle = () => updateSettings({ expertMode: !expertMode });
  const handleShowAnimationsToggle = () => updateSettings({ showAnimations: !showAnimations });
  const handleColorBlindModeToggle = () => updateSettings({ colorBlindMode: !colorBlindMode });

  const displayModeOptions = [
    { value: 'light' as DisplayMode, label: 'Light' },
    { value: 'dark' as DisplayMode, label: 'Dark' },
    { value: 'system' as DisplayMode, label: 'System' },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6">
        <ButtonGroup
          title="Display"
          options={displayModeOptions}
          value={displayMode}
          onChange={handleDisplayModeChange}
        />
        <Toggle
          title="Expert Mode"
          description="No multiple choice options – just your best guess!"
          checked={expertMode}
          onChange={handleExpertModeToggle}
        />
        <Toggle
          title="Veggie Trance"
          description="Time to peel back the layers"
          checked={showAnimations}
          onChange={handleShowAnimationsToggle}
        />
        <Toggle
          title="Colorblind Mode"
          description="Makes the guess interpretation easier for our colorblind friends"
          checked={colorBlindMode}
          onChange={handleColorBlindModeToggle}
        />
      </div>
    </Modal>
  );
};

export default SettingsModal;
