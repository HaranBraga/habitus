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
