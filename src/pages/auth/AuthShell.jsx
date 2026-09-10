import { Receipt } from 'lucide-react';

export default function AuthShell({ eyebrow, title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[420px]">
        <div className="flex items-center gap-2.5 justify-center mb-8">
          <div className="w-9 h-9 rounded-sm bg-brass flex items-center justify-center">
            <Receipt size={19} className="text-ink" strokeWidth={2} />
          </div>
          <span className="text-paper text-lg font-semibold tracking-tight">Zosh POS</span>
        </div>

        <div className="bg-paper-raised rounded-sm relative">
          <div
            className="h-3 bg-paper-raised"
            style={{
              backgroundImage:
                'radial-gradient(circle at 8px 0, transparent 8px, var(--color-ink) 8px)',
              backgroundSize: '16px 16px',
              backgroundPosition: 'top',
              backgroundRepeat: 'repeat-x',
            }}
          />
          <div className="px-7 pt-2 pb-8 border-x border-hairline">
            {eyebrow && <p className="text-xs font-medium text-ledger mt-4">{eyebrow}</p>}
            <h1 className="text-xl font-semibold text-ink-text mt-1">{title}</h1>
            {subtitle && <p className="text-sm text-ink-text-muted mt-1.5 mb-6">{subtitle}</p>}
            <div className={subtitle ? '' : 'mt-6'}>{children}</div>
          </div>
          <div
            className="h-3"
            style={{
              backgroundImage:
                'radial-gradient(circle at 8px 12px, transparent 8px, var(--color-ink) 8px)',
              backgroundSize: '16px 16px',
              backgroundPosition: 'bottom',
              backgroundRepeat: 'repeat-x',
            }}
          />
        </div>
        {footer && <div className="text-center mt-5 text-sm text-paper/60">{footer}</div>}
      </div>
    </div>
  );
}
