import { db } from '@/db/database';
import type { DateString, Expense, ExpenseCategory, IncomeEntry, IncomeSource, Paise, PaymentMethod } from '@/types';
import { newId } from '@/utils/id';
import { getActor } from '@/services/actor';

export async function listExpenseCategories(): Promise<ExpenseCategory[]> {
  return db.expenseCategories.orderBy('name').toArray();
}

export interface ExpenseInput {
  id?: string;
  category: string;
  description: string;
  amount: Paise;
  date: DateString;
  method: PaymentMethod;
  supplierId?: string;
  invoiceRef?: string;
}

export async function listExpenses(): Promise<Expense[]> {
  return db.expenses.orderBy('date').reverse().toArray();
}

export async function saveExpense(input: ExpenseInput): Promise<Expense> {
  if (!input.description.trim()) throw new Error('Add a short description for the expense.');
  if (!input.amount || input.amount <= 0) throw new Error('Expense amount must be greater than zero.');
  const actor = getActor();
  const now = Date.now();

  const record: Expense = {
    id: input.id ?? newId(),
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    category: input.category,
    description: input.description.trim(),
    amount: Math.round(input.amount),
    date: input.date,
    method: input.method,
    supplierId: input.supplierId,
    invoiceRef: input.invoiceRef?.trim() || undefined,
    createdByName: actor.name,
  };
  await db.expenses.put(record);
  return record;
}

export async function deleteExpense(id: string): Promise<void> {
  await db.expenses.delete(id);
}

export interface IncomeInput {
  id?: string;
  source: IncomeSource;
  description: string;
  amount: Paise;
  date: DateString;
  method: PaymentMethod;
  reference?: string;
}

export async function listIncomes(): Promise<IncomeEntry[]> {
  return db.incomes.orderBy('date').reverse().toArray();
}

export async function saveIncome(input: IncomeInput): Promise<IncomeEntry> {
  if (!input.description.trim()) throw new Error('Add a description for this income.');
  if (!input.amount || input.amount <= 0) throw new Error('Income amount must be greater than zero.');
  const actor = getActor();
  const now = Date.now();

  const record: IncomeEntry = {
    id: input.id ?? newId(),
    createdAt: now,
    updatedAt: now,
    createdBy: actor.id,
    source: input.source,
    description: input.description.trim(),
    amount: Math.round(input.amount),
    date: input.date,
    method: input.method,
    reference: input.reference?.trim() || undefined,
    createdByName: actor.name,
  };
  await db.incomes.put(record);
  return record;
}

export async function deleteIncome(id: string): Promise<void> {
  await db.incomes.delete(id);
}
