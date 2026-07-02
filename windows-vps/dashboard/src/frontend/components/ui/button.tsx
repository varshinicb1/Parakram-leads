import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:pointer-events-none disabled:opacity-50 select-none',
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-white shadow-sm hover:bg-accent/90 hover:-translate-y-[1px] hover:shadow-md active:translate-y-0',
        secondary:
          'bg-surface-secondary text-text-primary border border-border hover:bg-hover hover:-translate-y-[1px] active:translate-y-0',
        ghost:
          'text-text-secondary hover:text-text-primary hover:bg-hover',
        danger:
          'bg-danger text-white shadow-sm hover:bg-danger/90 hover:-translate-y-[1px] hover:shadow-md active:translate-y-0',
        outline:
          'border border-border bg-transparent text-text-primary hover:bg-hover hover:-translate-y-[1px] active:translate-y-0',
      },
      size: {
        sm: 'h-8 px-3 text-xs rounded-[10px]',
        md: 'h-11 px-5 text-sm rounded-[14px]',
        lg: 'h-12 px-6 text-sm rounded-[14px]',
        icon: 'h-10 w-10 rounded-[12px]',
      },
    },
    defaultVariants: {
      variant: 'secondary',
      size: 'md',
    },
  }
);

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
