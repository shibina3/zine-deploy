import type { Bill, BillItem, DateString, Epoch, Expense, Paise, Payment, StockMovement } from '@/types';
import {
  addDaysISO,
  currentMonth,
  dateFromEpoch,
  dayRange,
  daysBetweenInclusive,
  formatDate,
  monthRange,
  shiftMonth,
  todayISO,
  toISODate,
} from '@/utils/date';
import { percentChange, sumPaise } from '@/utils/money';
import {
  buildDailySeries,
  cogsFromMovements,
  collectionsByMethod,
  estimateProfit,
  isBillActive,
  salesByEmployee,
  salesByItem,
  summarisePeriod,
  type DailyPoint,
  type PeriodSummary,
} from '@/modules/reports/logic';

export type DashboardPreset = 'TODAY' | 'MONTH' | 'CUSTOM';

export interface DashboardPeriod {
  preset: DashboardPreset;
  /** Selected day for TODAY, `YYYY-MM-DD`. */
  date: DateString;
  /** Selected month for MONTH, `YYYY-MM`. */
  month: string;
  /** Custom range dates for CUSTOM. */
  from: DateString;
  to: DateString;
}

export function defaultDashboardPeriod(): DashboardPeriod {
  return {
    preset: 'MONTH',
    date: todayISO(),
    month: currentMonth(),
    from: addDaysISO(todayISO(), -29),
    to: todayISO(),
  };
}

export interface ResolvedPeriod {
  label: string;
  shortLabel: string;
  from: Epoch;
  to: Epoch;
  fromISO: DateString;
  toISO: DateString;
  previousLabel: string;
  previousFrom: Epoch;
  previousTo: Epoch;
  previousFromISO: DateString;
  previousToISO: DateString;
  singleDay: boolean;
  days: number;
}

function rangeLabel(fromISO: DateString, toISO: DateString): string {
  if (fromISO === toISO) return formatDate(fromISO, 'EEE, d MMM yyyy');
  const sameYear = fromISO.slice(0, 4) === toISO.slice(0, 4);
  return sameYear
    ? `${formatDate(fromISO, 'd MMM')} – ${formatDate(toISO, 'd MMM yyyy')}`
    : `${formatDate(fromISO, 'd MMM yyyy')} – ${formatDate(toISO, 'd MMM yyyy')}`;
}

/** Turns the UI selection into inclusive current + previous comparison windows. */
export function resolvePeriod(period: DashboardPeriod): ResolvedPeriod {
  if (period.preset === 'TODAY') {
    const date = period.date || todayISO();
    const current = dayRange(date);
    const previousDate = addDaysISO(date, -1);
    const previous = dayRange(previousDate);
    return {
      label: rangeLabel(date, date),
      shortLabel: formatDate(date, 'd MMM yyyy'),
      from: current.from,
      to: current.to,
      fromISO: date,
      toISO: date,
      previousLabel: rangeLabel(previousDate, previousDate),
      previousFrom: previous.from,
      previousTo: previous.to,
      previousFromISO: previousDate,
      previousToISO: previousDate,
      singleDay: true,
      days: 1,
    };
  }

  if (period.preset === 'MONTH') {
    const month = period.month || currentMonth();
    const current = monthRange(month);
    const previousMonth = shiftMonth(month, -1);
    const previous = monthRange(previousMonth);
    return {
      label: current.label,
      shortLabel: current.label,
      from: current.from,
      to: current.to,
      fromISO: toISODate(new Date(current.from)),
      toISO: toISODate(new Date(current.to)),
      previousLabel: previous.label,
      previousFrom: previous.from,
      previousTo: previous.to,
      previousFromISO: toISODate(new Date(previous.from)),
      previousToISO: toISODate(new Date(previous.to)),
      singleDay: false,
      days: daysBetweenInclusive(
        toISODate(new Date(current.from)),
        toISODate(new Date(current.to)),
      ),
    };
  }

  const fromISO = period.from <= period.to ? period.from : period.to;
  const toISO = period.to >= period.from ? period.to : period.from;
  const current = { from: dayRange(fromISO).from, to: dayRange(toISO).to };
  const days = daysBetweenInclusive(fromISO, toISO);
  const previousToISO = addDaysISO(fromISO, -1);
  const previousFromISO = addDaysISO(previousToISO, -(days - 1));
  const previous = { from: dayRange(previousFromISO).from, to: dayRange(previousToISO).to };

  return {
    label: rangeLabel(fromISO, toISO),
    shortLabel: rangeLabel(fromISO, toISO),
    from: current.from,
    to: current.to,
    fromISO,
    toISO,
    previousLabel: rangeLabel(previousFromISO, previousToISO),
    previousFrom: previous.from,
    previousTo: previous.to,
    previousFromISO,
    previousToISO,
    singleDay: days === 1,
    days,
  };
}

