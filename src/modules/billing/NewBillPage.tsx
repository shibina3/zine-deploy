import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Receipt, Search, SplitSquareHorizontal, Trash2, UserPlus } from 'lucide-react';
import type { Offer, Paise, PaymentMethod, Product, Service } from '@/types';
import type { DraftItem, PaymentDraft } from '@/db/repositories/billingRepo';
import { createBill, previewBillNumber, type BillWithItems } from '@/db/repositories/billingRepo';
import {
  useAppointments,
  useCustomers,
  useEmployees,
  useOffers,
  useProducts,
  useServices,
  useSettings,
} from '@/hooks/useDb';
import { useCurrentUser } from '@/stores/authStore';
import { computeTotals, sanitiseLineDiscount } from '@/modules/billing/logic';
import { effectiveOfferPrice, menuPriceFor } from '@/modules/offers/logic';
import { formatINR, nonNegative, sumPaise } from '@/utils/money';
import { cn } from '@/utils/cn';
import { notifyError, notifySuccess } from '@/components/common/toastStore';
import { Avatar } from '@/components/common/Badge';
import { Button, IconButton } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { Field, Input, MoneyInput, Select, Textarea } from '@/components/common/Field';
import { PageHeader } from '@/components/common/PageHeader';
import { CustomerDialog } from '@/modules/customers/CustomerDialog';
import { ItemPicker } from './ItemPicker';
import { BillLineRow } from './BillLineRow';
import { BillSuccessDialog } from './BillSuccessDialog';

const METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: 'CASH', label: 'Cash' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CARD', label: 'Card' },
  { value: 'OTHER', label: 'Other' },
];

