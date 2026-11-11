import type { Employee } from '@/types';
import type { Column } from '@/components/common/DataTable';
import { setEmployeeActive } from '@/db/repositories/employeeRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { SALARY_TYPE_LABEL } from '@/utils/constants';
import { formatDate } from '@/utils/date';
import { formatINR } from '@/utils/money';
import { cn } from '@/utils/cn';
import { Avatar } from '@/components/common/Badge';

export function employeeColumns(loginByEmployee: Map<string, string>): Column<Employee>[] {
  return [
    {
      key: 'name',
      header: 'Employee',
      cell: (employee) => (
        <div className="flex items-center gap-2.5">
          <Avatar name={employee.name} size="sm" />
          <div>
            <p className="text-[13px] font-medium text-ink-900">{employee.name}</p>
            <p className="text-[11px] text-ink-500">
              {employee.designation} · since {formatDate(employee.joinedAt, 'MMM yyyy')}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      header: 'Contact',
      cell: (employee) => <span className="text-[12.5px] text-ink-600">{employee.phone || '—'}</span>,
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
    },
    {
      key: 'salary',
      header: 'Salary structure',
      cell: (employee) => (
        <div>
          <p className="text-[12px] font-medium text-ink-800">{SALARY_TYPE_LABEL[employee.salaryType]}</p>
          <p className="text-[11px] text-ink-500">
            {employee.fixedSalary > 0 ? `${formatINR(employee.fixedSalary)}/mo` : 'No fixed pay'}
            {employee.commissionRateBps > 0 ? ` · ${employee.commissionRateBps / 100}% commission` : ''}
          </p>
        </div>
      ),
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
    },
    {
      key: 'login',
      header: 'Login',
      cell: (employee) =>
        loginByEmployee.has(employee.id) ? (
          <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.06em] text-sage-700">
            @{loginByEmployee.get(employee.id)}
          </span>
        ) : (
          <span className="text-[11.5px] text-ink-300">No login</span>
        ),
      headerClassName: 'hidden md:table-cell',
      className: 'hidden md:table-cell',
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (employee) => (
        <button
          onClick={async (event) => {
            event.stopPropagation();
            try {
              await setEmployeeActive(employee.id, !employee.isActive);
              notifySuccess(
                employee.isActive ? 'Employee deactivated' : 'Employee activated',
                employee.name,
              );
            } catch (error) {
              notifyError('Could not update employee', error instanceof Error ? error.message : undefined);
            }
          }}
          className={cn(
            'rounded-full px-2.5 py-1 text-[10.5px] font-semibold uppercase tracking-[0.06em] transition-colors',
            employee.isActive
              ? 'bg-sage-50 text-sage-700 hover:bg-sage-100'
              : 'bg-ink-100 text-ink-500 hover:bg-ink-200',
          )}
        >
          {employee.isActive ? 'Active' : 'Inactive'}
        </button>
      ),
    },
  ];
}
