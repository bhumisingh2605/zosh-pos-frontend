import { Loader2, AlertTriangle, RefreshCw } from 'lucide-react';

export function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="text-xs font-medium text-ledger mb-1">{eyebrow}</p>}
        <h1 className="text-2xl font-semibold text-ink-text">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-text-muted max-w-xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Loader({ label = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-ink-text-muted">
      <Loader2 size={18} className="animate-spin" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function Ledger({ children, className = '' }) {
  return (
    <div className={`border border-hairline bg-paper-raised rounded-sm p-5 ${className}`}>
      {children}
    </div>
  );
}

export function LoadError({ message = "Couldn't load this. Check your connection and try again.", onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center border border-dashed border-receipt-red/30 bg-receipt-red-soft rounded-sm">
      <AlertTriangle size={20} className="text-receipt-red" />
      <p className="text-sm text-receipt-red max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 text-sm text-ink-text hover:text-ledger border border-hairline rounded-sm px-3 py-1.5 bg-paper"
        >
          <RefreshCw size={14} /> Try again
        </button>
      )}
    </div>
  );
}

export function ErrorNote({ message }) {
  if (!message) return null;
  return (
    <div className="border border-receipt-red/30 bg-receipt-red-soft text-receipt-red text-sm rounded-sm px-4 py-3 mb-4">
      {message}
    </div>
  );
}
