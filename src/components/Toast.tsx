import React, { useEffect, useState } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  isShown: boolean;
  duration?: number;
  messageClass?: string;
  onDismiss?: () => void;
}

const getToastStyles = (type: ToastType) => {
  switch (type) {
    case 'success':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
    case 'warning':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case 'info':
    default:
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
  }
};

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  isShown,
  duration = 3000,
  messageClass,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isShown) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onDismiss) {
          setTimeout(onDismiss, 300); // Wait for fade out animation
        }
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isShown, duration, onDismiss, message]);

  if (!isShown && !isVisible) return null;

  return (
    <div
      className={`fixed z-50 left-1/2 transform -translate-x-1/2 sm:left-auto sm:right-6 sm:-translate-x-0 text-center rounded-lg px-6 py-3 text-lg font-semibold shadow-lg transition-all duration-300 ease-in-out
      ${getToastStyles(type)}
      ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}
      bottom-4 sm:top-20 sm:bottom-auto`}
    >
      {messageClass ? <span className={messageClass}>{message}</span> : message}
    </div>
  );
};

export default Toast;
