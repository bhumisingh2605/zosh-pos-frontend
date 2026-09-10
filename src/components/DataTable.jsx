import { Inbox } from 'lucide-react';

export default function DataTable({ columns, rows, rowKey = 'id', emptyMessage = 'No records yet.', onRowClick }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 border border-dashed border-hairline rounded-sm py-16 text-ink-text-muted">
        <Inbox size={22} strokeWidth={1.5} />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-hairline rounded-sm bg-paper-raised">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-hairline text-left text-xs uppercase tracking-wide text-ink-text-muted">
            {columns.map((col) => (
              <th key={col.key} className={`px-4 py-3 font-medium ${col.align === 'right' ? 'text-right' : ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row[rowKey]}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={`border-b border-hairline-soft last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-ledger-soft/40' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3 align-middle ${col.align === 'right' ? 'text-right' : ''} ${col.mono ? 'tabular' : ''}`}>
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
