import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default'
}: ConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface MessageDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageContent: string;
  senderName: string;
  onConfirm: () => void;
}

export function MessageDeleteDialog({
  open,
  onOpenChange,
  messageContent,
  senderName,
  onConfirm
}: MessageDeleteDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Message"
      description={`Are you sure you want to delete this message from ${senderName}?\n\n"${messageContent}"\n\nThis action cannot be undone.`}
      confirmText="Delete Message"
      cancelText="Cancel"
      onConfirm={onConfirm}
      variant="destructive"
    />
  );
}

interface TeamDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teamName: string;
  memberCount: number;
  onConfirm: () => void;
}

export function TeamDeleteDialog({
  open,
  onOpenChange,
  teamName,
  memberCount,
  onConfirm
}: TeamDeleteDialogProps) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Delete Team"
      description={`Are you sure you want to delete the team "${teamName}"?\n\nThis will remove all ${memberCount} members and delete all chat history. This action cannot be undone.`}
      confirmText="Delete Team"
      cancelText="Cancel"
      onConfirm={onConfirm}
      variant="destructive"
    />
  );
}