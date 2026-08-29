const STYLES = {
  Popular: 'bg-navy-800 text-white',
  New: 'bg-accent-500 text-white',
  Sale: 'bg-red-600 text-white',
}

export default function Badge({ label }) {
  if (!label) return null
  return (
    <span
      className={`absolute left-3 top-3 z-10 rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wide shadow-sm ${
        STYLES[label] || 'bg-steel-700 text-white'
      }`}
    >
      {label}
    </span>
  )
}
