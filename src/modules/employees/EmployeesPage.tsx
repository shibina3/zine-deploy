import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Plus, UserCog, Wallet } from 'lucide-react';
import type { Employee } from '@/types';
import { useEmployees, useUsers } from '@/hooks/useDb';
import { formatINR } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { EmployeeDialog } from './EmployeeDialog';
import { employeeColumns } from './EmployeeTable';

export function EmployeesPage() {
  const employees = useEmployees(true);
  const users = useUsers();
  const [editing, setEditing] = useState<Employee | null>(null);
  const [creating, setCreating] = useState(false);

  const logins = useMemo(() => {
    const map = new Map<string, string>();
    for (const user of users) {
      if (user.employeeId) map.set(user.employeeId, user.username);
    }
    return map;
  }, [users]);

  return (
    <div>
      <PageHeader
        eyebrow="Team"
        title="Employees"
        description="Profiles, salary rules and logins. Leave and payroll live in the next tabs."
        actions={
          <>
            <Link to="/employees/leave">
              <Button variant="secondary" leadingIcon={<CalendarDays className="h-4 w-4" />}>
                Leave
              </Button>
            </Link>
            <Link to="/employees/payroll">
              <Button variant="secondary" leadingIcon={<Wallet className="h-4 w-4" />}>
                Payroll
              </Button>
            </Link>
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Add employee
            </Button>
          </>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Active team</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {employees.filter((employee) => employee.isActive).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">With logins</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {users.filter((user) => user.employeeId).length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Fixed payroll / month
          </p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {formatINR(
              employees
                .filter((employee) => employee.isActive)
                .reduce((total, employee) => total + employee.fixedSalary, 0),
            )}
          </p>
        </Card>
      </div>

      <DataTable
        columns={employeeColumns(logins)}
        rows={employees}
        rowKey={(employee) => employee.id}
        onRowClick={(employee) => setEditing(employee)}
        empty={
          <EmptyState
            icon={<UserCog className="h-5 w-5" />}
            title="No employees yet"
            description="Add your team to assign appointments, track leave and run payroll."
            action={
              <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                Add employee
              </Button>
            }
          />
        }
      />

      <EmployeeDialog
        open={creating || Boolean(editing)}
        employee={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
      />
    </div>
  );
}
