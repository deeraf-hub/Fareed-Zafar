import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md';

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-9 px-4 text-base',
};

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover',
  secondary: 'border border-line bg-surface text-ink hover:bg-page',
  ghost: 'bg-transparent text-accent hover:bg-accent-soft',
};

/** Shared classes so links can be styled as buttons too. */
export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = ''): string {
  return [
    'focus-ring inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50',
    SIZE_CLASSES[size],
    VARIANT_CLASSES[variant],
    extra,
  ]
    .filter(Boolean)
    .join(' ');
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', className = '', type = 'button', ...rest },
  ref,
) {
  return <button ref={ref} type={type} className={buttonClasses(variant, size, className)} {...rest} />;
});
