const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const inrWhole = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export function formatINR(value) {
  return inr.format(value ?? 0)
}

export function formatINRWhole(value) {
  return inrWhole.format(value ?? 0)
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-GB')
}

export function formatMonth(date) {
  return new Date(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}