export interface HourlyPoint {
  label: string;
  sales: Paise;
  collections: Paise;
  expenses: Paise;
}

const DAY_START_HOUR = 7;
const DAY_END_HOUR = 22;

/** Hourly sales/collections for a single business day. */
export function buildHourlySeries(
  fromISO: DateString,
  bills: Bill[],
  payments: Payment[],
): HourlyPoint[] {
  const base = dayRange(fromISO).from;
  const points: HourlyPoint[] = [];
  for (let hour = DAY_START_HOUR; hour <= DAY_END_HOUR; hour += 1) {
    const hourStart = base + hour * 3_600_000;
    const hourEnd = hourStart + 3_599_999;
    points.push({
      label: formatDate(hourStart, 'ha'),
      sales: sumPaise(
        bills
          .filter((bill) => isBillActive(bill) && bill.billDate >= hourStart && bill.billDate <= hourEnd)
          .map((bill) => bill.total),
      ),
      collections: sumPaise(
        payments
          .filter((payment) => payment.paidAt >= hourStart && payment.paidAt <= hourEnd)
          .map((payment) => payment.amount),
      ),
      expenses: 0,
    });
  }
  return points;
}

export interface ComparisonPoint {
  label: string;
  currentSales: Paise;
  previousSales: Paise;
  currentCollections: Paise;
}

function previousDateFor(resolved: ResolvedPeriod, currentDate: DateString): DateString {
  const offset = daysBetweenInclusive(resolved.fromISO, currentDate) - 1;
  return addDaysISO(resolved.previousFromISO, offset);
}

/** Aligns the current period against the previous one for a grouped chart. */
export function buildComparisonSeries(
  resolved: ResolvedPeriod,
  bills: Bill[],
  payments: Payment[],
): ComparisonPoint[] {
  if (resolved.singleDay) {
    const currentHourly = buildHourlySeries(resolved.fromISO, bills, payments);
    const previousHourly = buildHourlySeries(resolved.previousFromISO, bills, payments);
    return currentHourly.map((point, index) => ({
      label: point.label,
      currentSales: point.sales,
      currentCollections: point.collections,
      previousSales: previousHourly[index]?.sales ?? 0,
    }));
  }

  const points: ComparisonPoint[] = [];
  for (let index = 0; index < resolved.days; index += 1) {
    const currentDate = addDaysISO(resolved.fromISO, index);
    const previousDate = previousDateFor(resolved, currentDate);
    const current = dayRange(currentDate);
    const previous = dayRange(previousDate);
    points.push({
      label: formatDate(currentDate, 'd MMM'),
      currentSales: sumPaise(
        bills
          .filter(
            (bill) =>
              isBillActive(bill) && bill.billDate >= current.from && bill.billDate <= current.to,
          )
          .map((bill) => bill.total),
      ),
      currentCollections: sumPaise(
        payments
          .filter((payment) => payment.paidAt >= current.from && payment.paidAt <= current.to)
          .map((payment) => payment.amount),
      ),
      previousSales: sumPaise(
        bills
          .filter(
            (bill) =>
              isBillActive(bill) && bill.billDate >= previous.from && bill.billDate <= previous.to,
          )
          .map((bill) => bill.total),
      ),
    });
  }
  return points;
}

export interface ServiceInsight {
  name: string;
  revenue: Paise;
  quantity: number;
  previousRevenue: Paise;
  previousQuantity: number;
  change: number | null;
}

export interface EmployeeInsight {
  employeeId: string;
  employeeName: string;
  revenue: Paise;
  bills: number;
  averageBill: Paise;
  previousRevenue: Paise;
  previousBills: number;
  share: number;
  change: number | null;
}

export interface DashboardAnalytics {
  current: PeriodSummary;
  previous: PeriodSummary;
  profit: { netSales: Paise; operatingExpenses: Paise; cogs: Paise; profit: Paise };
  previousProfit: Paise;
  changes: {
    sales: number | null;
    collections: number | null;
    refunds: number | null;
    bills: number | null;
    averageBill: number | null;
    profit: number | null;
  };
  series: DailyPoint[] | HourlyPoint[];
  comparison: ComparisonPoint[];
  topServices: ServiceInsight[];
  employees: EmployeeInsight[];
  methods: Array<{ method: string; amount: Paise }>;
  netCollections: Paise;
}

