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
        <input type="date" max={today} value={value ? value.slice(0, 10) : today}
          onChange={e => onChange(e.target.value ? toAcreNoonIso(e.target.value) : null)}
          className="mt-2 w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2"
          style={{ background: '#1c2034', border: `1px solid ${accent}40` }} />
      )}
    </div>
  )
}
