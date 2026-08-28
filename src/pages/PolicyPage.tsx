import { Navigate, useParams } from 'react-router-dom'
import { getPolicy } from '@/data/policies'
import { useSeo } from '@/lib/useSeo'

export function PolicyPage() {
  const { slug } = useParams<{ slug: string }>()
  const policy = slug ? getPolicy(slug) : undefined

  useSeo(policy?.title ?? 'Not Found')

  if (!policy) return <Navigate to="/" replace />

  return (
    <div className="container-lux max-w-2xl py-16 sm:py-24">
      <span className="eyebrow">Information</span>
      <h1 className="mt-3 text-3xl text-charcoal sm:text-4xl">{policy.title}</h1>
      <div className="mt-8 flex flex-col gap-4 leading-relaxed text-charcoal-soft">
        {policy.body.map((paragraph, i) => (
          <p key={i}>{paragraph}</p>
        ))}
      </div>
    </div>
  )
}