export function buildDashboardAnalytics(input: {
  resolved: ResolvedPeriod;
  bills: Bill[];
  payments: Payment[];
  refunds: Parameters<typeof summarisePeriod>[0]['refunds'];
  expenses: Expense[];
  movements: StockMovement[];
  items: BillItem[];
}): DashboardAnalytics {
  const { resolved, bills, payments, refunds, expenses, movements, items } = input;

  const current = summarisePeriod({
    bills,
    payments,
    refunds,
    expenses,
    from: resolved.from,
    to: resolved.to,
  });
  const previous = summarisePeriod({
    bills,
    payments,
    refunds,
    expenses,
    from: resolved.previousFrom,
    to: resolved.previousTo,
  });

  const operatingExpenses = sumPaise(
    expenses
      .filter(
        (expense) =>
          expense.category !== 'Product purchases' &&
          expense.date >= resolved.fromISO &&
          expense.date <= resolved.toISO,
      )
      .map((expense) => expense.amount),
  );
  const previousOperatingExpenses = sumPaise(
    expenses
      .filter(
        (expense) =>
          expense.category !== 'Product purchases' &&
          expense.date >= resolved.previousFromISO &&
          expense.date <= resolved.previousToISO,
      )
      .map((expense) => expense.amount),
  );
  const cogs = cogsFromMovements(movements, resolved.from, resolved.to);
  const previousCogs = cogsFromMovements(movements, resolved.previousFrom, resolved.previousTo);
  const netSales = Math.max(0, current.sales - current.refunds);
  const previousNetSales = Math.max(0, previous.sales - previous.refunds);
  const profit = estimateProfit({ netSales, operatingExpenses, cogs });
  const previousProfit = estimateProfit({
    netSales: previousNetSales,
    operatingExpenses: previousOperatingExpenses,
    cogs: previousCogs,
  });

  const currentBills = bills.filter(
    (bill) => isBillActive(bill) && bill.billDate >= resolved.from && bill.billDate <= resolved.to,
  );
  const previousBills = bills.filter(
    (bill) =>
      isBillActive(bill) && bill.billDate >= resolved.previousFrom && bill.billDate <= resolved.previousTo,
  );

  const currentBillIds = new Set(currentBills.map((bill) => bill.id));
  const previousBillIds = new Set(previousBills.map((bill) => bill.id));

  const currentServices = salesByItem(items.filter((item) => currentBillIds.has(item.billId)));
  const previousServices = salesByItem(items.filter((item) => previousBillIds.has(item.billId)));
  const previousServiceMap = new Map(previousServices.map((row) => [row.name, row]));

  const topServices: ServiceInsight[] = currentServices
    .map((row) => {
      const previousRow = previousServiceMap.get(row.name);
      return {
        name: row.name,
        revenue: row.revenue,
        quantity: row.quantity,
        previousRevenue: previousRow?.revenue ?? 0,
        previousQuantity: previousRow?.quantity ?? 0,
        change: percentChange(row.revenue, previousRow?.revenue ?? 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const currentEmployees = salesByEmployee(currentBills);
  const previousEmployees = salesByEmployee(previousBills);
  const previousEmployeeMap = new Map(previousEmployees.map((row) => [row.employeeId, row]));
  const totalRevenue = sumPaise(currentEmployees.map((row) => row.revenue));

  const employees: EmployeeInsight[] = currentEmployees
    .map((row) => {
      const previousRow = previousEmployeeMap.get(row.employeeId);
      return {
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        revenue: row.revenue,
        bills: row.bills,
        averageBill: row.bills ? Math.round(row.revenue / row.bills) : 0,
        previousRevenue: previousRow?.revenue ?? 0,
        previousBills: previousRow?.bills ?? 0,
        share: totalRevenue ? Math.round((row.revenue / totalRevenue) * 1000) / 10 : 0,
        change: percentChange(row.revenue, previousRow?.revenue ?? 0),
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

  const series = resolved.singleDay
    ? buildHourlySeries(resolved.fromISO, bills, payments)
    : buildDailySeries(
        Array.from({ length: resolved.days }, (_, index) =>
          addDaysISO(resolved.fromISO, index),
        ),
        bills,
        payments,
        expenses,
      );

  return {
    current,
    previous,
    profit: { netSales, operatingExpenses, cogs, profit },
    previousProfit,
    changes: {
      sales: percentChange(current.sales, previous.sales),
      collections: percentChange(current.collections, previous.collections),
      refunds: percentChange(current.refunds, previous.refunds),
      bills: percentChange(current.billCount, previous.billCount),
      averageBill: percentChange(current.averageBill, previous.averageBill),
      profit: percentChange(profit, previousProfit),
    },
    series,
    comparison: buildComparisonSeries(resolved, bills, payments),
    topServices,
    employees,
    methods: collectionsByMethod(
      payments.filter(
        (payment) => payment.paidAt >= resolved.from && payment.paidAt <= resolved.to,
      ),
    ),
    netCollections: current.collections - current.refunds,
  };
}

/** Used by the hero subtitle without re-scanning the whole database. */
export function periodDateLabel(epoch: Epoch): DateString {
  return dateFromEpoch(epoch);
}
