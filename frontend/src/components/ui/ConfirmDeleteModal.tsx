"use client";

import React from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName?: string;
  isDeleting?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDeleteModal({
  isOpen,
  title = "Delete Analysis Report",
  itemName,
  isDeleting = false,
  onConfirm,
  onCancel,
}: ConfirmDeleteModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-text-primary/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="genesis-card shadow-2xl max-w-md w-full p-6 space-y-4 bg-surface animate-in zoom-in-95 duration-200 border border-border">
        {/* Header with Warning Icon */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[8px] bg-rose-50 text-status-error flex items-center justify-center border border-rose-100 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-text-primary">
                {title}
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                This action cannot be undone.
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1 text-neutral hover:text-text-primary rounded-[4px] hover:bg-bg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Message */}
        <p className="text-xs text-text-secondary leading-relaxed bg-bg p-3 rounded-[6px] border border-border">
          Are you sure you want to permanently delete{" "}
          <strong className="text-text-primary font-semibold">
            {itemName ? `"${itemName}"` : "this video report"}
          </strong>{" "}
          and all its multimodal predictions and extracted keyframe data?
        </p>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="genesis-btn-secondary px-3.5 py-1.5 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-1.5 rounded-[6px] text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 transition-colors flex items-center gap-1.5 shadow-xs"
          >
            {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>{isDeleting ? "Deleting..." : "Delete Permanently"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
