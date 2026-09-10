import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToastStore } from '../store/toastStore';

const ICONS = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

const STYLES = {
  success: 'bg-ink text-paper border-ledger',
  error: 'bg-ink text-paper border-receipt-red',
  info: 'bg-ink text-paper border-hairline',
};

const ICON_COLOR = {
  success: 'text-ledger',
  error: 'text-receipt-red',
  info: 'text-brass',
};

export default function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[320px]">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant] || Info;
        return (
          <div
            key={t.id}
            className={`flex items-start gap-2.5 rounded-sm border-l-4 px-4 py-3 shadow-lg ${STYLES[t.variant] || STYLES.info}`}
          >
            <Icon size={18} className={`mt-0.5 shrink-0 ${ICON_COLOR[t.variant] || ICON_COLOR.info}`} />
            <p className="text-sm leading-snug flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="text-paper/50 hover:text-paper">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
