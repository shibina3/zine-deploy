import { useMemo } from 'react';
import {
  useAppointments,
  useBills,
  useBillItemsAll,
  useBridalBookings,
  useEmployees,
  useExpenses,
  useLeaves,
  usePayments,
  useProducts,
  useRefunds,
  useSalaryRecords,
  useStockMovements,
} from '@/hooks/useDb';
import { dayRange, todayISO } from '@/utils/date';
import { sumPaise } from '@/utils/money';
import { lowStockProducts } from '@/modules/inventory/logic';
import { upcomingBridal } from '@/modules/calendar/logic';
import {
  buildDashboardAnalytics,
  resolvePeriod,
  type DashboardPeriod,
} from './analytics';

/** Everything the owner dashboard renders, recalculated when the period changes. */
export function useDashboardData(period: DashboardPeriod) {
  const bills = useBills();
  const items = useBillItemsAll();
  const payments = usePayments();
  const refunds = useRefunds();
  const expenses = useExpenses();
  const appointments = useAppointments();
  const bridal = useBridalBookings();
  const products = useProducts();
  const movements = useStockMovements(2000);
  const leaves = useLeaves();
  const employees = useEmployees();
  const salaryRecords = useSalaryRecords();

  const today = todayISO();

  return useMemo(() => {
    const resolved = resolvePeriod(period);
    const analytics = buildDashboardAnalytics({
      resolved,
      bills,
      payments,
      refunds,
      expenses,
      movements,
      items,
    });

    const todayRange = dayRange(today);
    const todaysAppointments = appointments
      .filter(
        (appointment) =>
          appointment.startAt >= todayRange.from &&
          appointment.startAt <= todayRange.to &&
          appointment.status !== 'CANCELLED',
      )
      .sort((a, b) => a.startAt - b.startAt);

    const lowStock = lowStockProducts(products, movements).slice(0, 5);
    const onLeaveToday = leaves.filter(
      (leave) => leave.status === 'APPROVED' && leave.startDate <= today && today <= leave.endDate,
    );
    const bridalUpcoming = upcomingBridal(bridal, today).slice(0, 2);

    const salaryPending = sumPaise(
      salaryRecords.filter((record) => record.balance > 0).map((record) => record.balance),
    );

    return {
      today,
      resolved,
      analytics,
      todaysAppointments,
      lowStock,
      onLeaveToday,
      bridalUpcoming,
      salaryPending,
      employees,
      completedToday: todaysAppointments.filter((appointment) => appointment.status === 'COMPLETED').length,
      recentBills: bills.slice(0, 6),
    };
  }, [
    period,
    appointments,
    bills,
    bridal,
    employees,
    expenses,
    items,
    leaves,
    movements,
    payments,
    products,
    refunds,
    salaryRecords,
    today,
  ]);
}
