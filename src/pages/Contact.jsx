import { useEffect, useState } from 'react'
import { Mail, MapPin, Phone } from 'lucide-react'
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx'
import ContactSection from '../components/home/ContactSection.jsx'
import { BUSINESS } from '../data/business.js'

export default function Contact() {
  const [form, setForm] = useState({ name: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)

  useEffect(() => {
    document.title = 'Contact Us | Hand Tools Trading Corporation'
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <>
      <Breadcrumbs items={[{ label: 'Contact' }]} />

      <div className="container-app py-8 md:py-12">
        <div className="mb-10 max-w-2xl">
          <h1 className="font-heading text-2xl font-bold text-navy-900 md:text-3xl">Contact Us</h1>
          <p className="mt-2 text-sm text-steel-500 md:text-base">
            Get in touch for product enquiries, bulk orders or general questions. We&apos;re based in
            Lahore and happy to help.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <InfoCard icon={MapPin} title="Our Address" value={BUSINESS.fullAddress} />
          <InfoCard icon={Phone} title="Phone" value={BUSINESS.phoneDisplay} href={`tel:${BUSINESS.phoneHref}`} />
          <InfoCard icon={Mail} title="Email" value={BUSINESS.email} href={`mailto:${BUSINESS.email}`} />
        </div>

        <div className="mt-10 max-w-xl rounded-lg border border-steel-100 bg-white p-6">
          <h2 className="mb-4 font-heading text-lg font-bold text-navy-900">Send Us a Message</h2>
          {sent ? (
            <p className="rounded-md bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
              Thanks! Your message has been noted &mdash; for a faster response, please call us at{' '}
              {BUSINESS.phoneDisplay}.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">Your Name</label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="input"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">Phone Number</label>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className="input"
                  placeholder="03XX XXXXXXX"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-navy-800">Message</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
                  className="input resize-none"
                  placeholder="How can we help?"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-md bg-accent-500 py-3 text-sm font-semibold text-white hover:bg-accent-600"
              >
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>

      <ContactSection />
    </>
  )
}

function InfoCard({ icon: Icon, title, value, href }) {
  const content = (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-steel-100 bg-white p-6 text-center transition-shadow hover:shadow-md">
      <span className="flex h-11 w-11 items-center justify-center rounded-full bg-navy-800 text-accent-400">
        <Icon size={20} />
      </span>
      <p className="font-heading text-sm font-bold text-navy-900">{title}</p>
      <p className="text-sm text-steel-600">{value}</p>
    </div>
  )
  return href ? <a href={href}>{content}</a> : content
}
