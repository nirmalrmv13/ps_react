export const STATUS = {
  pending: { label: 'Pending', tone: 'pending' },
  confirmed: { label: 'Confirmed', tone: 'confirmed' },
  checked_in: { label: 'Checked-in', tone: 'checked-in' },
  in_service: { label: 'In service', tone: 'in-service' },
  completed: { label: 'Completed', tone: 'completed' },
  cancelled: { label: 'Cancelled', tone: 'cancelled' },
  no_show: { label: 'No-show', tone: 'cancelled' },
}

export const INACTIVE_STATUSES = ['cancelled', 'no_show']

const pad = (n) => String(n).padStart(2, '0')

export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function addDays(day, count) {
  const date = new Date(`${day}T00:00`)
  date.setDate(date.getDate() + count)
  return localDate(date)
}

export function toMinutes(clock) {
  const [hours, minutes] = clock.split(':').map(Number)
  return hours * 60 + minutes
}

export function toClock(minutes) {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}

export function formatClock(clock) {
  const minutes = typeof clock === 'number' ? clock : toMinutes(clock)
  const hours = Math.floor(minutes / 60)
  return `${hours % 12 || 12}:${pad(minutes % 60)} ${hours < 12 ? 'AM' : 'PM'}`
}

export function formatLongDate(day) {
  return new Date(`${day}T00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
