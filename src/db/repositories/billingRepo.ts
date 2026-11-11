import { db } from '@/db/database';
import type {
  Bill,
  BillItem,
  Epoch,
  ItemType,
  Paise,
  Payment,
  PaymentMethod,
  Refund,
} from '@/types';
import { newId } from '@/utils/id';
import { sumPaise } from '@/utils/money';
import { getActor } from '@/services/actor';
import { getSettings } from './settingsRepo';
import { applyMovement } from './inventoryRepo';
import { logAudit } from './auditRepo';
import { allRecipes } from './serviceRepo';
import { planServiceConsumption } from '@/modules/inventory/logic';
import {
  balanceDue,
  computeTotals,
  deriveBillStatus,
  nextBillNumber,
  type BillLineDraft,
} from '@/modules/billing/logic';

export interface DraftItem extends BillLineDraft {
  employeeId?: string;
  employeeName?: string;
}

export interface PaymentDraft {
  amount: Paise;
  method: PaymentMethod;
  reference?: string;
  kind?: 'BILL' | 'ADVANCE';
  note?: string;
}

export interface CreateBillInput {
  customerId: string;
  employeeId: string;
  lines: DraftItem[];
  billDiscount?: Paise;
  offerDiscount?: Paise;
  offerId?: string;
  offerName?: string;
  taxPercent: number;
  notes?: string;
  appointmentId?: string;
  bridalBookingId?: string;
  payments: PaymentDraft[];
  billDate?: Epoch;
}

export interface BillWithItems {
  bill: Bill;
  items: BillItem[];
  payments: Payment[];
  refunds: Refund[];
}

function startOfYear(year: number): Epoch {
  return new Date(year, 0, 1, 0, 0, 0, 0).getTime();
}

function endOfYear(year: number): Epoch {
  return new Date(year, 11, 31, 23, 59, 59, 999).getTime();
}

/** Suggests the next bill number without writing anything. */
export async function previewBillNumber(date: Epoch = Date.now()): Promise<string> {
  const settings = await getSettings();
  const year = new Date(date).getFullYear();
  const rows = await db.bills.where('billDate').between(startOfYear(year), endOfYear(year)).toArray();
  return nextBillNumber(settings.receiptPrefix, year, rows.map((row) => row.billNumber));
}

/**
 * Creates a bill and everything that must succeed with it:
 * bill + line snapshots + payments + stock movements + customer stats + audit.
 * Any failure rolls the whole transaction back.
 */
export async function createBill(input: CreateBillInput): Promise<BillWithItems> {
  const actor = getActor();
  const now = Date.now();
  const billDate = input.billDate ?? now;

  if (!input.lines.length) throw new Error('Add at least one service or product to the bill.');
  if (!input.customerId) throw new Error('Select a customer.');
  if (!input.employeeId) throw new Error('Select the employee who handled the service.');

  const customer = await db.customers.get(input.customerId);
  if (!customer) throw new Error('Customer not found.');
  const employee = await db.employees.get(input.employeeId);
  if (!employee) throw new Error('Employee not found.');

  const totals = computeTotals(input.lines, {
    billDiscount: input.billDiscount,
    offerDiscount: input.offerDiscount,
    taxPercent: input.taxPercent,
  });
  if (totals.total <= 0) throw new Error('Bill total must be greater than zero.');

  const validPayments = input.payments.filter((payment) => payment.amount > 0);
  const paid = sumPaise(validPayments.map((payment) => payment.amount));
  if (paid > totals.total) throw new Error('Payments cannot be more than the bill total.');

  const settings = await getSettings();
  const year = new Date(billDate).getFullYear();
  const yearBills = await db.bills.where('billDate').between(startOfYear(year), endOfYear(year)).toArray();
  const billNumber = nextBillNumber(
    settings.receiptPrefix,
    year,
    yearBills.map((row) => row.billNumber),
  );

  const billId = newId();
  const bill: Bill = {
    id: billId,
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    billNumber,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    employeeId: employee.id,
    employeeName: employee.name,
    billDate,
    subtotal: totals.subtotal,
    itemDiscount: totals.itemDiscount,
    billDiscount: totals.billDiscount,
    offerDiscount: totals.offerDiscount,
    taxableAmount: totals.taxableAmount,
    taxPercent: totals.taxPercent,
    taxAmount: totals.taxAmount,
    total: totals.total,
    paid,
    refunded: 0,
    balance: balanceDue(totals.total, paid),
    status: deriveBillStatus({ total: totals.total, paid }),
    offerId: input.offerId,
    offerName: input.offerName,
    notes: input.notes?.trim() || undefined,
    appointmentId: input.appointmentId,
    bridalBookingId: input.bridalBookingId,
  };

  const items: BillItem[] = input.lines.map((line) => {
    const gross = Math.round(line.quantity * line.unitPrice);
    const discount = Math.min(Math.max(0, line.discount), gross);
    return {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      billId,
      itemType: line.itemType as ItemType,
      refId: line.refId,
      name: line.name,
      category: line.category,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discount,
      lineTotal: gross - discount,
      employeeId: line.employeeId ?? employee.id,
      employeeName: line.employeeName ?? employee.name,
    };
  });

  const paymentRows: Payment[] = validPayments.map((payment) => ({
    id: newId(),
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    billId,
    amount: Math.round(payment.amount),
    method: payment.method,
    reference: payment.reference?.trim() || undefined,
    paidAt: now,
    note: payment.note,
    kind: payment.kind ?? 'BILL',
    createdByName: actor.name,
  }));

  return commitBill({ bill, items, paymentRows, now });
}

