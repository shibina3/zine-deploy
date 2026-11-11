import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/utils/cn';

export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('surface', className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
  icon,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-5', className)}>
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 text-gold-300">
            {icon}
          </span>
        )}
        <div>
          <h3 className="font-display text-[17px] font-medium leading-tight text-ink-900">{title}</h3>
          {subtitle && <p className="mt-1 text-[13px] leading-snug text-ink-500">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('px-5 py-4', className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cn('mt-2 border-t border-ink-100 px-5 py-3 text-[13px] text-ink-500', className)}>
      {children}
    </div>
  );
}

/** Card with a title row, used for dashboard panels and settings sections. */
export function SectionCard({
  title,
  subtitle,
  action,
  icon,
  children,
  className,
  bodyClassName,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader title={title} subtitle={subtitle} action={action} icon={icon} />
      <div className={cn('px-5 py-4', bodyClassName)}>{children}</div>
    </Card>
  );
}
