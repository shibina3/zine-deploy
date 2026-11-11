import { Link, Navigate, Route, Routes } from 'react-router-dom';
import { useIsOwner, usePermissionSet } from '@/stores/authStore';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAuth, RequireOwner, RequirePermission } from './RequireAuth';
import { LoginPage } from '@/modules/auth/LoginPage';
import { SetupPage } from '@/modules/auth/SetupPage';
import { DashboardPage } from '@/modules/dashboard/DashboardPage';
import { CustomersPage } from '@/modules/customers/CustomersPage';
import { ServicesPage } from '@/modules/services/ServicesPage';
import { NewBillPage } from '@/modules/billing/NewBillPage';
import { BillsPage } from '@/modules/billing/BillsPage';
import { PaymentsPage } from '@/modules/billing/PaymentsPage';
import { RefundsPage } from '@/modules/billing/RefundsPage';
import { CalendarPage } from '@/modules/calendar/CalendarPage';
import { BridalPage } from '@/modules/calendar/BridalPage';
import { BlocksPage } from '@/modules/calendar/BlocksPage';
import { OffersPage } from '@/modules/offers/OffersPage';
import { InventoryPage } from '@/modules/inventory/InventoryPage';
import { StockInwardPage } from '@/modules/inventory/StockInwardPage';
import { StockOutwardPage } from '@/modules/inventory/StockOutwardPage';
import { SuppliersPage } from '@/modules/inventory/SuppliersPage';
import { StockAlertsPage } from '@/modules/inventory/StockAlertsPage';
import { EmployeesPage } from '@/modules/employees/EmployeesPage';
import { LeavePage } from '@/modules/employees/LeavePage';
import { PayrollPage } from '@/modules/payroll/PayrollPage';
import { IncomePage } from '@/modules/finance/IncomePage';
import { ExpensesPage } from '@/modules/finance/ExpensesPage';
import { ReportsPage } from '@/modules/finance/ReportsPage';
import { SettingsPage } from '@/modules/settings/SettingsPage';
import { BusinessSettings } from '@/modules/settings/BusinessSettings';
import { ReceiptSettings } from '@/modules/settings/ReceiptSettings';
import { BackupSettings } from '@/modules/settings/BackupSettings';
import { SecuritySettings } from '@/modules/settings/SecuritySettings';

/**
 * Owners land on the business dashboard; employees are sent to the first screen
 * their permissions allow (the dashboard is intentionally owner-only).
 */
function HomeRoute() {
  const owner = useIsOwner();
  const permissions = usePermissionSet();
  if (owner) return <DashboardPage />;
  if (permissions.has('billing.write')) return <Navigate to="/billing/new" replace />;
  if (permissions.has('appointments.write')) return <Navigate to="/calendar" replace />;
  if (permissions.has('customers.write')) return <Navigate to="/customers" replace />;
  return <Navigate to="/services" replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/setup" element={<SetupPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRoute />} />

        <Route
          path="billing"
          element={
            <RequirePermission permission="billing.write">
              <BillsPage />
            </RequirePermission>
          }
        />
        <Route
          path="billing/new"
          element={
            <RequirePermission permission="billing.write">
              <NewBillPage />
            </RequirePermission>
          }
        />
        <Route
          path="payments"
          element={
            <RequirePermission permission="billing.write">
              <PaymentsPage />
            </RequirePermission>
          }
        />
        <Route
          path="refunds"
          element={
            <RequireOwner>
              <RefundsPage />
            </RequireOwner>
          }
        />

        <Route
          path="calendar"
          element={
            <RequirePermission permission="appointments.write">
              <CalendarPage />
            </RequirePermission>
          }
        />
        <Route
          path="calendar/bridal"
          element={
            <RequirePermission permission="appointments.write">
              <BridalPage />
            </RequirePermission>
          }
        />
        <Route
          path="calendar/blocks"
          element={
            <RequirePermission permission="appointments.write">
              <BlocksPage />
            </RequirePermission>
          }
        />

        <Route
          path="customers"
          element={
            <RequirePermission permission="customers.write">
              <CustomersPage />
            </RequirePermission>
          }
        />
        <Route path="services" element={<ServicesPage />} />
        <Route
          path="offers"
          element={
            <RequirePermission permission="offers.write">
              <OffersPage />
            </RequirePermission>
          }
        />

        <Route
          path="inventory"
          element={
            <RequirePermission permission="inventory.write">
              <InventoryPage />
            </RequirePermission>
          }
        />
        <Route
          path="inventory/inward"
          element={
            <RequirePermission permission="inventory.write">
              <StockInwardPage />
            </RequirePermission>
          }
        />
        <Route
          path="inventory/outward"
          element={
            <RequirePermission permission="inventory.write">
              <StockOutwardPage />
            </RequirePermission>
          }
        />
        <Route
          path="inventory/suppliers"
          element={
            <RequirePermission permission="inventory.write">
              <SuppliersPage />
            </RequirePermission>
          }
        />
        <Route
          path="inventory/alerts"
          element={
            <RequirePermission permission="inventory.write">
              <StockAlertsPage />
            </RequirePermission>
          }
        />

        <Route
          path="employees"
          element={
            <RequirePermission permission="employees.view">
              <EmployeesPage />
            </RequirePermission>
          }
        />
        <Route
          path="employees/leave"
          element={
            <RequirePermission permission="employees.view">
              <LeavePage />
            </RequirePermission>
          }
        />
        <Route
          path="employees/payroll"
          element={
            <RequirePermission permission="payroll.manage">
              <PayrollPage />
            </RequirePermission>
          }
        />

        <Route path="finance" element={<Navigate to="/finance/reports" replace />} />
        <Route
          path="finance/income"
          element={
            <RequirePermission permission="finance.view">
              <IncomePage />
            </RequirePermission>
          }
        />
        <Route
          path="finance/expenses"
          element={
            <RequirePermission permission="finance.view">
              <ExpensesPage />
            </RequirePermission>
          }
        />
        <Route
          path="finance/reports"
          element={
            <RequirePermission permission="reports.view">
              <ReportsPage />
            </RequirePermission>
          }
        />

        <Route
          path="settings"
          element={
            <RequirePermission permission="settings.manage">
              <SettingsPage />
            </RequirePermission>
          }
        >
          <Route index element={<BusinessSettings />} />
          <Route path="receipt" element={<ReceiptSettings />} />
          <Route path="backup" element={<BackupSettings />} />
          <Route path="security" element={<SecuritySettings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="font-display text-6xl text-ink-200">404</p>
      <h1 className="mt-2 font-display text-2xl text-ink-900">This page is not part of the salon</h1>
      <p className="mt-1 text-[13px] text-ink-500">Check the address or head back to the dashboard.</p>
      <Link to="/" className="mt-5 text-[13px] font-medium text-wine-700 hover:text-wine-600">
        Back to dashboard
      </Link>
    </div>
  );
}
