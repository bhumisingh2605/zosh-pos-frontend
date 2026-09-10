export default function StatCard({ label, value, sub, tone = 'ink' }) {
  const toneClass = {
    ink: 'text-ink-text',
    ledger: 'text-ledger',
    red: 'text-receipt-red',
    brass: 'text-[#8a6a1c]',
  }[tone];

  return (
    <div className="border border-hairline bg-paper-raised rounded-sm px-5 py-4">
      <p className="text-xs text-ink-text-muted mb-1.5">{label}</p>
      <p className={`text-2xl font-semibold tabular ${toneClass}`}>{value}</p>
      {sub && <p className="text-xs text-ink-text-muted mt-1">{sub}</p>}
    </div>
  );
}
