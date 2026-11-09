export function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatDate(value: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) {
  return new Intl.DateTimeFormat('es-AR', { timeZone: 'UTC', ...opts }).format(new Date(value))
}

export function formatCompact(value: number) {
  return new Intl.NumberFormat('es-AR', { notation: 'compact', maximumFractionDigits: 1 }).format(value)
}

export function timeAgo(iso: string, now = new Date('2026-10-23T22:00:00Z')) {
  const diff = Math.max(0, now.getTime() - new Date(iso).getTime())
  const minutes = Math.round(diff / 60000)
  if (minutes < 60) return `hace ${minutes || 1} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.round(hours / 24)} d`
}

export function initials(name: string) {
  return name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
}
