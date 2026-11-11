import { useState } from 'react';
import {
  Ban,
  Download,
  MessageCircle,
  ReceiptText,
  RotateCcw,
  Wallet,
} from 'lucide-react';
import { cancelBill } from '@/db/repositories/billingRepo';
import { useBillDetail, useSettings } from '@/hooks/useDb';
import { useIsOwner } from '@/stores/authStore';
import { BILL_STATUS } from '@/utils/constants';
import { formatDateTime } from '@/utils/date';
import { formatINR } from '@/utils/money';
import {
  downloadReceipt,
  openWhatsApp,
  type ReceiptData,
} from '@/services/receipts/receipt';
import { notifyError, notifyInfo, notifySuccess } from '@/components/common/toastStore';
import { StatusPill } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { ConfirmDialog, Drawer } from '@/components/common/Modal';
import { PaymentDialog, RefundDialog } from './BillActions';

export function BillDrawer({ billId, onClose }: { billId: string | null; onClose: () => void }) {
  const detail = useBillDetail(billId);
  const settings = useSettings();
  const owner = useIsOwner();

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const bill = detail?.bill ?? null;
  const items = detail?.items ?? [];
  const payments = detail?.payments ?? [];
  const refunds = detail?.refunds ?? [];

  const receipt: ReceiptData | null =
    bill && settings
      ? {
          bill,
          items,
          payments,
          refunds,
          settings: {
            businessName: settings.businessName,
            tagline: settings.tagline,
            address: settings.address,
            phone: settings.phone,
            gstin: settings.gstin,
            receiptFooter: settings.receiptFooter,
            receiptWidth: settings.receiptWidth,
            showTaxOnReceipt: settings.showTaxOnReceipt,
            taxLabel: settings.taxLabel,
          },
        }
      : null;

  const refundable = bill ? Math.max(0, bill.paid - bill.refunded) : 0;
  const canCancel = Boolean(bill && owner && bill.status !== 'CANCELLED');

  const cancel = async (reason: string) => {
    if (!bill) return;
    setBusy(true);
    try {
      await cancelBill(bill.id, reason);
      notifySuccess('Bill cancelled', 'Stock returned to inventory and payments preserved.');
      setCancelOpen(false);
    } catch (caught) {
      notifyError('Could not cancel bill', caught instanceof Error ? caught.message : undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Drawer
        open={Boolean(bill)}
        onClose={onClose}
        title={bill?.billNumber ?? 'Bill'}
        subtitle={bill ? `${formatDateTime(bill.billDate)} · ${bill.customerName}` : undefined}
        size="lg"
        footer={
          bill && (
            <>
              {canCancel && (
                <Button
                  variant="dangerGhost"
                  leadingIcon={<Ban className="h-4 w-4" />}
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel bill
                </Button>
              )}
              {refundable > 0 && (
                <Button
                  variant="secondary"
                  leadingIcon={<RotateCcw className="h-4 w-4" />}
                  onClick={() => setRefundOpen(true)}
                >
                  Refund
                </Button>
              )}
              {bill.balance > 0 && bill.status !== 'CANCELLED' && (
                <Button
                  variant="secondary"
                  leadingIcon={<Wallet className="h-4 w-4" />}
                  onClick={() => setPaymentOpen(true)}
                >
                  Add payment
                </Button>
              )}
              <Button
                variant="secondary"
                leadingIcon={<MessageCircle className="h-4 w-4" />}
                onClick={() => {
                  if (!receipt) return;
                  const opened = openWhatsApp(receipt);
                  if (!opened) notifyInfo('Pop-up blocked', 'Allow pop-ups to open WhatsApp.');
                }}
              >
                WhatsApp
              </Button>
              <Button
                variant="gold"
                leadingIcon={<Download className="h-4 w-4" />}
                onClick={() => receipt && downloadReceipt(receipt)}
              >
                Receipt PDF
              </Button>
            </>
          )
        }
      >
        {bill && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill meta={BILL_STATUS[bill.status]} />
              <span className="text-[12px] text-ink-500">
                {items.length} item{items.length === 1 ? '' : 's'} · handled by {bill.employeeName}
              </span>
            </div>

            <div className="overflow-hidden rounded-2xl border border-ink-200/70">
              <div className="flex items-center justify-between bg-ink-50/70 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-500">
                <span>Item</span>
                <span>Amount</span>
              </div>
              <ul className="divide-y divide-ink-100">
                {items.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink-900">{item.name}</p>
                      <p className="text-[11px] text-ink-500">
                        {item.quantity} × {formatINR(item.unitPrice)}
                        {item.discount > 0 ? ` · discount −${formatINR(item.discount)}` : ''}
                        {item.category ? ` · ${item.category}` : ''}
                      </p>
                    </div>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-ink-900">
                      {formatINR(item.lineTotal)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="space-y-1.5 border-t border-ink-100 bg-white px-4 py-3">
                <TotalRow label="Subtotal" value={formatINR(bill.subtotal)} />
                {bill.itemDiscount > 0 && (
                  <TotalRow label="Item discounts" value={`− ${formatINR(bill.itemDiscount)}`} muted />
                )}
                {bill.offerDiscount > 0 && (
                  <TotalRow
                    label={bill.offerName ? `Offer · ${bill.offerName}` : 'Offer'}
                    value={`− ${formatINR(bill.offerDiscount)}`}
                    muted
                  />
                )}
                {bill.billDiscount > 0 && (
                  <TotalRow label="Additional discount" value={`− ${formatINR(bill.billDiscount)}`} muted />
                )}
                {bill.taxAmount > 0 && (
                  <TotalRow label={`${settings?.taxLabel || 'Tax'} (${bill.taxPercent}%)`} value={formatINR(bill.taxAmount)} />
                )}
                <div className="flex items-center justify-between border-t border-ink-200 pt-2">
                  <span className="text-[13px] font-semibold text-ink-900">Total</span>
                  <span className="font-display text-[20px] font-medium tabular-nums text-ink-900">
                    {formatINR(bill.total)}
                  </span>
                </div>
                <TotalRow label="Paid" value={formatINR(bill.paid)} />
                {bill.refunded > 0 && <TotalRow label="Refunded" value={`− ${formatINR(bill.refunded)}`} muted />}
                {bill.balance > 0 && (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[12.5px] font-semibold text-rose-600">Balance due</span>
                    <span className="text-[13px] font-semibold tabular-nums text-rose-600">
                      {formatINR(bill.balance)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <section>
              <h4 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-800">
                <Wallet className="h-3.5 w-3.5 text-gold-600" /> Payments
              </h4>
              {payments.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink-200 px-3 py-4 text-center text-[12px] text-ink-400">
                  No payment recorded yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {payments.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-ink-200/70 bg-white/70 px-3 py-2"
                    >
                      <div>
                        <p className="text-[12.5px] font-medium text-ink-800">
                          {payment.method}
                          {payment.kind === 'ADVANCE' && (
                            <span className="ml-1.5 rounded bg-sage-100 px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wide text-sage-700">
                              Advance
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-ink-500">
                          {formatDateTime(payment.paidAt)}
                          {payment.reference ? ` · ${payment.reference}` : ''}
                        </p>
                      </div>
                      <span className="text-[12.5px] font-semibold tabular-nums text-ink-900">
                        {formatINR(payment.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {refunds.length > 0 && (
              <section>
                <h4 className="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-ink-800">
                  <RotateCcw className="h-3.5 w-3.5 text-gold-600" /> Refunds
                </h4>
                <ul className="space-y-2">
                  {refunds.map((refund) => (
                    <li
                      key={refund.id}
                      className="rounded-xl border border-ink-200/70 bg-white/70 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[12.5px] font-medium text-ink-800">{refund.method}</p>
                        <span className="text-[12.5px] font-semibold tabular-nums text-rose-600">
                          − {formatINR(refund.amount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-ink-500">
                        {formatDateTime(refund.refundedAt)} · {refund.reason}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {bill.notes && (
              <div className="rounded-xl border border-gold-200/70 bg-gold-50/60 px-3 py-2.5 text-[12px] leading-relaxed text-gold-900">
                <span className="label mb-1 block text-gold-700">Notes</span>
                {bill.notes}
              </div>
            )}

            {bill.status === 'CANCELLED' && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-[12px] leading-relaxed text-rose-700">
                <p className="font-semibold">Cancelled bill</p>
                <p className="mt-0.5">{bill.cancelReason}</p>
                {bill.cancelledAt && <p className="mt-1 text-[11px]">{formatDateTime(bill.cancelledAt)}</p>}
              </div>
            )}

            <p className="flex items-center gap-1.5 text-[11px] text-ink-400">
              <ReceiptText className="h-3 w-3" /> Receipt includes all payment methods and the salon footer.
            </p>
          </div>
        )}
      </Drawer>

      <PaymentDialog bill={bill} open={paymentOpen} onClose={() => setPaymentOpen(false)} />
      <RefundDialog bill={bill} open={refundOpen} onClose={() => setRefundOpen(false)} />

      <ConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={cancel}
        title="Cancel this bill?"
        description="The bill is preserved in history. Stock movements are reversed automatically. Any refund must be recorded separately."
        confirmLabel="Cancel bill"
        requireReason
        reasonLabel="Cancellation reason"
        busy={busy}
      />
    </>
  );
}

function TotalRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[12.5px]">
      <span className={muted ? 'text-ink-400' : 'text-ink-500'}>{label}</span>
      <span
        className={
          muted
            ? 'font-medium tabular-nums text-sage-600'
            : 'font-medium tabular-nums text-ink-800'
        }
      >
        {value}
      </span>
    </div>
  );
}

