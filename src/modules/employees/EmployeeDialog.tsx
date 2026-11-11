import { useEffect, useState } from 'react';
import type { Employee, Paise, SalaryType } from '@/types';
import { saveEmployee, setEmployeeActive } from '@/db/repositories/employeeRepo';
import { createUser } from '@/services/auth/authService';
import { DESIGNATIONS, SALARY_TYPE_LABEL } from '@/utils/constants';
import { todayISO } from '@/utils/date';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Button } from '@/components/common/Button';
import { Field, Input, MoneyInput, Select, Switch, Textarea } from '@/components/common/Field';
import { Modal } from '@/components/common/Modal';

export function EmployeeDialog({
  open,
  employee,
  onClose,
}: {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [designation, setDesignation] = useState('Stylist');
  const [joinedAt, setJoinedAt] = useState(todayISO());
  const [salaryType, setSalaryType] = useState<SalaryType>('FIXED');
  const [fixedSalary, setFixedSalary] = useState<Paise>(0);
  const [commission, setCommission] = useState(0);
  const [workingDays, setWorkingDays] = useState(26);
  const [notes, setNotes] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [createLogin, setCreateLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(employee?.name ?? '');
    setPhone(employee?.phone ?? '');
    setEmail(employee?.email ?? '');
    setDesignation(employee?.designation ?? 'Stylist');
    setJoinedAt(employee?.joinedAt ?? todayISO());
    setSalaryType(employee?.salaryType ?? 'FIXED');
    setFixedSalary(employee?.fixedSalary ?? 0);
    setCommission((employee?.commissionRateBps ?? 0) / 100);
    setWorkingDays(employee?.workingDaysPerMonth ?? 26);
    setNotes(employee?.notes ?? '');
    setIsActive(employee?.isActive ?? true);
    setCreateLogin(false);
    setUsername('');
    setPassword('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, employee?.id]);

  const submit = async () => {
    setError('');
    if (!name.trim()) return setError('Employee name is required.');

    setBusy(true);
    try {
      const saved = await saveEmployee({
        id: employee?.id,
        name,
        phone,
        email,
        designation,
        joinedAt,
        salaryType,
        fixedSalary,
        commissionRateBps: Math.round(commission * 100),
        workingDaysPerMonth: workingDays,
        notes,
      });

      if (!employee && !isActive) {
        await setEmployeeActive(saved.id, false);
      }

      if (createLogin && !employee) {
        if (!username.trim()) throw new Error('Enter a username for the employee login.');
        await createUser({
          username,
          password,
          displayName: saved.name,
          role: 'EMPLOYEE',
          employeeId: saved.id,
        });
      }

      notifySuccess(employee ? 'Employee updated' : 'Employee added', saved.name);
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not save the employee.';
      setError(message);
      notifyError('Could not save employee', message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={employee ? 'Edit employee' : 'New employee'}
      description="Profiles hold salary rules only — Zine does not track attendance or clock-in."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} loading={busy}>
            {employee ? 'Save changes' : 'Add employee'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Full name" required>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Anita Rao"
              autoFocus
            />
          </Field>
          <Field label="Designation">
            <Select value={designation} onChange={(event) => setDesignation(event.target.value)}>
              {DESIGNATIONS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Phone">
            <Input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="98450 12301" />
          </Field>
          <Field label="Email">
            <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
          </Field>
          <Field label="Joining date">
            <Input type="date" value={joinedAt} onChange={(event) => setJoinedAt(event.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Salary structure">
            <Select value={salaryType} onChange={(event) => setSalaryType(event.target.value as SalaryType)}>
              {(Object.keys(SALARY_TYPE_LABEL) as SalaryType[]).map((value) => (
                <option key={value} value={value}>
                  {SALARY_TYPE_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fixed monthly salary" hint="Set 0 for commission-only.">
            <MoneyInput value={fixedSalary} onChange={setFixedSalary} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Commission %" hint="Applied to service revenue in payroll.">
            <Input
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={commission}
              onChange={(event) => setCommission(Math.min(100, Math.max(0, Number(event.target.value) || 0)))}
            />
          </Field>
          <Field label="Working days / month" hint="Used for unpaid leave deduction.">
            <Input
              type="number"
              min={1}
              max={31}
              value={workingDays}
              onChange={(event) => setWorkingDays(Math.min(31, Math.max(1, Number(event.target.value) || 26)))}
            />
          </Field>
        </div>

        <Field label="Notes">
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} />
        </Field>

        <div className="rounded-xl border border-ink-200/80 bg-ink-50/60 p-3">
          <Switch
            checked={isActive}
            onChange={setIsActive}
            label="Active employee"
            description="Inactive employees cannot be assigned to new appointments."
          />
        </div>

        {!employee && (
          <div className="space-y-3 rounded-2xl border border-gold-200/70 bg-gold-50/40 p-3.5">
            <Switch
              checked={createLogin}
              onChange={setCreateLogin}
              label="Create a login for this employee"
              description="Employees see dashboard, billing, customers and appointments only."
            />
            {createLogin && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Username" required>
                  <Input
                    value={username}
                    onChange={(event) => setUsername(event.target.value.replace(/\s/g, '').toLowerCase())}
                    placeholder="anita"
                    autoComplete="off"
                  />
                </Field>
                <Field label="Password" required hint="8+ characters with a number.">
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[12.5px] font-medium text-rose-700">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}