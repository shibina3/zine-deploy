import type { EmployeeLeave } from '@/types';
import type { Column } from '@/components/common/DataTable';
import { cancelLeave, decideLeave } from '@/db/repositories/employeeRepo';
import { LEAVE_STATUS } from '@/utils/constants';
import { daysBetweenInclusive, formatDate, todayISO } from '@/utils/date';
import { Button } from '@/components/common/Button';
import { StatusPill } from '@/components/common/Badge';
import { notifyError, notifySuccess } from '@/components/common/toastStore';

export const leaveColumns: Column<EmployeeLeave>[] = [
  {
    key: 'employee',
    header: 'Employee',
    cell: (leave) => (
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink-900">{leave.employeeName}</p>
        <p className="line-clamp-1 text-[11px] text-ink-500">{leave.reason}</p>
      </div>
    ),
  },
  {
    key: 'dates',
    header: 'Dates',
    cell: (leave) => {
      const days = daysBetweenInclusive(leave.startDate, leave.endDate);
      return (
        <div>
          <p className="text-[12.5px] text-ink-700">
            {formatDate(leave.startDate, 'd MMM')}
            {days > 1 ? ` – ${formatDate(leave.endDate, 'd MMM')}` : ''}
          </p>
          <p className="text-[11px] text-ink-500">
            {days} day{days > 1 ? 's' : ''} · {leave.paid ? 'Paid' : 'Unpaid'}
          </p>
        </div>
      );
    },
  },
  {
    key: 'status',
    header: 'Status',
    cell: (leave) => <StatusPill meta={LEAVE_STATUS[leave.status]} />,
  },
  {
    key: 'actions',
    header: '',
    align: 'right',
    cell: (leave) => (
      <div className="flex justify-end gap-1.5">
        {leave.status === 'PENDING' && (
          <>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                try {
                  await decideLeave(leave.id, 'APPROVED');
                  notifySuccess('Leave approved', leave.employeeName);
                } catch (error) {
                  notifyError('Could not approve', error instanceof Error ? error.message : undefined);
                }
              }}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="dangerGhost"
              onClick={async () => {
                try {
                  await decideLeave(leave.id, 'REJECTED');
                  notifySuccess('Leave rejected', leave.employeeName);
                } catch (error) {
                  notifyError('Could not reject', error instanceof Error ? error.message : undefined);
                }
              }}
            >
              Reject
            </Button>
          </>
        )}
        {leave.status === 'APPROVED' && leave.endDate >= todayISO() && (
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              try {
                await cancelLeave(leave.id);
                notifySuccess('Leave cancelled', leave.employeeName);
              } catch (error) {
                notifyError('Could not cancel', error instanceof Error ? error.message : undefined);
              }
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    ),
  },
];
