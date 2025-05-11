import React, { createContext, useContext, useState, useCallback } from 'react';
import Toast, { ToastType } from '../components/Toast';

export type ToastFn = (
  message: string,
  type: ToastType,
  duration?: number,
  messageClass?: string
) => void;

interface ToastContextType {
  toast: ToastFn;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const DEFAULT_TOAST_DURATION = 3000;

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};

interface ToastProviderProps {
  children: React.ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [isShown, setIsShown] = useState(false);
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('info');
  const [duration, setDuration] = useState(3000);
  const [messageClass, setMessageClass] = useState<string>();

  const toast = useCallback(
    (
      message: string,
      type: ToastType,
      duration: number = DEFAULT_TOAST_DURATION,
      messageClass?: string
    ) => {
      setMessage(message);
      setType(type);
      setDuration(duration);
      setIsShown(true);
      setMessageClass(messageClass);
    },
    []
  );

  const handleDismiss = useCallback(() => {
    setIsShown(false);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toast
        message={message}
        type={type}
        isShown={isShown}
        duration={duration}
        onDismiss={handleDismiss}
        messageClass={messageClass}
      />
    </ToastContext.Provider>
  );
};
