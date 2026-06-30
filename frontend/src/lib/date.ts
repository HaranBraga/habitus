// Today's date (YYYY-MM-DD) in the Acre timezone, matching the backend's calendar so the
// retroactive date picker can't be set to "tomorrow" from the user's own local clock.
export function todayAcre(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Rio_Branco' }).format(new Date())
}

// Builds an ISO datetime for a retroactive entry. Uses noon Acre time so the exact log order
// within the day is irrelevant — only the calendar day matters for points and streaks.
export function toAcreNoonIso(dateStr: string): string {
  return `${dateStr}T12:00:00-05:00`
}
