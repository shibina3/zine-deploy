import { db } from '@/db/database';
import type { Customer } from '@/types';
import { newId } from '@/utils/id';
import { sumPaise } from '@/utils/money';

export interface CustomerInput {
  id?: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
}

export async function listCustomers(): Promise<Customer[]> {
  return db.customers.orderBy('createdAt').reverse().toArray();
}

export async function getCustomer(id: string): Promise<Customer | undefined> {
  return db.customers.get(id);
}

/** Searches by name or phone digits. Phone is the primary index. */
export async function searchCustomers(term: string, limit = 50): Promise<Customer[]> {
  const query = term.trim().toLowerCase();
  if (!query) return listCustomers();
  const digits = query.replace(/\D/g, '');

  const byPhone = digits
    ? await db.customers.where('phone').startsWithIgnoreCase(digits).limit(limit).toArray()
    : [];

  const byName = await db.customers
    .filter(
      (customer) =>
        customer.name.toLowerCase().includes(query) ||
        (digits.length > 0 && customer.phone.replace(/\D/g, '').includes(digits)),
    )
    .limit(limit)
    .toArray();

  const merged = new Map<string, Customer>();
  for (const customer of [...byPhone, ...byName]) merged.set(customer.id, customer);
  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function saveCustomer(input: CustomerInput): Promise<Customer> {
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!name) throw new Error('Customer name is required.');
  if (!phone) throw new Error('Mobile number is required.');

  const duplicate = await db.customers.where('phone').equals(phone).first();
  if (duplicate && duplicate.id !== input.id) {
    throw new Error(`${duplicate.name} already uses this mobile number.`);
  }

  const now = Date.now();
  if (input.id) {
    const existing = await db.customers.get(input.id);
    if (!existing) throw new Error('Customer not found.');
    const updated: Customer = {
      ...existing,
      name,
      phone,
      email: input.email?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      updatedAt: now,
    };
    await db.customers.put(updated);
    return updated;
  }

  const customer: Customer = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name,
    phone,
    email: input.email?.trim() || undefined,
    notes: input.notes?.trim() || undefined,
    totalSpend: 0,
  };
  await db.customers.add(customer);
  return customer;
}

/** Recomputes lifetime spend/last visit from bills. Used after billing/cancel/refund. */
export async function recomputeCustomerStats(customerId: string): Promise<void> {
  const bills = await db.bills.where('customerId').equals(customerId).toArray();
  const active = bills.filter((bill) => bill.status !== 'CANCELLED');
  const totalSpend = sumPaise(active.map((bill) => bill.total));
  const lastVisitAt = active.length ? Math.max(...active.map((bill) => bill.billDate)) : undefined;
  await db.customers.update(customerId, { totalSpend, lastVisitAt, updatedAt: Date.now() });
}

export async function deleteCustomer(id: string): Promise<void> {
  const billCount = await db.bills.where('customerId').equals(id).count();
  if (billCount > 0) throw new Error('Customers with billing history cannot be deleted.');
  await db.customers.delete(id);
}
