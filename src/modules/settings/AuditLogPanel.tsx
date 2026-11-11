import { History } from 'lucide-react';
import { useAuditLogs } from '@/hooks/useDb';
import { formatDateTime } from '@/utils/date';
import { SectionCard } from '@/components/common/Card';
import { EmptyState } from '@/components/common/PageHeader';

const ACTION_LABEL: Record<string, string> = {
  BILL_CREATE: 'Bill created',
  BILL_CANCEL: 'Bill cancelled',
  REFUND_CREATE: 'Refund recorded',
  PAYMENT_CREATE: 'Payment recorded',
  PAYMENT_CORRECTION: 'Payment corrected',
  SALARY_FINALISE: 'Payroll finalised',
  SALARY_PAY: 'Salary paid',
  SALARY_ADJUST: 'Salary adjusted',
  ADVANCE_CREATE: 'Salary advance',
  STOCK_ADJUST: 'Stock adjusted',
  USER_CREATE: 'User created',
  USER_DEACTIVATE: 'User deactivated',
  USER_UPDATE: 'User updated',
  LEAVE_CREATE: 'Leave recorded',
  LEAVE_DECISION: 'Leave decision',
  BACKUP_CREATE: 'Backup created',
  BACKUP_RESTORE: 'Backup restored',
  SETTINGS_UPDATE: 'Settings changed',
  OFFER_SAVE: 'Offer saved',
  APPOINTMENT_CREATE: 'Appointment created',
  APPOINTMENT_OVERRIDE: 'Conflict override',
  APPOINTMENT_CANCEL: 'Appointment cancelled',
  BRIDAL_SAVE: 'Bridal booking saved',
  BLOCK_CREATE: 'Calendar blocked',
  LOGIN: 'Signed in',
  LOGIN_FAILED: 'Sign-in failed',
};

export function AuditLogPanel() {
  const logs = useAuditLogs(40);

  return (
    <SectionCard
      title="Audit history"
      subtitle="Sensitive actions are recorded — this log is append-only in the app"
      icon={<History className="h-4 w-4" />}
    >
      {logs.length === 0 ? (
        <EmptyState compact title="No audit entries yet" description="Actions appear here as they happen." />
      ) : (
        <ul className="divide-y divide-ink-100">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start gap-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[12.5px] font-medium text-ink-900">
                  {ACTION_LABEL[log.action] ?? log.action}
                  <span className="ml-1.5 text-[11px] font-normal text-ink-400">{log.entityType}</span>
                </p>
                <p className="text-[11px] text-ink-500">
                  {formatDateTime(log.createdAt)} · {log.userName ?? 'System'}
                  {log.reason ? ` · ${log.reason}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
