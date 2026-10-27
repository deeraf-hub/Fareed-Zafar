import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
}

const variants: Record<Variant, string> = {
  primary: 'bg-accent-500 text-white hover:bg-accent-400 disabled:bg-accent-600/50',
  secondary: 'bg-ink-700 text-ink-100 hover:bg-ink-600 disabled:text-ink-400',
  ghost: 'bg-transparent text-ink-200 hover:bg-ink-700 hover:text-ink-100 disabled:text-ink-500',
  danger: 'bg-red-600/90 text-white hover:bg-red-500 disabled:bg-red-900/50',
};

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  lg: 'h-11 px-5 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', loading, icon, className, children, disabled, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Spinner className="h-3.5 w-3.5" /> : icon}
      {children}
    </button>
  );
});
