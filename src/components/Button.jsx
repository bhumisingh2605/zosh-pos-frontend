import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

const VARIANTS = {
  primary: 'bg-ledger text-white hover:bg-ledger-dark border-ledger-dark disabled:bg-ledger/50',
  danger: 'bg-receipt-red text-white hover:bg-[#a3372f] border-[#a3372f] disabled:bg-receipt-red/50',
  ghost: 'bg-transparent text-ink-text hover:bg-hairline-soft border-hairline',
  dark: 'bg-ink text-paper hover:bg-ink-soft border-ink-line',
  outline: 'bg-paper-raised text-ink-text hover:bg-hairline-soft border-hairline',
};

const SIZES = {
  sm: 'text-xs px-2.5 py-1.5 gap-1.5',
  md: 'text-sm px-3.5 py-2 gap-2',
  lg: 'text-base px-5 py-3 gap-2',
};

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  icon: Icon,
  className,
  disabled,
  type = 'button',
  ...props
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center font-medium border rounded-sm transition-colors',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass',
        'disabled:cursor-not-allowed disabled:opacity-70',
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}
