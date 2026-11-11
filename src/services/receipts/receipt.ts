import { jsPDF } from 'jspdf';
import type { Bill, BillItem, Payment, Refund, Settings } from '@/types';
import { formatDate, formatDateTime } from '@/utils/date';
import { formatNumber } from '@/utils/money';
import { normalisePhone } from '@/utils/misc';
import { PAYMENT_METHODS } from '@/utils/constants';

/**
 * Receipts are generated as PDF with jsPDF. Standard PDF fonts cannot render the
 * ₹ glyph, so receipts use `Rs.` — also the clearest format for 58mm thermal paper.
 */

export interface ReceiptData {
  bill: Bill;
  items: BillItem[];
  payments: Payment[];
  refunds?: Refund[];
  settings: Pick<
    Settings,
    | 'businessName'
    | 'tagline'
    | 'address'
    | 'phone'
    | 'gstin'
    | 'receiptFooter'
    | 'receiptWidth'
    | 'showTaxOnReceipt'
    | 'taxLabel'
  >;
}

interface Layout {
  format: string | number[];
  width: number;
  margin: number;
  baseFont: number;
}

export function layoutFor(width: Settings['receiptWidth']): Layout {
  if (width === '58') return { format: [58, 200], width: 58, margin: 4, baseFont: 7 };
  if (width === 'A4') return { format: 'a4', width: 210, margin: 18, baseFont: 10 };
  return { format: [80, 240], width: 80, margin: 5, baseFont: 8.5 };
}

export function money(paise: number): string {
  return `Rs. ${formatNumber(paise / 100)}`;
}

function paymentLabel(method: string): string {
  return PAYMENT_METHODS.find((option) => option.value === method)?.label ?? method;
}

export function receiptFileName(bill: Bill): string {
  return `Zine-Receipt-${bill.billNumber}.pdf`;
}

/** Builds the PDF in memory so it can be previewed, downloaded or shared. */
export function buildReceiptPdf(data: ReceiptData): jsPDF {
  const { bill, items, payments, settings } = data;
  const layout = layoutFor(settings.receiptWidth);
  const doc = new jsPDF({ unit: 'mm', format: layout.format, compress: true });
  const contentWidth = layout.width - layout.margin * 2;
  const isA4 = layout.width === 210;
  let y = layout.margin + 2;

  const write = (
    text: string,
    options: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right'; gap?: number } = {},
  ) => {
    const { size = layout.baseFont, bold = false, align = 'left', gap = 4 } = options;
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, contentWidth) as string[];
    for (const line of lines) {
      const x =
        align === 'center'
          ? layout.width / 2
          : align === 'right'
            ? layout.width - layout.margin
            : layout.margin;
      doc.text(line, x, y, { align });
      y += size * 0.42;
    }
    y += gap;
  };

  const divider = (gap = 4) => {
    doc.setDrawColor(190, 182, 172);
    doc.setLineWidth(0.15);
    doc.line(layout.margin, y, layout.width - layout.margin, y);
    y += gap;
  };

  const row = (label: string, value: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(layout.baseFont + (bold ? 0.6 : 0));
    doc.text(label, layout.margin, y);
    doc.text(value, layout.width - layout.margin, y, { align: 'right' });
    y += layout.baseFont * 0.55;
  };

  doc.setFillColor(28, 23, 20);
  doc.rect(0, 0, layout.width, isA4 ? 30 : 18, 'F');
  doc.setTextColor(227, 197, 116);
  doc.setFont('times', 'bold');
  doc.setFontSize(isA4 ? 26 : 15);
  doc.text(settings.businessName.toUpperCase(), layout.width / 2, isA4 ? 15 : 10, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(isA4 ? 9 : 6.5);
  doc.setTextColor(240, 232, 220);
  const subLine = [settings.tagline, settings.phone].filter(Boolean).join('  ·  ');
  doc.text(subLine, layout.width / 2, isA4 ? 22 : 14.5, { align: 'center' });
  y = isA4 ? 40 : 24;
  doc.setTextColor(40, 36, 33);

  if (settings.address) write(settings.address, { size: layout.baseFont - 0.5, align: 'center', gap: 2 });
  if (settings.gstin) write(`GSTIN: ${settings.gstin}`, { size: layout.baseFont - 1, align: 'center', gap: 2 });

  divider();
  write(`Bill No: ${bill.billNumber}`, { bold: true, gap: 1 });
  write(`Date: ${formatDateTime(bill.billDate)}`, { gap: 1 });
  write(`Customer: ${bill.customerName}`, { gap: 1 });
  if (bill.customerPhone) write(`Mobile: ${bill.customerPhone}`, { gap: 1 });
  write(`Handled by: ${bill.employeeName}`, { gap: 4 });
  divider();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(layout.baseFont);
  doc.text('Item', layout.margin, y);
  doc.text('Amount', layout.width - layout.margin, y, { align: 'right' });
  y += layout.baseFont * 0.55;
  divider(3);

  for (const item of items) {
    const nameLines = doc.splitTextToSize(item.name, contentWidth - 22) as string[];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(layout.baseFont);
    doc.text(nameLines, layout.margin, y);
    doc.text(money(item.lineTotal), layout.width - layout.margin, y, { align: 'right' });
    y += nameLines.length * layout.baseFont * 0.42;
    if (item.quantity > 1) {
      doc.setFontSize(layout.baseFont - 1);
      doc.setTextColor(110, 100, 92);
      doc.text(`${item.quantity} × ${money(item.unitPrice)}`, layout.margin, y);
      doc.setTextColor(40, 36, 33);
      y += layout.baseFont * 0.4;
    }
    if (item.discount > 0) {
      doc.setFontSize(layout.baseFont - 1);
      doc.setTextColor(150, 42, 70);
      doc.text(`Discount −${money(item.discount)}`, layout.margin, y);
      doc.setTextColor(40, 36, 33);
      y += layout.baseFont * 0.4;
    }
    y += 1.6;
  }

  return finishReceipt(doc, layout, { bill, payments, settings, row, divider, write });
}

