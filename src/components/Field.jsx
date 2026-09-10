import clsx from 'clsx';

const baseClass =
  'w-full rounded-sm border border-hairline bg-paper-raised px-3 py-2 text-sm text-ink-text placeholder:text-ink-text-muted/60 focus:outline-none focus:border-ledger focus:ring-1 focus:ring-ledger transition-colors';

export function Field({ label, hint, error, required, children, className }) {
  return (
    <label className={clsx('block', className)}>
      {label && (
        <span className="mb-1.5 block text-xs font-medium text-ink-text-muted">
          {label}{required && <span className="text-receipt-red"> *</span>}
        </span>
      )}
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-ink-text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-receipt-red">{error}</span>}
    </label>
  );
}

export function Input({ className, ...props }) {
  return <input className={clsx(baseClass, className)} {...props} />;
}

export function Textarea({ className, ...props }) {
  return <textarea className={clsx(baseClass, 'resize-none', className)} rows={3} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={clsx(baseClass, 'cursor-pointer', className)} {...props}>
      {children}
    </select>
  );
}
