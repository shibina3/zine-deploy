import { CheckCircle2, Download, MessageCircle, Plus } from 'lucide-react';
import type { Customer, Settings } from '@/types';
import type { BillWithItems } from '@/db/repositories/billingRepo';
import { downloadReceipt, openWhatsApp, type ReceiptData } from '@/services/receipts/receipt';
import { formatINR } from '@/utils/money';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { notifyInfo } from '@/components/common/toastStore';

export function BillSuccessDialog({
  result,
  customer,
  settings,
  open,
  onClose,
  onNew,
}: {
  result: BillWithItems | null;
  customer: Customer | undefined;
  settings: Settings;
  open: boolean;
  onClose: () => void;
  onNew: () => void;
}) {
  if (!result) return null;
  const { bill, items, payments } = result;

  const receipt: ReceiptData = {
    bill,
    items,
    payments,
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
  };

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="text-center">
        <span className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-sage-100 text-sage-600">
          <CheckCircle2 className="h-7 w-7" />
        </span>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-700">Bill created</p>
        <h2 className="mt-1 font-display text-2xl font-medium text-ink-900">{bill.billNumber}</h2>
        <p className="mt-1 text-[13px] text-ink-500">
          {customer?.name ?? bill.customerName} · handled by {bill.employeeName}
        </p>

        <div className="mt-5 rounded-2xl border border-ink-200/70 bg-ink-50/50 p-4 text-left">
          <div className="flex items-center justify-between text-[13px]">
            <span className="text-ink-500">Total</span>
            <span className="font-semibold tabular-nums text-ink-900">{formatINR(bill.total)}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[13px]">
            <span className="text-ink-500">Paid</span>
            <span className="font-medium tabular-nums text-ink-800">{formatINR(bill.paid)}</span>
          </div>
          {bill.balance > 0 && (
            <div className="mt-1.5 flex items-center justify-between text-[13px]">
              <span className="text-rose-600">Balance due</span>
              <span className="font-semibold tabular-nums text-rose-600">{formatINR(bill.balance)}</span>
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-2">
          <Button
            block
            variant="gold"
            leadingIcon={<Download className="h-4 w-4" />}
            onClick={() => downloadReceipt(receipt)}
          >
            Download receipt PDF
          </Button>
          <Button
            block
            variant="secondary"
            leadingIcon={<MessageCircle className="h-4 w-4" />}
            onClick={() => {
              const opened = openWhatsApp(receipt);
              if (!opened) notifyInfo('Pop-up blocked', 'Allow pop-ups to open WhatsApp.');
            }}
          >
            Share on WhatsApp
          </Button>
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-ink-400">
          WhatsApp opens with a ready message. Attach the downloaded PDF before sending.
        </p>

        <div className="mt-5 flex items-center justify-center gap-2 border-t border-ink-100 pt-4">
          <Button variant="ghost" onClick={onNew} leadingIcon={<Plus className="h-4 w-4" />}>
            New bill
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
