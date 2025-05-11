import React, { createContext, useContext, useState, useEffect } from 'react';
import { Settings } from '../types';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  expertMode: true,
  displayMode: 'system',
  showAnimations: true,
  colorBlindMode: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettings = localStorage.getItem('settings');
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
  });

  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));

    // Apply display mode
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const effectivelyDark =
      settings.displayMode === 'dark' || (settings.displayMode === 'system' && systemDark);

    document.documentElement.classList.toggle('dark', effectivelyDark);

    // Update meta theme-color after styles are applied
    // Use requestAnimationFrame to ensure computed styles are up-to-date.
    requestAnimationFrame(() => {
      const hasBg = document.getElementById('has-bg');
      if (!hasBg) {
        console.error('Element with id "has-bg" not found');
        return;
      }
      const bgColor = getComputedStyle(hasBg).backgroundColor;
      document.querySelector("meta[name='theme-color']")?.setAttribute('content', bgColor);
    });
  }, [settings]);

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
