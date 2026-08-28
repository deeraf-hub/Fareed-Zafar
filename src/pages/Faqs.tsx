import { useState } from 'react'
import { faqs } from '@/data/policies'
import { ChevronDownIcon } from '@/components/ui/Icons'
import { useSeo } from '@/lib/useSeo'

export function Faqs() {
  useSeo('Frequently Asked Questions')
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="container-lux max-w-2xl py-16 sm:py-24">
      <span className="eyebrow">Support</span>
      <h1 className="mt-3 text-3xl text-charcoal sm:text-4xl">Frequently Asked Questions</h1>

      <div className="mt-10 flex flex-col divide-y divide-beige border-y border-beige">
        {faqs.map((faq, i) => {
          const open = openIndex === i
          return (
            <div key={faq.question}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-4 py-5 text-left text-charcoal"
                aria-expanded={open}
              >
                <span>{faq.question}</span>
                <ChevronDownIcon className={`flex-none transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
              </button>
              {open && <p className="pb-5 text-sm leading-relaxed text-charcoal-muted">{faq.answer}</p>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
