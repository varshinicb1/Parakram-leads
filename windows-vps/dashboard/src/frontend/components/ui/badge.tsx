import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[8px] px-2.5 py-1 text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        running: 'bg-success/10 text-success',
        stopped: 'bg-danger/10 text-danger',
        pending: 'bg-warning/10 text-warning',
        info: 'bg-info/10 text-info',
        neutral: 'bg-surface-secondary text-text-secondary',
      },
    },
    defaultVariants: {
      variant: 'neutral',
    },
  }
);

interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
}

export function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
