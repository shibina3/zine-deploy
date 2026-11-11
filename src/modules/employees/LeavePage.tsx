import { useMemo, useState } from 'react';
import { CalendarCheck, Plus } from 'lucide-react';
import { useLeaves } from '@/hooks/useDb';
import { todayISO } from '@/utils/date';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable } from '@/components/common/DataTable';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { Tabs } from '@/components/common/Tabs';
import { LeaveDialog } from './LeaveDialog';
import { leaveColumns } from './LeaveTable';

export function LeavePage() {
  const leaves = useLeaves();
  const [filter, setFilter] = useState<'PENDING' | 'APPROVED' | 'ALL'>('PENDING');
  const [creating, setCreating] = useState(false);
  const today = todayISO();

  const filtered = useMemo(() => {
    if (filter === 'ALL') return leaves;
    return leaves.filter((leave) => leave.status === filter);
  }, [leaves, filter]);

  const onLeaveToday = leaves.filter(
    (leave) => leave.status === 'APPROVED' && leave.startDate <= today && today <= leave.endDate,
  ).length;

  return (
    <div>
      <PageHeader
        eyebrow="Team"
        title="Leave management"
        description="Approved leave automatically removes the employee from appointment availability. No attendance tracking."
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Record leave
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            Pending approval
          </p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-gold-700">
            {leaves.filter((leave) => leave.status === 'PENDING').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">Approved</p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {leaves.filter((leave) => leave.status === 'APPROVED').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-ink-500">
            On leave today
          </p>
          <p className="mt-2 font-display text-[22px] font-medium tabular-nums text-ink-900">
            {onLeaveToday}
          </p>
        </Card>
      </div>

      <Card className="mb-4 p-3">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            {
              value: 'PENDING',
              label: 'Pending',
              count: leaves.filter((leave) => leave.status === 'PENDING').length,
            },
            {
              value: 'APPROVED',
              label: 'Approved',
              count: leaves.filter((leave) => leave.status === 'APPROVED').length,
            },
            { value: 'ALL', label: 'All', count: leaves.length },
          ]}
        />
      </Card>

      <DataTable
        columns={leaveColumns}
        rows={filtered}
        rowKey={(leave) => leave.id}
        empty={
          <EmptyState
            icon={<CalendarCheck className="h-5 w-5" />}
            title={filter === 'PENDING' ? 'No leave awaiting approval' : 'No leave records'}
            description="Record leave so the calendar knows when an employee is unavailable."
            action={
              filter !== 'PENDING' ? (
                <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                  Record leave
                </Button>
              ) : undefined
            }
          />
        }
      />

      <LeaveDialog open={creating} onClose={() => setCreating(false)} />
    </div>
  );
}
