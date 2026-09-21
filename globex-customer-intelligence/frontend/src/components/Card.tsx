import { useId, type ReactNode } from 'react';

type Props = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  bodyClassName?: string;
  headingLevel?: 2 | 3;
  interactive?: boolean;
  id?: string;
};

export function Card({
  title,
  description,
  actions,
  children,
  className = '',
  bodyClassName = '',
  headingLevel = 2,
  interactive = false,
  id,
}: Props) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const hasHeader = Boolean(title || actions);
  return (
    <section
      id={id}
      className={`card min-w-0 ${interactive ? 'card-interactive' : ''} ${className}`}
      aria-labelledby={title ? headingId : undefined}
    >
      {hasHeader && (
        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {title && (
              <Heading id={headingId} className="text-md font-semibold text-ink">
                {title}
              </Heading>
            )}
            {description && <p className="mt-0.5 text-sm text-ink-secondary">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={`px-4 py-4 sm:px-5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}
