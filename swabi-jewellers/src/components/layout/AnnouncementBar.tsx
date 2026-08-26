import { siteConfig } from '@/config/site'

export function AnnouncementBar() {
  return (
    <div className="bg-navy-700 text-ivory">
      <div className="container-luxe flex min-h-9 items-center justify-center py-2">
        <p className="text-center text-[9px] uppercase tracking-wideish sm:text-[11px] sm:tracking-luxe">
          {siteConfig.announcement}
        </p>
      </div>
    </div>
  )
}
