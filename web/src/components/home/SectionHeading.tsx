import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface SectionHeadingProps {
  title: string;
  description?: string;
  linkTo?: string;
  linkLabel?: string;
  as?: 'h2' | 'h3';
}

export const SectionHeading = ({ title, description, linkTo, linkLabel, as: Tag = 'h2' }: SectionHeadingProps) => (
  <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
    <div>
      <Tag className="section-title">{title}</Tag>
      {description && <p className="mt-2 max-w-2xl text-sm text-ink-500">{description}</p>}
    </div>
    {linkTo && (
      <Link to={linkTo} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline">
        {linkLabel ?? 'View all'} <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    )}
  </div>
);
