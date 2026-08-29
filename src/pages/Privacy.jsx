import { useEffect } from 'react'
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx'
import { BUSINESS } from '../data/business.js'

export default function Privacy() {
  useEffect(() => {
    document.title = 'Privacy Policy | Hand Tools Trading Corporation'
  }, [])

  return (
    <>
      <Breadcrumbs items={[{ label: 'Privacy Policy' }]} />
      <div className="container-app max-w-3xl py-10 md:py-14">
        <h1 className="mb-6 font-heading text-2xl font-bold text-navy-900 md:text-3xl">Privacy Policy</h1>
        <div className="space-y-6 text-sm leading-relaxed text-steel-600 md:text-base">
          <p>
            Hand Tools Trading Corporation (&ldquo;we&rdquo;, &ldquo;us&rdquo;) respects your privacy.
            This policy explains what information we collect through this website and how we use it.
          </p>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">Information We Collect</h2>
            <p>
              When you place an order or contact us, we collect the details you provide directly:
              your name, phone number, email address, delivery address and city, along with the
              products and quantities you order.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">How We Use Your Information</h2>
            <p>
              We use this information only to process and deliver your order request, confirm
              payment arrangements (Cash on Delivery, JazzCash or EasyPaisa), and respond to your
              enquiries. We do not sell or rent your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">Cart & Browsing Data</h2>
            <p>
              Items you add to your shopping cart are stored locally in your browser so your cart is
              preserved between visits. This data stays on your device and is not transmitted to our
              servers until you submit an order.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">Contact Us</h2>
            <p>
              For any questions about this policy or your personal data, contact us at{' '}
              <a href={`mailto:${BUSINESS.email}`} className="font-medium text-accent-600 hover:underline">
                {BUSINESS.email}
              </a>{' '}
              or call {BUSINESS.phoneDisplay}.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