export function NewBillPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const user = useCurrentUser();
  const settings = useSettings();
  const customers = useCustomers();
  const services = useServices();
  const products = useProducts();
  const offers = useOffers();
  const employees = useEmployees();
  const appointments = useAppointments();

  const appointmentId = params.get('appointment') ?? undefined;
  const appointment = appointmentId ? appointments.find((row) => row.id === appointmentId) : undefined;

  const [customerId, setCustomerId] = useState(params.get('customer') ?? '');
  const [employeeId, setEmployeeId] = useState('');
  const [lines, setLines] = useState<DraftItem[]>([]);
  const [billDiscount, setBillDiscount] = useState<Paise>(0);
  const [offerId, setOfferId] = useState<string | undefined>();
  const [offerName, setOfferName] = useState<string | undefined>();
  const [offerDiscount, setOfferDiscount] = useState<Paise>(0);
  const [taxPercent, setTaxPercent] = useState(0);
  const [notes, setNotes] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [payNow, setPayNow] = useState<Paise | null>(null);
  const [splitRows, setSplitRows] = useState<PaymentDraft[]>([]);
  const [splitMode, setSplitMode] = useState(false);
  const [advanceApplied, setAdvanceApplied] = useState<Paise>(0);
  const [billNumber, setBillNumber] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<BillWithItems | null>(null);
  const [customerDialog, setCustomerDialog] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOpen, setCustomerOpen] = useState(false);
  const prefilled = useRef(false);

  const customer = customers.find((row) => row.id === customerId);

  useEffect(() => {
    if (settings) setTaxPercent(settings.taxPercent);
  }, [settings]);

  useEffect(() => {
    if (!employeeId && employees.length) {
      const linked = user?.employeeId ? employees.find((row) => row.id === user.employeeId) : undefined;
      setEmployeeId(linked?.id ?? employees[0].id);
    }
  }, [employees, employeeId, user?.employeeId]);

  useEffect(() => {
    void previewBillNumber().then(setBillNumber).catch(() => setBillNumber(''));
  }, []);

  useEffect(() => {
    if (prefilled.current || !appointment || !services.length) return;
    prefilled.current = true;
    setCustomerId(appointment.customerId);
    setEmployeeId(appointment.employeeId);
    setLines(
      appointment.serviceIds
        .map((id) => services.find((service) => service.id === id))
        .filter((service): service is Service => Boolean(service))
        .map((service) => ({
          itemType: 'SERVICE' as const,
          refId: service.id,
          name: service.name,
          category: service.category,
          quantity: 1,
          unitPrice: service.price,
          discount: 0,
        })),
    );
    if (appointment.advance > 0) {
      setAdvanceApplied(appointment.advance);
      notifySuccess('Advance applied', `${formatINR(appointment.advance)} already collected will be adjusted.`);
    }
  }, [appointment, services]);

  const totals = useMemo(
    () => computeTotals(lines, { billDiscount, offerDiscount, taxPercent }),
    [lines, billDiscount, offerDiscount, taxPercent],
  );

  const autoAmount = nonNegative(totals.total - advanceApplied);
  const singleAmount = payNow ?? autoAmount;

  const effectivePayments: PaymentDraft[] = useMemo(() => {
    const rows: PaymentDraft[] = [];
    if (advanceApplied > 0) {
      rows.push({
        amount: advanceApplied,
        method: 'CASH',
        kind: 'ADVANCE',
        note: appointment ? 'Advance collected with the appointment' : 'Advance applied',
      });
    }
    if (splitMode) rows.push(...splitRows.filter((row) => row.amount > 0));
    else if (singleAmount > 0) rows.push({ amount: singleAmount, method });
    return rows;
  }, [advanceApplied, appointment, method, singleAmount, splitMode, splitRows]);

  const paid = sumPaise(effectivePayments.map((row) => row.amount));
  const balance = nonNegative(totals.total - paid);

  const customerMatches = useMemo(() => {
    const term = customerQuery.trim().toLowerCase();
    if (!term) return customers.slice(0, 6);
    const digits = term.replace(/\D/g, '');
    return customers
      .filter(
        (row) =>
          row.name.toLowerCase().includes(term) ||
          (digits.length > 0 && row.phone.replace(/\D/g, '').includes(digits)),
      )
      .slice(0, 6);
  }, [customers, customerQuery]);

  const addItem = (item: DraftItem) => {
    setLines((previous) => {
      const existing = previous.find(
        (line) =>
          line.itemType === item.itemType && line.refId === item.refId && line.unitPrice === item.unitPrice,
      );
      if (existing) {
        return previous.map((line) =>
          line === existing ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...previous, item];
    });
  };

  const addService = (service: Service) =>
    addItem({
      itemType: 'SERVICE',
      refId: service.id,
      name: service.name,
      category: service.category,
      quantity: 1,
      unitPrice: service.price,
      discount: 0,
    });

  const addProduct = (product: Product) =>
    addItem({
      itemType: 'PRODUCT',
      refId: product.id,
      name: product.name,
      category: product.category,
      quantity: 1,
      unitPrice: product.sellingPrice,
      discount: 0,
    });

  const addOffer = (offer: Offer) => {
    const price = effectiveOfferPrice(offer, services);
    const menu = menuPriceFor(offer, services);
    setLines((previous) => [
      ...previous.filter((line) => line.itemType !== 'COMBO'),
      {
        itemType: 'COMBO',
        refId: offer.id,
        name: `${offer.name} (combo)`,
        category: 'Offer',
        quantity: 1,
        unitPrice: price,
        discount: 0,
      },
    ]);
    setOfferId(offer.id);
    setOfferName(offer.name);
    setOfferDiscount(Math.max(0, menu - price));
    notifySuccess('Offer applied', `${offer.name} · ${formatINR(price)}`);
  };

  const submit = async () => {
    setError('');
    if (!customerId) return setError('Select a customer before generating the bill.');
    if (!employeeId) return setError('Select the employee who handled the service.');
    if (!lines.length) return setError('Add at least one service or product.');
    if (totals.total <= 0) return setError('The bill total must be greater than zero.');
    if (paid > totals.total) return setError('Payments cannot be more than the bill total.');

    setBusy(true);
    try {
      const created = await createBill({
        customerId,
        employeeId,
        lines: lines.map((line) => ({ ...line, discount: sanitiseLineDiscount(line) })),
        billDiscount,
        offerDiscount,
        offerId,
        offerName,
        taxPercent,
        notes,
        appointmentId,
        payments: effectivePayments,
      });
      setResult(created);
      notifySuccess('Bill generated', `${created.bill.billNumber} · ${formatINR(created.bill.total)}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Could not create the bill.';
      setError(message);
      notifyError('Bill not created', message);
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setResult(null);
    setLines([]);
    setBillDiscount(0);
    setOfferId(undefined);
    setOfferName(undefined);
    setOfferDiscount(0);
    setNotes('');
    setPayNow(null);
    setSplitRows([]);
    setSplitMode(false);
    setAdvanceApplied(0);
    setError('');
    void previewBillNumber().then(setBillNumber).catch(() => undefined);
  };

  return (
    <div>
      <PageHeader
        eyebrow="Counter"
        title="New bill"
        description="Select the customer, add services and record the payment. Bill numbers are generated automatically."
        actions={
          <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 shadow-sm">
            <Receipt className="h-4 w-4 text-gold-600" />
            <div>
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-400">Next bill no.</p>
              <p className="text-[12.5px] font-semibold tabular-nums text-ink-900">{billNumber || '—'}</p>
            </div>
          </div>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <Card className="p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <label className="label mb-1.5 block">Customer</label>
                {customer ? (
                  <div className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-2.5 py-1.5">
                    <Avatar name={customer.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-ink-900">{customer.name}</p>
                      <p className="text-[11px] text-ink-500">{customer.phone}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setCustomerId('');
                        setCustomerQuery('');
                      }}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={customerQuery}
                      onFocus={() => setCustomerOpen(true)}
                      onChange={(event) => {
                        setCustomerQuery(event.target.value);
                        setCustomerOpen(true);
                      }}
                      placeholder="Search name or phone…"
                      leading={<Search className="h-4 w-4" />}
                    />
                    {customerOpen && (
                      <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-ink-200 bg-white shadow-lift">
                        <ul className="max-h-56 overflow-y-auto">
                          {customerMatches.map((row) => (
                            <li key={row.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setCustomerId(row.id);
                                  setCustomerOpen(false);
                                  setCustomerQuery('');
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-gold-50/60"
                              >
                                <Avatar name={row.name} size="xs" />
                                <span className="min-w-0 flex-1">
                                  <span className="block truncate text-[12.5px] font-medium text-ink-800">
                                    {row.name}
                                  </span>
                                  <span className="block text-[10.5px] text-ink-500">{row.phone}</span>
                                </span>
                              </button>
                            </li>
                          ))}
                          {customerMatches.length === 0 && (
                            <li className="px-3 py-3 text-center text-[12px] text-ink-400">
                              No customer found.
                            </li>
                          )}
                        </ul>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomerDialog(true);
                            setCustomerOpen(false);
                          }}
                          className="flex w-full items-center gap-2 border-t border-ink-100 px-3 py-2.5 text-left text-[12.5px] font-medium text-wine-700 hover:bg-wine-50"
                        >
                          <UserPlus className="h-3.5 w-3.5" /> Add new customer
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <Field label="Handled by" required>
                <Select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                  <option value="">Select employee…</option>
                  {employees.map((employee) => (
                    <option key={employee.id} value={employee.id}>
                      {employee.name} · {employee.designation}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Card>

          <ItemPicker
            services={services}
            products={products}
            offers={offers}
            onAddService={addService}
            onAddProduct={addProduct}
            onAddOffer={addOffer}
            disabled={busy}
          />

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-ink-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gold-100 text-gold-700">
                  <Receipt className="h-3.5 w-3.5" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-ink-900">Selected items</p>
                  <p className="text-[11px] text-ink-500">
                    {lines.length} item{lines.length === 1 ? '' : 's'}
                  </p>
                </div>
              </div>
              {lines.length > 0 && (
                <Button
                  size="sm"
                  variant="dangerGhost"
                  leadingIcon={<Trash2 className="h-3.5 w-3.5" />}
                  onClick={() => {
                    setLines([]);
                    setOfferId(undefined);
                    setOfferName(undefined);
                    setOfferDiscount(0);
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
            {lines.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <p className="text-[13px] font-medium text-ink-700">No items yet</p>
                <p className="mt-1 text-[12px] text-ink-400">
                  Pick a service, product or combo offer from above.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-ink-100">
                {lines.map((line, index) => (
                  <BillLineRow
                    key={`${line.itemType}-${line.refId ?? line.name}-${index}`}
                    line={line}
                    onChange={(next) =>
                      setLines((previous) => previous.map((row, i) => (i === index ? next : row)))
                    }
                    onRemove={() => setLines((previous) => previous.filter((_, i) => i !== index))}
                  />
                ))}
              </ul>
            )}
          </Card>

          <Field label="Notes (optional)" hint="Visible on the bill and receipt.">
            <Textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Allergy notes, next visit suggestion…"
            />
          </Field>
        </div>

        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <Card className="overflow-hidden">
            <div className="border-b border-white/5 bg-ink-950 px-5 py-4 text-cream">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.16em] text-ink-400">Bill summary</p>
              <p className="mt-1 font-display text-[30px] font-light leading-none tabular-nums">
                {formatINR(totals.total)}
              </p>
              <p className="mt-1 text-[11.5px] text-ink-400">
                {billNumber || 'Draft'} · {lines.length} item{lines.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="space-y-1.5 px-5 py-4">
              <SummaryRow label="Subtotal" value={formatINR(totals.subtotal)} />
              {totals.itemDiscount > 0 && (
                <SummaryRow label="Item discounts" value={`− ${formatINR(totals.itemDiscount)}`} tone="sage" />
              )}
              {offerDiscount > 0 && (
                <SummaryRow
                  label={offerName ? `Offer · ${offerName}` : 'Offer'}
                  value={`− ${formatINR(offerDiscount)}`}
                  tone="sage"
                />
              )}

              <div className="flex items-center justify-between gap-3 pt-1.5">
                <span className="text-[12.5px] text-ink-500">Additional discount</span>
                <MoneyInput value={billDiscount} onChange={setBillDiscount} className="w-[104px]" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12.5px] text-ink-500">Tax %</span>
                <Input
                  type="number"
                  min={0}
                  max={28}
                  value={taxPercent}
                  onChange={(event) => setTaxPercent(Math.max(0, Number(event.target.value) || 0))}
                  className="h-9 w-[104px] text-right"
                />
              </div>
              {totals.taxAmount > 0 && (
                <SummaryRow label={`Tax (${taxPercent}%)`} value={formatINR(totals.taxAmount)} />
              )}
              <div className="mt-2 flex items-end justify-between gap-3 border-t border-ink-200 pt-2.5">
                <span className="text-[13px] font-semibold text-ink-900">Total payable</span>
                <span className="font-display text-[22px] font-medium leading-none tabular-nums text-ink-900">
                  {formatINR(totals.total)}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13px] font-semibold text-ink-900">Payment</p>
              <button
                type="button"
                onClick={() => {
                  if (!splitMode && splitRows.length === 0) {
                    setSplitRows([{ amount: singleAmount, method }]);
                  }
                  setSplitMode((value) => !value);
                }}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11.5px] font-medium text-wine-700 hover:bg-wine-50"
              >
                <SplitSquareHorizontal className="h-3.5 w-3.5" />
                {splitMode ? 'Single payment' : 'Split payment'}
              </button>
            </div>

            {advanceApplied > 0 && (
              <div className="mt-3 rounded-xl border border-sage-200 bg-sage-50 px-3 py-2 text-[11.5px] leading-relaxed text-sage-700">
                Advance of {formatINR(advanceApplied)} already collected will be applied to this bill.
              </div>
            )}

            {!splitMode ? (
              <>
                <div className="mt-3 grid grid-cols-4 gap-1.5">
                  {METHODS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMethod(option.value)}
                      className={cn(
                        'rounded-lg border px-2 py-1.5 text-[11.5px] font-medium transition-colors',
                        method === option.value
                          ? 'border-ink-900 bg-ink-900 text-cream'
                          : 'border-ink-200 bg-white text-ink-600 hover:border-ink-300',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="label">Amount received</span>
                    <button
                      type="button"
                      onClick={() => setPayNow(null)}
                      className="text-[11px] font-medium text-wine-700 hover:text-wine-600"
                    >
                      Pay full
                    </button>
                  </div>
                  <MoneyInput value={singleAmount} onChange={setPayNow} />
                </div>
              </>
            ) : (
              <div className="mt-3 space-y-2">
                {splitRows.map((row, index) => (
                  <div key={`split-${index}`} className="flex items-center gap-2">
                    <Select
                      value={row.method}
                      onChange={(event) =>
                        setSplitRows((rows) =>
                          rows.map((item, i) =>
                            i === index ? { ...item, method: event.target.value as PaymentMethod } : item,
                          ),
                        )
                      }
                      className="w-[92px]"
                    >
                      {METHODS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                    <MoneyInput
                      value={row.amount}
                      onChange={(amount) =>
                        setSplitRows((rows) => rows.map((item, i) => (i === index ? { ...item, amount } : item)))
                      }
                      className="flex-1"
                    />
                    <IconButton
                      label="Remove payment"
                      variant="dangerGhost"
                      onClick={() => setSplitRows((rows) => rows.filter((_, i) => i !== index))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </IconButton>
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  block
                  leadingIcon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() => setSplitRows((rows) => [...rows, { amount: 0, method: 'UPI' }])}
                >
                  Add payment method
                </Button>
              </div>
            )}

            <div className="mt-4 space-y-1.5 border-t border-ink-100 pt-3">
              <SummaryRow label="Paid" value={formatINR(paid)} />
              <SummaryRow label="Balance" value={formatINR(balance)} tone={balance > 0 ? 'danger' : 'sage'} strong />
            </div>

            {error && (
              <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] font-medium text-rose-700">
                {error}
              </p>
            )}

            <Button
              block
              size="lg"
              className="mt-4"
              loading={busy}
              onClick={() => void submit()}
              leadingIcon={<Receipt className="h-4 w-4" />}
            >
              Generate bill
            </Button>
            <p className="mt-2 text-center text-[10.5px] text-ink-400">
              Saved on this device · receipt can be printed or shared
            </p>
          </Card>
        </div>
      </div>


      <CustomerDialog
        open={customerDialog}
        customer={null}
        onClose={() => setCustomerDialog(false)}
        onSaved={(created) => {
          setCustomerId(created.id);
          setCustomerDialog(false);
          setCustomerQuery('');
        }}
      />

      {settings && (
        <BillSuccessDialog
          open={Boolean(result)}
          result={result}
          customer={customer}
          settings={settings}
          onClose={() => navigate('/billing')}
          onNew={reset}
        />
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  tone = 'default',
  strong,
}: {
  label: string;
  value: string;
  tone?: 'default' | 'sage' | 'danger';
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12.5px]">
      <span className="text-ink-500">{label}</span>
      <span
        className={cn(
          'tabular-nums',
          strong ? 'font-semibold' : 'font-medium',
          tone === 'sage' ? 'text-sage-600' : tone === 'danger' ? 'text-rose-600' : 'text-ink-800',
        )}
      >
        {value}
      </span>
    </div>
  );
}

