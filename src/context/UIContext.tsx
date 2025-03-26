import React, { createContext, useContext, ReactNode } from 'react';
import { useConfirmDialog, useToast } from '../hooks';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import ToastContainer from '../components/ui/ToastContainer';

interface UIContextType {
  confirm: ReturnType<typeof useConfirmDialog>['confirm'];
  addToast: ReturnType<typeof useToast>['addToast'];
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const { confirm, dialog, handleConfirm, handleCancel } = useConfirmDialog();
  const { toasts, addToast, removeToast } = useToast();

  return (
    <UIContext.Provider value={{ confirm, addToast }}>
      {children}
      
      {/* Global Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialog.isOpen}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
        confirmText={dialog.confirmText}
        cancelText={dialog.cancelText}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />

      {/* Global Toast Container */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}