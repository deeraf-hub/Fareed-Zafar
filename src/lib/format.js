export const formatPKR = (amount) =>
  `PKR ${amount.toLocaleString('en-PK', { maximumFractionDigits: 0 })}`

export const slugify = (text) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
