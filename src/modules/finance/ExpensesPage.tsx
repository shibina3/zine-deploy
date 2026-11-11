import { useMemo, useState } from 'react';
import { Download, Plus, Wallet } from 'lucide-react';
import type { Expense } from '@/types';
import { useExpenses } from '@/hooks/useDb';
import { deleteExpense } from '@/db/repositories/financeRepo';
import { downloadCsv } from '@/services/exports/csv';
import { currentMonth } from '@/utils/date';
import { formatINR, sumPaise } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable } from '@/components/common/DataTable';
import { ConfirmDialog } from '@/components/common/Modal';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { ExpenseDialog } from './ExpenseDialog';
import { expenseColumns } from './ExpenseTable';

export function ExpensesPage() {
  const expenses = useExpenses();
  const [month, setMonth] = useState(currentMonth());
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const filtered = useMemo(
    () => expenses.filter((expense) => expense.date.startsWith(month)),
    [expenses, month],
  );
  const total = sumPaise(filtered.map((expense) => expense.amount));
  const topCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const expense of filtered) {
      map.set(expense.category, (map.get(expense.category) ?? 0) + expense.amount);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])[0];
  }, [filtered]);

  return (
    <div>
      <PageHeader
        eyebrow="Finance"
        title="Expenses"
        description="Rent, salaries, purchases and everything else leaving the business."
        actions={
          <>
            <input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-[12.5px] text-ink-700"
            />
            <Button
              variant="secondary"
              leadingIcon={<Download className="h-4 w-4" />}
              onClick={() =>
                downloadCsv(
                  `zine-expenses-${month}`,
                  filtered.map((expense) => ({
                    Date: expense.date,
                    Category: expense.category,
                    Description: expense.description,
                    Method: expense.method,
                    Amount: expense.amount / 100,
                  })),
                )
              }
            >
              Export
            </Button>
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Add expense
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Expenses this month
          </p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {formatINR(total)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Entries</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {filtered.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Top category
          </p>
          <p className="mt-2 truncate text-[15px] font-medium text-ink-900">{topCategory?.[0] ?? '—'}</p>
          <p className="text-[11px] text-ink-400">{topCategory ? formatINR(topCategory[1]) : ''}</p>
        </Card>
      </div>

      <DataTable
        columns={expenseColumns(setDeleting)}
        rows={filtered}
        rowKey={(expense) => expense.id}
        empty={
          <EmptyState
            icon={<Wallet className="h-5 w-5" />}
            title="No expenses this month"
            description="Record rent, salaries, purchases and other costs to see true profit."
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                Add expense
              </Button>
            }
          />
        }
      />

      <ExpenseDialog open={creating} onClose={() => setCreating(false)} />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteExpense(deleting.id);
            notifySuccess('Expense deleted', deleting.description);
            setDeleting(null);
          } catch (error) {
            notifyError('Could not delete', error instanceof Error ? error.message : undefined);
          }
        }}
        title="Delete this expense?"
        description="This removes the record from all reports."
        confirmLabel="Delete expense"
      />
    </div>
  );
}