/**
 * Single atomic write for a new bill. Stock is deducted through the ledger, and
 * the appointment (if any) is marked completed in the same transaction.
 */
async function commitBill(input: {
  bill: Bill;
  items: BillItem[];
  paymentRows: Payment[];
  now: number;
}): Promise<BillWithItems> {
  const { bill, items, paymentRows, now } = input;

  await db.transaction(
    'rw',
    [
      db.bills,
      db.billItems,
      db.payments,
      db.stockMovements,
      db.products,
      db.customers,
      db.appointments,
      db.serviceRecipes,
    ],
    async () => {
      await db.bills.add(bill);
      await db.billItems.bulkAdd(items);
      if (paymentRows.length) await db.payments.bulkAdd(paymentRows);

      for (const item of items) {
        if (item.itemType === 'PRODUCT' && item.refId) {
          await applyMovement(
            {
              productId: item.refId,
              type: 'SALE',
              quantity: item.quantity,
              referenceType: 'BILL',
              referenceId: bill.id,
              note: `Sold on ${bill.billNumber}`,
            },
            now,
          );
        }
      }

      const recipes = await allRecipes();
      const serviceLines = items
        .filter((item) => item.itemType === 'SERVICE' && item.refId)
        .map((item) => ({ refId: item.refId as string | undefined, quantity: item.quantity }));
      const consumption = planServiceConsumption(serviceLines, recipes);
      for (const plan of consumption) {
        await applyMovement(
          {
            productId: plan.productId,
            type: 'SERVICE_CONSUMPTION',
            quantity: plan.quantity,
            referenceType: 'BILL',
            referenceId: bill.id,
            note: `Used for ${bill.billNumber}`,
          },
          now,
        );
      }

      const customerBills = await db.bills.where('customerId').equals(bill.customerId).toArray();
      const activeBills = customerBills.filter((row) => row.status !== 'CANCELLED');
      await db.customers.update(bill.customerId, {
        totalSpend: sumPaise(activeBills.map((row) => row.total)),
        lastVisitAt: Math.max(...activeBills.map((row) => row.billDate)),
        updatedAt: now,
      });

      if (bill.appointmentId) {
        await db.appointments.update(bill.appointmentId, { status: 'COMPLETED', updatedAt: now });
      }
    },
  );

  await logAudit({
    action: 'BILL_CREATE',
    entityType: 'bill',
    entityId: bill.id,
    newValue: {
      billNumber: bill.billNumber,
      total: bill.total,
      paid: bill.paid,
      employee: bill.employeeName,
      items: items.length,
    },
  });

  return { bill, items, payments: paymentRows, refunds: [] };
}

export async function getBill(billId: string): Promise<BillWithItems | null> {
  const bill = await db.bills.get(billId);
  if (!bill) return null;
  const [items, payments, refunds] = await Promise.all([
    db.billItems.where('billId').equals(billId).toArray(),
    db.payments.where('billId').equals(billId).toArray(),
    db.refunds.where('billId').equals(billId).toArray(),
  ]);
  return { bill, items, payments, refunds };
}

export async function listBills(): Promise<Bill[]> {
  return db.bills.orderBy('billDate').reverse().toArray();
}

export async function listPayments(): Promise<Payment[]> {
  return db.payments.orderBy('paidAt').reverse().toArray();
}

export async function listRefunds(): Promise<Refund[]> {
  return db.refunds.orderBy('refundedAt').reverse().toArray();
}

export async function pendingBills(): Promise<Bill[]> {
  const bills = await db.bills.orderBy('billDate').reverse().toArray();
  return bills.filter((bill) => bill.status !== 'CANCELLED' && bill.balance > 0);
}

/** Records an additional (split) payment against an outstanding balance. */
export async function addPayment(
  billId: string,
  input: { amount: Paise; method: PaymentMethod; reference?: string; note?: string; kind?: 'BILL' | 'ADVANCE' },
): Promise<Bill> {
  const actor = getActor();
  const now = Date.now();
  if (!input.amount || input.amount <= 0) throw new Error('Payment amount must be greater than zero.');

  let updated: Bill | undefined;

  await db.transaction('rw', [db.bills, db.payments], async () => {
    const bill = await db.bills.get(billId);
    if (!bill) throw new Error('Bill not found.');
    if (bill.status === 'CANCELLED') throw new Error('Cancelled bills cannot take payments.');
    if (bill.balance <= 0) throw new Error('This bill is already fully paid.');
    if (Math.round(input.amount) > bill.balance) {
      throw new Error('Payment cannot be more than the outstanding balance.');
    }

    const amount = Math.round(input.amount);
    const paid = bill.paid + amount;
    const balance = balanceDue(bill.total, paid);
    const status = deriveBillStatus({ total: bill.total, paid, refunded: bill.refunded });

    await db.payments.add({
      id: newId(),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      billId,
      amount,
      method: input.method,
      reference: input.reference?.trim() || undefined,
      paidAt: now,
      note: input.note?.trim() || undefined,
      kind: input.kind ?? 'BILL',
      createdByName: actor.name,
    });

    await db.bills.update(billId, { paid, balance, status, updatedAt: now });
    updated = { ...bill, paid, balance, status, updatedAt: now };
  });

  if (!updated) throw new Error('Payment could not be recorded.');

  await logAudit({
    action: 'PAYMENT_CREATE',
    entityType: 'bill',
    entityId: billId,
    newValue: { amount: input.amount, method: input.method, paid: updated.paid, balance: updated.balance },
  });

  return updated;
}

