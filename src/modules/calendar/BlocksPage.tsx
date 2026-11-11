import { useMemo, useState } from 'react';
import { Blocks, CalendarOff, Plus, Trash2 } from 'lucide-react';
import type { CalendarBlock } from '@/types';
import { useBlocks } from '@/hooks/useDb';
import { deleteBlock } from '@/db/repositories/calendarRepo';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { formatDate, formatTime, todayISO } from '@/utils/date';
import { Badge } from '@/components/common/Badge';
import { Button, IconButton } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { ConfirmDialog } from '@/components/common/Modal';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { BlockDialog } from './BlockDialog';

export function BlocksPage() {
  const blocks = useBlocks();
  const today = todayISO();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<CalendarBlock | null>(null);
  const [presetDate, setPresetDate] = useState(today);

  const sorted = useMemo(
    () => [...blocks].sort((a, b) => b.startAt - a.startAt),
    [blocks],
  );
  const upcoming = sorted.filter((block) => formatDate(block.endAt, 'yyyy-MM-dd') >= today);
  const past = sorted.filter((block) => formatDate(block.endAt, 'yyyy-MM-dd') < today);

  return (
    <div>
      <PageHeader
        eyebrow="Availability"
        title="Blocked dates"
        description="Close the salon or make an employee unavailable. Appointments cannot be booked inside a block without an owner override."
        actions={
          <div className="flex gap-2">
            <input
              type="date"
              value={presetDate}
              onChange={(event) => setPresetDate(event.target.value)}
              className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-[12.5px] text-ink-700"
            />
            <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
              Block time
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 font-display text-lg text-ink-900">Upcoming</h2>
          {upcoming.length === 0 ? (
            <Card>
              <EmptyState
                compact
                icon={<Blocks className="h-5 w-5" />}
                title="No blocked periods"
                description="The salon is available according to its business hours."
              />
            </Card>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((block) => (
                <BlockRow key={block.id} block={block} onDelete={() => setDeleting(block)} />
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-display text-lg text-ink-900">Past blocks</h2>
          {past.length === 0 ? (
            <Card>
              <EmptyState
                compact
                icon={<CalendarOff className="h-5 w-5" />}
                title="Nothing yet"
                description="Past blocks stay here for reference."
              />
            </Card>
          ) : (
            <ul className="space-y-2">
              {past.slice(0, 12).map((block) => (
                <BlockRow key={block.id} block={block} onDelete={() => setDeleting(block)} muted />
              ))}
            </ul>
          )}
        </div>
      </div>

      <BlockDialog
        open={creating}
        block={null}
        presetDate={presetDate}
        onClose={() => setCreating(false)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteBlock(deleting.id);
            notifySuccess('Block removed', deleting.reason);
            setDeleting(null);
          } catch (error) {
            notifyError('Could not remove block', error instanceof Error ? error.message : undefined);
          }
        }}
        title="Remove this block?"
        description="Appointments can be booked in this period again."
        confirmLabel="Remove block"
        tone="danger"
      />
    </div>
  );
}

function BlockRow({
  block,
  onDelete,
  muted,
}: {
  block: CalendarBlock;
  onDelete: () => void;
  muted?: boolean;
}) {
  return (
    <li
      className={
        muted
          ? 'flex items-start gap-3 rounded-2xl border border-ink-200/60 bg-ink-50/40 px-4 py-3'
          : 'flex items-start gap-3 rounded-2xl border border-ink-200/70 bg-porcelain px-4 py-3 shadow-card'
      }
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-gold-300">
        <CalendarOff className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-[13px] font-medium text-ink-900">{formatDate(block.startAt, 'd MMM yyyy')}</p>
          <Badge tone={block.scope === 'SALON' ? 'wine' : 'neutral'}>
            {block.scope === 'SALON' ? 'Salon' : block.employeeName || 'Employee'}
          </Badge>
        </div>
        <p className="mt-0.5 text-[11.5px] text-ink-500">
          {formatTime(block.startAt)}–{formatTime(block.endAt)} · {block.reason}
        </p>
      </div>
      <IconButton label="Remove block" variant="dangerGhost" onClick={onDelete}>
        <Trash2 className="h-3.5 w-3.5" />
      </IconButton>
    </li>
  );
}
