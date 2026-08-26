import { useState } from 'react'
import { faqs } from '@/data/editorial'
import { Seo } from '@/components/Seo'
import { PageHeader } from '@/components/ui/PageHeader'
import { ButtonLink } from '@/components/ui/Button'

export default function Faqs() {
  const [open, setOpen] = useState<string | null>(faqs[0]?.question ?? null)

  return (
    <>
      <Seo
        title="FAQs"
        description="Answers to common questions about delivery, payment, sizing, returns and jewellery care at Swabi Jewellers."
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: faqs.map((faq) => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: { '@type': 'Answer', text: faq.answer },
          })),
        }}
      />
      <PageHeader
        eyebrow="Customer care"
        title="Frequently Asked Questions"
        description="Delivery, payment, sizing, returns and care — answered."
        crumbs={[{ label: 'Home', to: '/' }, { label: 'FAQs' }]}
      />

      <div className="container-luxe py-12 lg:py-16">
        <dl className="max-w-3xl divide-y divide-linen border-y border-linen">
          {faqs.map((faq) => (
            <div key={faq.question}>
              <dt>
                <button
                  type="button"
                  onClick={() => setOpen(open === faq.question ? null : faq.question)}
                  aria-expanded={open === faq.question}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                >
                  <span className="font-display text-lg text-navy-700">{faq.question}</span>
                  <span className="text-champagne-600">{open === faq.question ? '−' : '+'}</span>
                </button>
              </dt>
              {open === faq.question && (
                <dd className="animate-slide-down pb-6 text-[15px] leading-relaxed text-stoneish">
                  {faq.answer}
                </dd>
              )}
            </div>
          ))}
        </dl>

        <div className="mt-12">
          <p className="text-sm text-stoneish">Did not find your answer?</p>
          <ButtonLink to="/contact" variant="outline" className="mt-4">
            Contact Us
          </ButtonLink>
        </div>
      </div>
    </>
  )
}
