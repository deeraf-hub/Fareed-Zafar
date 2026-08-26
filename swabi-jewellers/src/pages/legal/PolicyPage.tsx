import { useLocation } from 'react-router-dom'
import { getPolicy } from '@/data/policies'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { Reveal } from '@/components/ui/Reveal'
import { ButtonLink } from '@/components/ui/Button'
import NotFound from '../NotFound'

/** One template for every customer-care and legal page; content comes from `policies`. */
export default function PolicyPage() {
  const { pathname } = useLocation()
  const policy = getPolicy(pathname)

  if (!policy) return <NotFound />

  return (
    <>
      <Seo title={policy.title} description={policy.intro} />
      <PageHeader
        eyebrow={policy.eyebrow}
        title={policy.title}
        description={policy.intro}
        crumbs={[{ label: 'Home', to: '/' }, { label: policy.title }]}
      />

      <div className="container-luxe py-12 lg:py-16">
        <div className="max-w-3xl space-y-10">
          {policy.sections.map((section, index) => (
            <Reveal key={section.heading} delay={index * 60}>
              <h2 className="font-display text-2xl">{section.heading}</h2>
              <div className="mt-4 h-px w-12 bg-champagne-400" />
              <div className="mt-5 space-y-3 text-[15px] leading-relaxed text-stoneish">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </Reveal>
          ))}

          <div className="border-t border-linen pt-10">
            <p className="text-sm text-stoneish">Still have a question?</p>
            <ButtonLink to="/contact" variant="outline" className="mt-4">
              Contact Us
            </ButtonLink>
          </div>
        </div>
      </div>
    </>
  )
}
