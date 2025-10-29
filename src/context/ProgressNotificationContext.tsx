'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface ProgressNotification {
  isVisible: boolean;
  fileName: string;
  status: 'uploading' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

interface ProgressNotificationContextType {
  notification: ProgressNotification;
  showNotification: (fileName: string, status: 'uploading' | 'processing' | 'completed' | 'failed', progress: number, error?: string) => void;
  updateNotification: (updates: Partial<ProgressNotification>) => void;
  hideNotification: () => void;
}

const ProgressNotificationContext = createContext<ProgressNotificationContextType | undefined>(undefined);

export function ProgressNotificationProvider({ children }: { children: ReactNode }) {
  const [notification, setNotification] = useState<ProgressNotification>({
    isVisible: false,
    fileName: '',
    status: 'uploading',
    progress: 0,
    error: undefined
  });

  const showNotification = (fileName: string, status: 'uploading' | 'processing' | 'completed' | 'failed', progress: number, error?: string) => {
    setNotification({
      isVisible: true,
      fileName,
      status,
      progress,
      error
    });
  };

  const updateNotification = (updates: Partial<ProgressNotification>) => {
    console.log('📢 Updating notification:', updates);
    setNotification(prev => {
      const updated = { ...prev, ...updates };
      console.log('📢 Notification state:', updated);
      return updated;
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({
      ...prev,
      isVisible: false
    }));
  };

  return (
    <ProgressNotificationContext.Provider value={{
      notification,
      showNotification,
      updateNotification,
      hideNotification
    }}>
      {children}
    </ProgressNotificationContext.Provider>
  );
}

export function useProgressNotification() {
  const context = useContext(ProgressNotificationContext);
  if (context === undefined) {
    throw new Error('useProgressNotification must be used within a ProgressNotificationProvider');
  }
  return context;
}
