import { useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { todayAcre, toAcreNoonIso } from '../lib/date'

type Props = {
  value: string | null
  onChange: (loggedAt: string | null) => void
  accent: string
}

export function RetroactiveDate({ value, onChange, accent }: Props) {
  const [open, setOpen] = useState(false)
  const today = todayAcre()
  const selectedDate = value ? value.slice(0, 10) : today

  return (
    <div>
      <button type="button"
        onClick={() => { const next = !open; setOpen(next); if (!next) onChange(null) }}
        className="flex items-center gap-1.5 text-xs font-medium transition-colors"
        style={{ color: open ? accent : '#6b7280' }}>
        <CalendarClock size={13} />
        {value ? `Registrando para ${new Date(value).toLocaleDateString('pt-BR')}` : 'Registrar para outra data'}
      </button>
      {open && (
        // The visible box below is fully custom-rendered (never overflows). The real
        // <input type="date"> sits invisible on top, only used to open the OS picker —
        // its native internals (calendar icon, locale-width segments) can't be sized
        // reliably across browsers, so we never let them paint.
        <div className="relative mt-2 w-full rounded-xl overflow-hidden"
          style={{ background: '#1c2034', border: `1px solid ${accent}40` }}>
          <div className="flex items-center justify-between px-3 py-2.5 text-sm text-white pointer-events-none">
            <span>{new Date(selectedDate + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
            <CalendarClock size={14} style={{ color: accent }} />
          </div>
          <input type="date" max={today} value={selectedDate}
            onChange={e => onChange(e.target.value ? toAcreNoonIso(e.target.value) : null)}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        </div>
      )}
    </div>
  )
}
