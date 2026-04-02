"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";

interface SimpleModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function SimpleModal({
  open,
  title,
  onClose,
  children,
  actions,
}: SimpleModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup dialog"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4">{children}</div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
          {actions || (
            <Button variant="outline" onClick={onClose}>
              Tutup
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
