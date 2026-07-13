import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Plus, Loader2 } from 'lucide-react'
import { logWater, logActivity, logReading, logEnglish, logWeight, TimelineEntry } from '../lib/api'
import { toAcreNoonIso, todayAcre } from '../lib/date'
import { TIMELINE_TYPE_META } from '../lib/timelineDisplay'
import { SuccessToast } from './SuccessToast'

type EntryType = Exclude<TimelineEntry['type'], 'groupTask'>

const TYPES: EntryType[] = ['water', 'activity', 'reading', 'english', 'weight']

const PRESETS: Record<EntryType, number[]> = {
  water: [150, 200, 300, 500],
  activity: [15, 30, 45, 60],
  reading: [10, 20, 30, 60],
  english: [10, 20, 30, 60],
  weight: [],
}

const UNIT: Record<EntryType, string> = {
  water: 'ml', activity: 'min', reading: 'min', english: 'min', weight: 'kg',
}

type Props = { userId: string; date: string; onAdded: () => void }

export function TimelineQuickAdd({ userId, date, onAdded }: Props) {
  const [open, setOpen] = useState<EntryType | null>(null)
  const [value, setValue] = useState('')
  const [desc, setDesc] = useState('')
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const loggedAt = date === todayAcre() ? undefined : toAcreNoonIso(date)

  const mutation = useMutation({
    mutationFn: ({ type, n }: { type: EntryType; n: number }) => {
      if (type === 'water') return logWater(userId, n, loggedAt)
      if (type === 'activity') return logActivity(userId, { durationMinutes: n, description: desc || undefined, loggedAt })
      if (type === 'reading') return logReading(userId, n, loggedAt)
      if (type === 'english') return logEnglish(userId, n, loggedAt)
      return logWeight(userId, n, loggedAt)
    },
    onSuccess: () => {
      setValue(''); setDesc(''); setOpen(null)
      setSuccessMsg('Registrado com sucesso')
      setTimeout(() => setSuccessMsg(null), 3000)
      onAdded()
    },
  })

  function submitCustom() {
    if (!open) return
    const n = parseFloat(value)
    if (!(n > 0)) return
    mutation.mutate({ type: open, n })
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPES.map(t => {
          const meta = TIMELINE_TYPE_META[t]
          const active = open === t
          return (
            <button key={t} type="button"
              onClick={() => { setOpen(active ? null : t); setValue(''); setDesc('') }}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: active ? meta.color + '25' : '#1c1c28',
                color: active ? meta.color : '#6b7280',
                border: `1px solid ${active ? meta.color + '50' : '#2a2a3a'}`,
              }}>
              <meta.Icon size={13} />
              {meta.label}
            </button>
          )
        })}
      </div>

      {successMsg && <SuccessToast message={successMsg} />}

      {open && (
        <div className="rounded-2xl p-3 space-y-2.5"
          style={{ background: '#1c1c28', border: `1px solid ${TIMELINE_TYPE_META[open].color}40` }}>
          {PRESETS[open].length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {PRESETS[open].map(p => (
                <button key={p} type="button"
                  onClick={() => mutation.mutate({ type: open, n: p })}
                  disabled={mutation.isPending}
                  className="py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
                  style={{ background: TIMELINE_TYPE_META[open].color + '15', color: TIMELINE_TYPE_META[open].color, border: `1px solid ${TIMELINE_TYPE_META[open].color}30` }}>
                  +{p}
                </button>
              ))}
            </div>
          )}

          {open === 'activity' && (
            <input type="text" placeholder="O que fez? (opcional)" value={desc}
              onChange={e => setDesc(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none"
              style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
          )}

          <div className="flex gap-2">
            <input type="number" step={open === 'weight' ? 0.1 : 1}
              placeholder={open === 'weight' ? 'Peso (kg)' : `Personalizado (${UNIT[open]})`}
              value={value} onChange={e => setValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitCustom() }}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none"
              style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
            <button type="button" onClick={submitCustom}
              disabled={mutation.isPending || !value}
              className="px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-95"
              style={{ background: TIMELINE_TYPE_META[open].color }}>
              {mutation.isPending ? <Loader2 size={18} className="animate-spin text-white" /> : <Plus size={18} className="text-white" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
