import { Seo } from '@/components/Seo'
import { ButtonLink } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <>
      <Seo title="Page not found" noIndex />
      <section className="container-luxe flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 text-4xl">This page could not be found</h1>
        <p className="mt-4 max-w-sm text-sm text-stoneish">
          The link may be out of date, or the piece you are looking for has found a new home.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/shop">Shop the Collection</ButtonLink>
          <ButtonLink to="/" variant="outline">
            Back to Home
          </ButtonLink>
        </div>
      </section>
    </>
  )
}
