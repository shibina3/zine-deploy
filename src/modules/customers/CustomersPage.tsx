import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users } from 'lucide-react';
import type { Bill, Customer } from '@/types';
import { useAppointments, useBills, useCustomers } from '@/hooks/useDb';
import { sumPaise } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { DataTable } from '@/components/common/DataTable';
import { SearchInput } from '@/components/common/Field';
import { EmptyState, PageHeader } from '@/components/common/PageHeader';
import { CustomerDialog } from './CustomerDialog';
import { CustomerDrawer } from './CustomerDrawer';
import { customerColumns, type CustomerRow } from './CustomerTable';

export function CustomersPage() {
  const customers = useCustomers();
  const bills = useBills();
  const appointments = useAppointments();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState(false);

  const rows = useMemo<CustomerRow[]>(() => {
    const byCustomer = new Map<string, Bill[]>();
    for (const bill of bills) {
      if (bill.status === 'CANCELLED') continue;
      const list = byCustomer.get(bill.customerId) ?? [];
      list.push(bill);
      byCustomer.set(bill.customerId, list);
    }
    return customers.map((customer) => {
      const list = byCustomer.get(customer.id) ?? [];
      return {
        ...customer,
        visits: list.length,
        outstanding: sumPaise(list.map((bill) => bill.balance)),
      };
    });
  }, [customers, bills]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    const digits = term.replace(/\D/g, '');
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(term) ||
        (digits.length > 0 && row.phone.replace(/\D/g, '').includes(digits)),
    );
  }, [rows, query]);

  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const selectedBills = bills.filter((bill) => bill.customerId === selectedId);
  const selectedAppointments = appointments
    .filter((appointment) => appointment.customerId === selectedId)
    .sort((a, b) => b.startAt - a.startAt);

  return (
    <div>
      <PageHeader
        eyebrow="Relationships"
        title="Customers"
        description="Every customer, their history and their balance. Search by name or phone number."
        actions={
          <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
            Add customer
          </Button>
        }
      />

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3 p-3">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search name or phone…"
          className="w-full sm:w-[320px]"
        />
        <p className="text-[12px] text-ink-500">
          {filtered.length} of {rows.length} customers
        </p>
      </Card>

      <DataTable
        columns={customerColumns}
        rows={filtered}
        rowKey={(row) => row.id}
        onRowClick={(row) => setSelectedId(row.id)}
        empty={
          <EmptyState
            icon={<Users className="h-5 w-5" />}
            title={query ? 'No matching customers' : 'No customers yet'}
            description={
              query
                ? 'Try a different name or the last four digits of a phone number.'
                : 'Add your first customer to start billing and booking appointments.'
            }
            action={
              !query ? (
                <Button leadingIcon={<Plus className="h-4 w-4" />} onClick={() => setCreating(true)}>
                  Add customer
                </Button>
              ) : undefined
            }
          />
        }
      />

      <CustomerDialog
        open={creating || Boolean(editing)}
        customer={editing}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        onSaved={(customer) => {
          setCreating(false);
          setEditing(null);
          setSelectedId(customer.id);
        }}
      />

      <CustomerDrawer
        open={Boolean(selected)}
        summary={
          selected
            ? {
                customer: selected,
                visits: selected.visits,
                outstanding: selected.outstanding,
              }
            : null
        }
        bills={selectedBills}
        appointments={selectedAppointments}
        onClose={() => setSelectedId(null)}
        onEdit={() => selected && setEditing(selected)}
        onNewBill={() => selected && navigate(`/billing/new?customer=${selected.id}`)}
      />
    </div>
  );
}
