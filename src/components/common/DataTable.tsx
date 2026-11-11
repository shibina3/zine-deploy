import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  width?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  dense,
  footer,
  className,
  minWidth = '640px',
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  dense?: boolean;
  footer?: ReactNode;
  className?: string;
  minWidth?: string;
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-ink-200/70 bg-porcelain shadow-card',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth }}>
          <thead>
            <tr className="bg-ink-50/70">
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width }}
                  className={cn(
                    'whitespace-nowrap px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-500',
                    column.align === 'right' && 'text-right',
                    column.align === 'center' && 'text-center',
                    column.headerClassName,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  'border-t border-ink-100/80 transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-gold-50/50',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'px-4 align-middle',
                      dense ? 'py-2.5' : 'py-3.5',
                      column.align === 'right' && 'text-right',
                      column.align === 'center' && 'text-center',
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!rows.length && empty}
      {footer}
    </div>
  );
}
