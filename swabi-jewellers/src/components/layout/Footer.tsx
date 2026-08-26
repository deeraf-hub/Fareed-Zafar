import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { siteConfig } from '@/config/site'
import { footerNav } from '@/config/navigation'
import { Logo } from '@/components/ui/Logo'
import {
  FacebookIcon,
  InstagramIcon,
  MailIcon,
  PhoneIcon,
  PinIcon,
  TikTokIcon,
} from '@/components/ui/icons'

function NewsletterForm() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'done'>('idle')

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!/^\S+@\S+\.\S+$/.test(email)) return
    // A newsletter provider (Mailchimp, Klaviyo, a /api/subscribe route) plugs in here.
    setStatus('done')
    setEmail('')
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <label htmlFor="footer-newsletter" className="sr-only">
        Email address
      </label>
      <input
        id="footer-newsletter"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Enter your email address"
        className="field flex-1 border-navy-500/40 bg-transparent text-ivory placeholder:text-ivory/50 focus:border-champagne-300"
      />
      <button
        type="submit"
        className="bg-champagne-400 px-7 py-3 text-[11px] uppercase tracking-wideish text-navy-800 transition-colors duration-500 ease-luxe hover:bg-champagne-300"
      >
        Subscribe
      </button>
      {status === 'done' && (
        <p className="text-xs text-champagne-200 sm:sr-only">Thank you — you are on the list.</p>
      )}
    </form>
  )
}

export function Footer() {
  const columns = [
    { title: 'Shop', links: footerNav.shop },
    { title: 'Customer Care', links: footerNav.care },
    { title: 'Company', links: footerNav.company },
  ]

  return (
    <footer className="mt-24 bg-navy-700 text-ivory">
      <div className="container-luxe py-14 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_repeat(3,1fr)_1.2fr]">
          <div>
            <Logo tone="ivory" markClassName="h-10 w-10" />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ivory/70">
              {siteConfig.description}
            </p>
            <ul className="mt-6 flex gap-3">
              <li>
                <a
                  href={siteConfig.social.instagram.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Instagram"
                  className="grid h-9 w-9 place-items-center border border-ivory/25 transition-colors hover:border-champagne-300 hover:text-champagne-300"
                >
                  <InstagramIcon />
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.facebook.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Facebook"
                  className="grid h-9 w-9 place-items-center border border-ivory/25 transition-colors hover:border-champagne-300 hover:text-champagne-300"
                >
                  <FacebookIcon />
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.social.tiktok.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="TikTok"
                  className="grid h-9 w-9 place-items-center border border-ivory/25 transition-colors hover:border-champagne-300 hover:text-champagne-300"
                >
                  <TikTokIcon />
                </a>
              </li>
            </ul>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h3 className="text-[11px] uppercase tracking-luxe text-champagne-300">
                {column.title}
              </h3>
              <ul className="mt-5 space-y-3 text-sm text-ivory/75">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.to}`}>
                    <Link to={link.to} className="link-underline transition-colors hover:text-ivory">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div>
            <h3 className="text-[11px] uppercase tracking-luxe text-champagne-300">Contact</h3>
            <ul className="mt-5 space-y-3 text-sm text-ivory/75">
              <li>
                <a
                  href={siteConfig.contact.phoneHref}
                  className="flex items-center gap-2.5 transition-colors hover:text-ivory"
                >
                  <PhoneIcon className="shrink-0" />
                  {siteConfig.contact.phone}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteConfig.contact.email}`}
                  className="flex items-center gap-2.5 transition-colors hover:text-ivory"
                >
                  <MailIcon className="shrink-0" />
                  {siteConfig.contact.email}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <PinIcon className="mt-0.5 shrink-0" />
                <address className="not-italic leading-relaxed">
                  {siteConfig.contact.addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              </li>
              <li className="text-xs text-ivory/55">{siteConfig.contact.hours}</li>
            </ul>
          </div>
        </div>

        <div className="mt-14 border-t border-ivory/15 pt-10">
          <div className="max-w-xl">
            <h3 className="font-display text-2xl">Be the First to Discover What&rsquo;s New</h3>
            <p className="mt-2 text-sm text-ivory/70">
              Sign up for new collection launches, exclusive offers and jewellery inspiration.
            </p>
            <NewsletterForm />
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-ivory/15 pt-6 text-xs text-ivory/55 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
          <p className="flex flex-wrap gap-x-4 gap-y-1">
            <span>Cash on Delivery</span>
            <span>Bank Transfer</span>
            <span>Easypaisa</span>
            <span>JazzCash</span>
          </p>
        </div>
      </div>
    </footer>
  )
}
