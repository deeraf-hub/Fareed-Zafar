import { siteConfig } from '@/config/site'

export function AnnouncementBar() {
  return (
    <div className="bg-charcoal text-ivory">
      <p className="container-lux py-2 text-center text-[11px] sm:text-xs uppercase tracking-widest2">
        {siteConfig.announcementText}
      </p>
    </div>
  )
}
