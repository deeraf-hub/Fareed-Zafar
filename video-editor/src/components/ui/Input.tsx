import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import clsx from 'clsx';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...rest },
  ref,
) {
  return <input ref={ref} className={clsx('field-input', className)} {...rest} />;
});

export const TextArea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextArea(
  { className, ...rest },
  ref,
) {
  return <textarea ref={ref} className={clsx('field-input min-h-[72px] resize-y', className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, children, ...rest },
  ref,
) {
  return (
    <select ref={ref} className={clsx('field-input appearance-none pr-7 bg-no-repeat', className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%238b94a7' stroke-width='2'><path d='M6 9l6 6 6-6'/></svg>\")",
        backgroundPosition: 'right 8px center',
      }}
      {...rest}
    >
      {children}
    </select>
  );
});
