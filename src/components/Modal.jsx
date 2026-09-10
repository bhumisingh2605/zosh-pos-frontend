import { useEffect } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

export default function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center overflow-y-auto bg-ink/50 px-4 py-8">
      <div
        className={`w-full ${width} rounded-sm border border-hairline bg-paper-raised shadow-2xl`}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="text-base font-semibold text-ink-text">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-sm p-1 text-ink-text-muted hover:bg-hairline-soft hover:text-ink-text"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  );
}
