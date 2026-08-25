import { FileQuestion } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';
import { EmptyState } from '../components/ui/EmptyState';
import { siteConfig } from '../config/site';
import { policies } from '../data/policies';
import { useSeo } from '../lib/seo';

const PolicyPage = () => {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, '');
  const policy = policies[slug];

  useSeo({
    title: policy ? `${policy.title} | ${siteConfig.name}` : `Page not found | ${siteConfig.name}`,
    description: policy?.intro ?? 'Page not found.',
  });

  if (!policy) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={FileQuestion}
          tone="error"
          as="h1"
          title="Policy not found"
          description="This page is not available."
          action={
            <Link to="/" className="btn-primary">
              Back to home
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="container-page">
      <Breadcrumbs items={[{ label: 'Home', to: '/' }, { label: policy.title }]} />
      <div className="mx-auto max-w-3xl pb-8">
        <h1 className="section-title">{policy.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">{policy.intro}</p>

        {policy.sections.map((section) => (
          <section key={section.heading} className="mt-8">
            <h2 className="text-lg font-semibold text-ink-900">{section.heading}</h2>
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-relaxed text-ink-600">
                {paragraph}
              </p>
            ))}
            {section.bullets && (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-ink-600">
                {section.bullets.map((bullet) => (
                  <li key={bullet}>{bullet}</li>
                ))}
              </ul>
            )}
          </section>
        ))}

        <p className="mt-10 rounded-xl bg-ink-50 p-4 text-xs text-ink-500">
          This policy text is editable in <code className="font-mono">src/data/policies.ts</code>. Confirm the details
          with the business before launch — nothing here should be treated as a legal commitment that has not been
          agreed.
        </p>
      </div>
    </div>
  );
};

export default PolicyPage;
