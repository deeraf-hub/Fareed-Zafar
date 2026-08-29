import { useEffect } from 'react'
import Breadcrumbs from '../components/layout/Breadcrumbs.jsx'
import { BUSINESS } from '../data/business.js'

export default function Terms() {
  useEffect(() => {
    document.title = 'Terms & Conditions | Hand Tools Trading Corporation'
  }, [])

  return (
    <>
      <Breadcrumbs items={[{ label: 'Terms & Conditions' }]} />
      <div className="container-app max-w-3xl py-10 md:py-14">
        <h1 className="mb-6 font-heading text-2xl font-bold text-navy-900 md:text-3xl">
          Terms &amp; Conditions
        </h1>
        <div className="space-y-6 text-sm leading-relaxed text-steel-600 md:text-base">
          <p>
            Please read these terms carefully before using the Hand Tools Trading Corporation
            website or placing an order request.
          </p>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">Orders</h2>
            <p>
              Placing an order through this website submits an order request &mdash; it is not an
              automatic sale. Our team will contact you by phone to confirm product availability,
              final pricing, delivery timeline and payment before your order is finalised.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">Pricing</h2>
            <p>
              All prices are listed in Pakistani Rupees (PKR) and are subject to change without
              prior notice. Every effort is made to keep pricing accurate, but errors may occasionally
              occur and will be corrected before an order is confirmed.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">Payment</h2>
            <p>
              We currently accept Cash on Delivery, JazzCash and EasyPaisa. No online payment is
              processed through this website; payment for JazzCash or EasyPaisa orders is arranged
              directly with our team after your order request is placed.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">Delivery</h2>
            <p>
              Delivery timelines depend on your location within Lahore and Pakistan and will be
              confirmed at the time of order. Delivery charges, where applicable, will be communicated
              before dispatch.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">Product Information</h2>
            <p>
              Product images and descriptions are provided to represent items as accurately as
              possible. Minor variations in colour, packaging or finish may occur.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-heading text-lg font-bold text-navy-900">Contact</h2>
            <p>
              For any questions regarding these terms, contact us at {BUSINESS.phoneDisplay} or{' '}
              {BUSINESS.email}.
            </p>
          </section>
        </div>
      </div>
    </>
  )
}
