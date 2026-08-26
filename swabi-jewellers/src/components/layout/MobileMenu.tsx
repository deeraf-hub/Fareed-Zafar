import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { primaryNav } from '@/config/navigation'
import { siteConfig } from '@/config/site'
import { Logo } from '@/components/ui/Logo'
import { ChevronDownIcon, CloseIcon, PhoneIcon, PinIcon } from '@/components/ui/icons'
import { useAccount } from '@/context/AccountContext'

interface MobileMenuProps {
  open: boolean
  onClose: () => void
}

export function MobileMenu({ open, onClose }: MobileMenuProps) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const { isAuthenticated, customer } = useAccount()
  const navigate = useNavigate()

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  if (!open) return null

  const go = (to: string) => {
    onClose()
    navigate(to)
  }

  return (
    <div className="fixed inset-0 z-[88] lg:hidden">
      <div className="absolute inset-0 animate-fade-in bg-navy-900/40" onClick={onClose} aria-hidden="true" />
      <nav
        aria-label="Mobile"
        className="absolute left-0 top-0 flex h-full w-[min(88vw,22rem)] animate-slide-down flex-col bg-ivory shadow-lift"
      >
        <div className="flex items-center justify-between border-b border-linen px-5 py-4">
          <Link to="/" onClick={onClose}>
            <Logo markClassName="h-8 w-8" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-navy-700"
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <ul className="flex-1 overflow-y-auto px-5 py-4">
          {primaryNav.map((item) => (
            <li key={item.label} className="border-b border-linen/60">
              {item.children ? (
                <>
                  <button
                    type="button"
                    onClick={() => setExpanded(expanded === item.label ? null : item.label)}
                    aria-expanded={expanded === item.label}
                    className="flex w-full items-center justify-between py-4 text-left font-display text-lg text-navy-700"
                  >
                    {item.label}
                    <ChevronDownIcon
                      className={`transition-transform duration-300 ${
                        expanded === item.label ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {expanded === item.label && (
                    <ul className="animate-slide-down pb-3">
                      {item.children.map((child) => (
                        <li key={child.to}>
                          <button
                            type="button"
                            onClick={() => go(child.to)}
                            className="block w-full py-2 text-left text-sm text-stoneish transition-colors hover:text-navy-700"
                          >
                            {child.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => go(item.to)}
                  className="block w-full py-4 text-left font-display text-lg text-navy-700"
                >
                  {item.label}
                </button>
              )}
            </li>
          ))}
        </ul>

        <div className="border-t border-linen px-5 py-5 text-sm">
          <button
            type="button"
            onClick={() => go('/account')}
            className="link-underline text-[11px] uppercase tracking-wideish text-navy-700"
          >
            {isAuthenticated ? `Account — ${customer?.fullName}` : 'Login / Register'}
          </button>
          <a
            href={siteConfig.contact.phoneHref}
            className="mt-4 flex items-center gap-2 text-xs text-stoneish"
          >
            <PhoneIcon width={15} height={15} />
            {siteConfig.contact.phone}
          </a>
          <p className="mt-2 flex items-start gap-2 text-xs text-stoneish">
            <PinIcon width={15} height={15} className="mt-0.5 shrink-0" />
            <span>{siteConfig.contact.addressLines.join(', ')}</span>
          </p>
        </div>
      </nav>
    </div>
  )
}