/**
 * Cancels a bill: never deletes it. Reverses stock deduction, preserves payment
 * history and lets the owner record any refund as a separate transaction.
 */
export async function cancelBill(billId: string, reason: string, approvedBy?: string): Promise<void> {
  const trimmedReason = reason.trim();
  if (trimmedReason.length < 3) throw new Error('A cancellation reason is required.');

  const actor = getActor();
  const now = Date.now();

  await db.transaction('rw', [db.bills, db.stockMovements, db.products, db.customers], async () => {
    const bill = await db.bills.get(billId);
    if (!bill) throw new Error('Bill not found.');
    if (bill.status === 'CANCELLED') throw new Error('This bill is already cancelled.');

    const movements = await db.stockMovements.where('referenceId').equals(billId).toArray();
    for (const movement of movements) {
      if (movement.quantity >= 0) continue;
      if (movement.type !== 'SALE' && movement.type !== 'SERVICE_CONSUMPTION') continue;
      await applyMovement(
        {
          productId: movement.productId,
          type: 'CANCELLATION_REVERSAL',
          quantity: Math.abs(movement.quantity),
          unitCost: movement.unitCost,
          referenceType: 'BILL_CANCEL',
          referenceId: billId,
          note: `Stock returned for cancelled ${bill.billNumber}`,
        },
        now,
      );
    }

    await db.bills.update(billId, {
      status: 'CANCELLED',
      balance: 0,
      cancelReason: trimmedReason,
      cancelledAt: now,
      cancelledBy: actor.id,
      cancellationApprovedBy: approvedBy,
      updatedAt: now,
    });

    const customerBills = await db.bills.where('customerId').equals(bill.customerId).toArray();
    const activeBills = customerBills.filter((row) => row.status !== 'CANCELLED' && row.id !== billId);
    await db.customers.update(bill.customerId, {
      totalSpend: sumPaise(activeBills.map((row) => row.total)),
      lastVisitAt: activeBills.length ? Math.max(...activeBills.map((row) => row.billDate)) : undefined,
      updatedAt: now,
    });
  });

  await logAudit({
    action: 'BILL_CANCEL',
    entityType: 'bill',
    entityId: billId,
    reason: trimmedReason,
    newValue: { cancelledAt: now, approvedBy },
  });
}

/** Refunds are separate transactions; the original payment rows stay untouched. */
export async function createRefund(
  billId: string,
  input: { amount: Paise; method: PaymentMethod; reason: string },
): Promise<Refund> {
  const reason = input.reason.trim();
  if (!reason) throw new Error('A refund reason is required.');
  if (!input.amount || input.amount <= 0) throw new Error('Refund amount must be greater than zero.');

  const actor = getActor();
  const now = Date.now();
  let refund: Refund | undefined;

  await db.transaction('rw', [db.bills, db.refunds], async () => {
    const bill = await db.bills.get(billId);
    if (!bill) throw new Error('Bill not found.');
    if (bill.status === 'CANCELLED') throw new Error('Cancelled bills cannot be refunded here.');
    const refundable = bill.paid - bill.refunded;
    if (refundable <= 0) throw new Error('There is no paid amount left to refund.');
    if (Math.round(input.amount) > refundable) {
      throw new Error('Refund cannot be more than the refundable amount.');
    }
    const amount = Math.round(input.amount);

    const record: Refund = {
      id: newId(),
      createdAt: now,
      updatedAt: now,
      createdBy: actor.id,
      billId,
      billNumber: bill.billNumber,
      amount,
      method: input.method,
      reason,
      refundedAt: now,
      createdByName: actor.name,
    };
    await db.refunds.add(record);
    refund = record;

    const refunded = bill.refunded + amount;
    const status = deriveBillStatus({ total: bill.total, paid: bill.paid, refunded });
    await db.bills.update(billId, {
      refunded,
      status,
      balance: balanceDue(bill.total, bill.paid),
      updatedAt: now,
    });
  });

  if (!refund) throw new Error('Refund could not be recorded.');

  await logAudit({
    action: 'REFUND_CREATE',
    entityType: 'bill',
    entityId: billId,
    reason,
    newValue: { amount: refund.amount, method: refund.method },
  });

  return refund;
}