type ReceiptChrome = {
  bill: Bill;
  payments: Payment[];
  settings: ReceiptData['settings'];
  row: (label: string, value: string, bold?: boolean) => void;
  divider: (gap?: number) => void;
  write: (
    text: string,
    options?: { size?: number; bold?: boolean; align?: 'left' | 'center' | 'right'; gap?: number },
  ) => void;
};

function finishReceipt(doc: jsPDF, layout: Layout, chrome: ReceiptChrome): jsPDF {
  const { bill, payments, settings, row, divider, write } = chrome;

  divider();
  row('Subtotal', money(bill.subtotal));
  if (bill.itemDiscount > 0) row('Item discounts', `−${money(bill.itemDiscount)}`);
  if (bill.offerDiscount > 0) {
    row(`Offer${bill.offerName ? ` (${bill.offerName})` : ''}`, `−${money(bill.offerDiscount)}`);
  }
  if (bill.billDiscount > 0) row('Discount', `−${money(bill.billDiscount)}`);
  if (settings.showTaxOnReceipt && bill.taxAmount > 0) {
    row(`${settings.taxLabel || 'Tax'} (${bill.taxPercent}%)`, money(bill.taxAmount));
  }
  divider(2);
  row('Total', money(bill.total), true);
  row('Paid', money(bill.paid));
  if (bill.balance > 0) row('Balance due', money(bill.balance), true);
  if (bill.refunded > 0) row('Refunded', money(bill.refunded));

  if (payments.length) {
    divider(2);
    const methods = payments
      .map((payment) => `${paymentLabel(payment.method)} ${money(payment.amount)}`)
      .join('  ·  ');
    write(`Payment: ${methods}`, { size: layout.baseFont - 0.5, gap: 2 });
  }

  if (bill.status === 'CANCELLED') {
    write('*** CANCELLED ***', { bold: true, align: 'center' });
    if (bill.cancelReason) {
      write(`Reason: ${bill.cancelReason}`, { size: layout.baseFont - 1, align: 'center' });
    }
  }

  divider(3);
  write(settings.receiptFooter || 'Thank you for visiting Zine!', {
    align: 'center',
    size: layout.baseFont,
    gap: 1,
  });
  write('Please collect your bill. This receipt is proof of payment.', {
    align: 'center',
    size: layout.baseFont - 1,
    gap: 3,
  });
  write(`Generated ${formatDate(Date.now(), 'd MMM yyyy, HH:mm')} · Zine`, {
    align: 'center',
    size: Math.max(5, layout.baseFont - 1.5),
  });

  return doc;
}

export function downloadReceipt(data: ReceiptData): void {
  buildReceiptPdf(data).save(receiptFileName(data.bill));
}

export function receiptDataUrl(data: ReceiptData): string {
  return buildReceiptPdf(data).output('datauristring');
}

/** Click-to-chat message. The employee attaches the PDF manually in V1. */
export function buildWhatsAppMessage(data: ReceiptData): string {
  const { bill, settings } = data;
  const lines = [
    `Thank you for visiting ${settings.businessName}!`,
    `Bill ${bill.billNumber} · ${money(bill.total)}`,
    bill.balance > 0 ? `Balance due: ${money(bill.balance)}` : 'Paid in full.',
    '',
    'Please find your bill attached. We look forward to seeing you again.',
  ];
  return lines.join('\n');
}

export function whatsAppLink(data: ReceiptData, phoneOverride?: string): string {
  const phone = normalisePhone(phoneOverride || data.bill.customerPhone);
  const text = encodeURIComponent(buildWhatsAppMessage(data));
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

/** Opens WhatsApp with a pre-filled message; returns false if popups are blocked. */
export function openWhatsApp(data: ReceiptData, phoneOverride?: string): boolean {
  const win = window.open(whatsAppLink(data, phoneOverride), '_blank', 'noopener,noreferrer');
  return Boolean(win);
}

/** Plain-text receipt for clipboard / thermal fallback. */
export function receiptText(data: ReceiptData): string {
  const { bill, items, settings } = data;
  return [
    settings.businessName.toUpperCase(),
    bill.billNumber,
    formatDateTime(bill.billDate),
    `Customer: ${bill.customerName}`,
    `Handled by: ${bill.employeeName}`,
    '--------------------------------',
    ...items.map((item) => `${item.name}  ${money(item.lineTotal)}`),
    '--------------------------------',
    `Total: ${money(bill.total)}`,
    `Paid: ${money(bill.paid)}`,
    `Balance: ${money(bill.balance)}`,
    settings.receiptFooter,
  ].join('\n');
}
