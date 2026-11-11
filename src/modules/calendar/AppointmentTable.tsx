import type { Appointment } from '@/types';
import type { Column } from '@/components/common/DataTable';
import { APPOINTMENT_STATUS } from '@/utils/constants';
import { formatDate, formatTime } from '@/utils/date';
import { StatusPill } from '@/components/common/Badge';

export function appointmentColumns(
  onToggleStatus: (appointment: Appointment) => void,
): Column<Appointment>[] {
  return [
    {
      key: 'when',
      header: 'When',
      cell: (appointment) => (
        <div>
          <p className="text-[12.5px] font-medium text-ink-800">
            {formatDate(appointment.startAt, 'd MMM yyyy')}
          </p>
          <p className="text-[11px] tabular-nums text-ink-500">
            {formatTime(appointment.startAt)} – {formatTime(appointment.endAt)}
          </p>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      cell: (appointment) => (
        <div className="min-w-0">
          <p className="truncate text-[13px] font-medium text-ink-900">{appointment.customerName}</p>
          <p className="text-[11px] text-ink-500">{appointment.customerPhone}</p>
        </div>
      ),
    },
    {
      key: 'services',
      header: 'Services',
      cell: (appointment) => (
        <span className="line-clamp-2 max-w-[240px] text-[12px] text-ink-600">
          {appointment.serviceNames.join(' · ') || '—'}
        </span>
      ),
      headerClassName: 'hidden lg:table-cell',
      className: 'hidden lg:table-cell',
    },
    {
      key: 'employee',
      header: 'Employee',
      cell: (appointment) => (
        <span className="text-[12.5px] text-ink-600">{appointment.employeeName}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'right',
      cell: (appointment) => (
        <button type="button" onClick={() => onToggleStatus(appointment)} title="Toggle completed">
          <StatusPill meta={APPOINTMENT_STATUS[appointment.status]} />
        </button>
      ),
    },
  ];
}
