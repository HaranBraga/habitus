const TZ = 'America/Rio_Branco'

// Returns YYYY-MM-DD in Acre timezone regardless of server TZ
export function toLocalDateStr(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(date)
}

export function startOfDay(date: Date): Date {
  const ymd = toLocalDateStr(date)
  return new Date(`${ymd}T00:00:00-05:00`)
}

export function endOfDay(date: Date): Date {
  const ymd = toLocalDateStr(date)
  return new Date(`${ymd}T23:59:59.999-05:00`)
}

// Resolves an optional client-supplied loggedAt (used for retroactive entries) to a Date,
// rejecting anything after the current moment in Acre time. Returns null when invalid/future.
export function resolveLoggedAt(input: string | undefined): Date | null {
  if (!input) return new Date()
  const d = new Date(input)
  if (isNaN(d.getTime())) return null
  if (d.getTime() > endOfDay(new Date()).getTime()) return null
  return d
}
