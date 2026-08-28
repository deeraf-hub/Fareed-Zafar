import { useState } from 'react'
import { Reveal } from '@/components/ui/Reveal'

export function Newsletter() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setSubmitted(true)
    setEmail('')
  }

  return (
    <section className="bg-champagne-50 py-20 sm:py-24">
      <Reveal className="container-lux flex flex-col items-center gap-5 text-center">
        <span className="eyebrow">Newsletter</span>
        <h2 className="max-w-xl text-3xl leading-tight text-charcoal sm:text-4xl">
          Be the First to Discover What&rsquo;s New
        </h2>
        <p className="max-w-md text-base leading-relaxed text-charcoal-muted">
          Sign up for new collection launches, exclusive offers and jewellery inspiration.
        </p>

        {submitted ? (
          <p className="mt-2 text-sm text-champagne-700">Thank you — you&rsquo;re on the list.</p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-2 flex w-full max-w-md flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="input-field flex-1 bg-white"
            />
            <button type="submit" className="btn-primary">
              Subscribe
            </button>
          </form>
        )}
      </Reveal>
    </section>
  )
}
