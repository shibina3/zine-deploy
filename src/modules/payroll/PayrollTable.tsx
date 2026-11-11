import type { SalaryRecord } from '@/types';
import type { Column } from '@/components/common/DataTable';
import { PAYROLL_STATUS } from '@/utils/constants';
import { formatINR } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/Badge';

export function payrollColumns({
  onPay,
  onFinalise,
  busyId,
}: {
  onPay: (record: SalaryRecord) => void;
  onFinalise: (record: SalaryRecord) => void;
  busyId: string | null;
}): Column<SalaryRecord>[] {
  return [
    {
      key: 'employee',
      header: 'Employee',
      cell: (record) => (
        <div>
          <p className="text-[13px] font-medium text-ink-900">{record.employeeName}</p>
          <p className="text-[11px] text-ink-500">
            {record.salaryMonth} · {record.paidLeaveDays} paid / {record.unpaidLeaveDays} unpaid leave
          </p>
        </div>
      ),
    },
    {
      key: 'earnings',
      header: 'Earnings',
      align: 'right',
      cell: (record) => (
        <div>
          <p className="text-[12.5px] font-medium tabular-nums text-ink-800">{formatINR(record.gross)}</p>
          <p className="text-[10.5px] text-ink-400">
            fixed {formatINR(record.fixedSalary)} · comm {formatINR(record.commission)}
          </p>
        </div>
      ),
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
    },
    {
      key: 'deductions',
      header: 'Deductions',
      align: 'right',
      cell: (record) => (
        <div>
          <p className="text-[12.5px] font-medium tabular-nums text-rose-600">
            − {formatINR(record.unpaidLeaveDeduction + record.advanceDeduction)}
          </p>
          <p className="text-[10.5px] text-ink-400">
            leave {formatINR(record.unpaidLeaveDeduction)} · advance {formatINR(record.advanceDeduction)}
          </p>
        </div>
      ),
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
    },
    {
      key: 'net',
      header: 'Net payable',
      align: 'right',
      cell: (record) => (
        <div>
          <p className="text-[13px] font-semibold tabular-nums text-ink-900">{formatINR(record.netPayable)}</p>
          <p className="text-[10.5px] text-ink-400">
            paid {formatINR(record.paid)} · due {formatINR(record.balance)}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      cell: (record) => <StatusPill meta={PAYROLL_STATUS[record.status]} />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (record) => (
        <div className="flex justify-end gap-1.5">
          {record.status === 'DRAFT' && (
            <Button
              size="sm"
              variant="secondary"
              loading={busyId === record.id}
              onClick={() => onFinalise(record)}
            >
              Finalise
            </Button>
          )}
          {record.balance > 0 && record.status !== 'DRAFT' && (
            <Button size="sm" variant="gold" onClick={() => onPay(record)}>
              Pay
            </Button>
          )}
          {record.balance > 0 && record.status === 'DRAFT' && (
            <span className="text-[10.5px] text-ink-400">Finalise first</span>
          )}
        </div>
      ),
    },
  ];
}
