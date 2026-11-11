import { useMemo, useState } from 'react';
import { Banknote, Plus, Wallet } from 'lucide-react';
import type { SalaryRecord } from '@/types';
import { useEmployees, useSalaryRecords } from '@/hooks/useDb';
import { finaliseSalary, generateSalaryRecord } from '@/db/repositories/payrollRepo';
import { currentMonth } from '@/utils/date';
import { formatINR, sumPaise } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { payrollColumns } from './PayrollTable';
import { AdvanceDialog, SalaryPaymentDialog } from './PayrollDialogs';
import { AdvancesPanel } from './AdvancesPanel';

export function PayrollPage() {
  const records = useSalaryRecords();
  const employees = useEmployees();
  const [month, setMonth] = useState(currentMonth());
  const [paying, setPaying] = useState<SalaryRecord | null>(null);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const monthRecords = useMemo(
    () => records.filter((record) => record.salaryMonth === month),
    [records, month],
  );

  const missing = useMemo(
    () =>
      employees.filter(
        (employee) =>
          employee.isActive && !monthRecords.some((record) => record.employeeId === employee.id),
      ),
    [employees, monthRecords],
  );

  const totals = useMemo(
    () => ({
      net: sumPaise(monthRecords.map((record) => record.netPayable)),
      paid: sumPaise(monthRecords.map((record) => record.paid)),
      due: sumPaise(monthRecords.map((record) => record.balance)),
    }),
    [monthRecords],
  );

  const generate = async () => {
    if (!missing.length) {
      notifyError('Nothing to generate', 'Every active employee already has a record this month.');
      return;
    }
    setGenerating(true);
    try {
      for (const employee of missing) {
        await generateSalaryRecord({ employeeId: employee.id, salaryMonth: month });
      }
      notifySuccess('Payroll drafts created', `${missing.length} employee record(s) for ${month}.`);
    } catch (error) {
      notifyError('Could not generate payroll', error instanceof Error ? error.message : undefined);
    } finally {
      setGenerating(false);
    }
  };

  const finalise = async (record: SalaryRecord) => {
    setBusyId(record.id);
    try {
      await finaliseSalary(record.id);
      notifySuccess('Payroll finalised', `${record.employeeName} · ${record.salaryMonth}`);
    } catch (error) {
      notifyError('Could not finalise', error instanceof Error ? error.message : undefined);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <PageHeader
        eyebrow="Team"
        title="Salary & payroll"
        description="Fixed, commission or combined salary. Finalised payroll is never overwritten — corrections are adjustments."
        actions={
          <>
            <Button
              variant="secondary"
              leadingIcon={<Wallet className="h-4 w-4" />}
              onClick={() => setAdvanceOpen(true)}
            >
              Advance
            </Button>
            <Button
              leadingIcon={<Plus className="h-4 w-4" />}
              loading={generating}
              onClick={() => void generate()}
            >
              Generate {month}
            </Button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Payroll month
          </p>
          <input
            type="month"
            value={month}
            onChange={(event) => setMonth(event.target.value)}
            className="mt-2 h-9 w-full rounded-lg border border-ink-200 bg-white px-2 text-[13px] font-medium text-ink-800"
          />
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Net payable</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {formatINR(totals.net)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Paid</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-sage-700">
            {formatINR(totals.paid)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Outstanding
          </p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-rose-600">
            {formatINR(totals.due)}
          </p>
        </Card>
      </div>

      {missing.length > 0 && (
        <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 border-gold-200/70 bg-gold-50/50 p-4">
          <div>
            <p className="text-[13px] font-semibold text-ink-900">
              {missing.length} employee(s) without a draft
            </p>
            <p className="mt-0.5 text-[11.5px] text-ink-500">
              Commission comes from service revenue; leave deductions from approved leave.
            </p>
          </div>
          <Button size="sm" loading={generating} onClick={() => void generate()}>
            Generate drafts
          </Button>
        </Card>
      )}

      <DataTable
        columns={payrollColumns({ onPay: setPaying, onFinalise: finalise, busyId })}
        rows={monthRecords}
        rowKey={(record) => record.id}
        empty={
          <EmptyState
            icon={<Banknote className="h-5 w-5" />}
            title="No payroll for this month"
            description="Generate drafts to calculate fixed salary, commission, incentives and leave deductions."
            action={
              <Button loading={generating} onClick={() => void generate()}>
                Generate payroll
              </Button>
            }
          />
        }
      />

      <AdvancesPanel />

      <SalaryPaymentDialog record={paying} open={Boolean(paying)} onClose={() => setPaying(null)} />
      <AdvanceDialog open={advanceOpen} onClose={() => setAdvanceOpen(false)} />
    </div>
  );
}