import { Card } from '@/components/common/Card';

export function ReceiptPreview({
  businessName,
  tagline,
  prefix,
  footer,
  showTax,
}: {
  businessName: string;
  tagline: string;
  prefix: string;
  footer: string;
  showTax: boolean;
}) {
  return (
    <Card className="h-fit overflow-hidden">
      <div className="bg-ink-950 px-4 py-3 text-center text-cream">
        <p className="font-display text-base tracking-wide text-gold-300">{businessName.toUpperCase()}</p>
        <p className="text-[10px] text-ink-300">{tagline}</p>
      </div>
      <div className="space-y-1.5 px-4 py-3 text-[11px] text-ink-700">
        <p className="flex justify-between">
          <span className="text-ink-500">Bill</span>
          <span className="font-semibold">{prefix || 'ZN'}-2026-00042</span>
        </p>
        <p className="flex justify-between">
          <span className="text-ink-500">Customer</span>
          <span>Sneha Kulkarni</span>
        </p>
        <div className="border-t border-dashed border-ink-200 pt-2">
          <p className="flex justify-between py-0.5">
            <span>Hair Spa</span>
            <span>Rs. 1,000</span>
          </p>
          <p className="flex justify-between py-0.5">
            <span>Classic Facial</span>
            <span>Rs. 800</span>
          </p>
        </div>
        <div className="border-t border-dashed border-ink-200 pt-2">
          <p className="flex justify-between">
            <span className="text-ink-500">Subtotal</span>
            <span>Rs. 1,800</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-500">Discount</span>
            <span>− Rs. 100</span>
          </p>
          {showTax && (
            <p className="flex justify-between">
              <span className="text-ink-500">GST</span>
              <span>Rs. 0</span>
            </p>
          )}
          <p className="mt-1 flex justify-between border-t border-ink-200 pt-1 text-[12px] font-semibold">
            <span>Total</span>
            <span>Rs. 1,700</span>
          </p>
          <p className="flex justify-between">
            <span className="text-ink-500">Paid</span>
            <span>Rs. 1,700</span>
          </p>
        </div>
        <p className="border-t border-dashed border-ink-200 pt-2 text-center text-[10.5px] text-ink-500">
          {footer}
        </p>
      </div>
    </Card>
  );
}
