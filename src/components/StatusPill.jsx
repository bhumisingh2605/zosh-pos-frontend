import clsx from 'clsx';

const TONES = {
  ledger: 'bg-ledger-soft text-ledger-dark border-ledger/30',
  brass: 'bg-brass-soft text-[#8a6a1c] border-brass/40',
  red: 'bg-receipt-red-soft text-receipt-red border-receipt-red/30',
  neutral: 'bg-hairline-soft text-ink-text-muted border-hairline',
};

const STATUS_TONE = {
  ACTIVE: 'ledger',
  COMPLETED: 'ledger',
  PENDING: 'brass',
  BLOCKED: 'red',
  CASH: 'neutral',
  UPI: 'ledger',
  CARD: 'brass',
};

export default function StatusPill({ children, tone }) {
  const resolvedTone = tone || STATUS_TONE[children?.toString?.().toUpperCase?.()] || 'neutral';
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium uppercase tracking-wide',
        TONES[resolvedTone]
      )}
    >
      {children}
    </span>
  );
}
