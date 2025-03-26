import { useState } from 'react';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  type?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
}

interface ConfirmDialogState extends ConfirmDialogOptions {
  isOpen: boolean;
  resolve: ((value: boolean) => void) | null;
}

export default function useConfirmDialog() {
  const [dialog, setDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    resolve: null
  });

  const confirm = (options: ConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setDialog({
        ...options,
        isOpen: true,
        resolve
      });
    });
  };

  const handleConfirm = () => {
    if (dialog.resolve) {
      dialog.resolve(true);
    }
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (dialog.resolve) {
      dialog.resolve(false);
    }
    setDialog(prev => ({ ...prev, isOpen: false }));
  };

  return {
    confirm,
    dialog,
    handleConfirm,
    handleCancel
  };
}