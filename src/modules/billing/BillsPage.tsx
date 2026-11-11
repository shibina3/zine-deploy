import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ReceiptText } from 'lucide-react';
import { useBills, useCustomers } from '@/hooks/useDb';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable } from '@/components/common/DataTable';
import { SearchInput } from '@/components/common/Field';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { Tabs } from '@/components/common/Tabs';
import { BillDrawer } from './BillDrawer';
import { billColumns } from './BillTable';

type StatusFilter = 'ALL' | 'PENDING' | 'PAID' | 'CANCELLED' | 'REFUNDED';

export function BillsPage() {
  const bills = useBills();
  const customers = useCustomers();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return bills.filter((bill) => {
      const matchesTerm =
        !term ||
        bill.billNumber.toLowerCase().includes(term) ||
        bill.customerName.toLowerCase().includes(term) ||
        bill.customerPhone.includes(term) ||
        bill.employeeName.toLowerCase().includes(term);
      if (!matchesTerm) return false;
      switch (filter) {
        case 'PENDING':
          return bill.balance > 0 && bill.status !== 'CANCELLED';
        case 'PAID':
          return bill.status === 'PAID';
        case 'CANCELLED':
          return bill.status === 'CANCELLED';
        case 'REFUNDED':
          return bill.status === 'REFUNDED' || bill.status === 'PARTIALLY_REFUNDED';
        default:
          return true;
      }
    });
  }, [bills, query, filter]);

  const counts = useMemo(
    () => ({
      ALL: bills.length,
      PENDING: bills.filter((bill) => bill.balance > 0 && bill.status !== 'CANCELLED').length,
      PAID: bills.filter((bill) => bill.status === 'PAID').length,
      CANCELLED: bills.filter((bill) => bill.status === 'CANCELLED').length,
      REFUNDED: bills.filter((bill) => bill.status === 'REFUNDED' || bill.status === 'PARTIALLY_REFUNDED')
        .length,
    }),
    [bills],
  );

  const phones = useMemo(
    () => new Map(customers.map((customer) => [customer.id, customer.phone])),
    [customers],
  );

  return (
    <div>
      <PageHeader
        eyebrow="Counter"
        title="Bills"
        description="Every bill is kept forever — cancellations and refunds are recorded, never deleted."
        actions={
          <Link to="/billing/new">
            <Button leadingIcon={<Plus className="h-4 w-4" />}>New bill</Button>
          </Link>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Bill number, customer or employee…"
          className="w-full sm:w-[340px]"
        />
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'ALL', label: 'All', count: counts.ALL },
            { value: 'PENDING', label: 'Pending', count: counts.PENDING },
            { value: 'PAID', label: 'Paid', count: counts.PAID },
            { value: 'REFUNDED', label: 'Refunded', count: counts.REFUNDED },
            { value: 'CANCELLED', label: 'Cancelled', count: counts.CANCELLED },
          ]}
        />
      </Card>

      <DataTable
        columns={billColumns(phones)}
        rows={filtered}
        rowKey={(bill) => bill.id}
        onRowClick={(bill) => setSelectedId(bill.id)}
        empty={
          <EmptyState
            icon={<ReceiptText className="h-5 w-5" />}
            title={bills.length ? 'No bills match this filter' : 'No bills yet'}
            description={
              bills.length
                ? 'Try a different search or status filter.'
                : 'Generate your first bill from the counter to start tracking sales.'
            }
            action={
              !bills.length ? (
                <Link to="/billing/new">
                  <Button leadingIcon={<Plus className="h-4 w-4" />}>Create bill</Button>
                </Link>
              ) : undefined
            }
          />
        }
      />

      <BillDrawer billId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
