import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logReading, logEnglish } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { PageHeader } from '../components/PageHeader'
import { RetroactiveDate } from '../components/RetroactiveDate'
import { SuccessToast } from '../components/SuccessToast'
import { BookOpen, Languages, Plus, Loader2 } from 'lucide-react'

type Props = { userId: string }
type Tab = 'reading' | 'english'

const READ_PRESETS = [10, 20, 30, 60]
const ENG_PRESETS = [10, 20, 30, 60]

export function StudiesPage({ userId }: Props) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('reading')
  const [readMin, setReadMin] = useState('')
  const [engMin, setEngMin] = useState('')
  const [readLoggedAt, setReadLoggedAt] = useState<string | null>(null)
  const [engLoggedAt, setEngLoggedAt] = useState<string | null>(null)
  const [readSuccessMsg, setReadSuccessMsg] = useState<string | null>(null)
  const [engSuccessMsg, setEngSuccessMsg] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
  })

  const readMutation = useMutation({
    mutationFn: (m: number) => logReading(userId, m, readLoggedAt ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setReadSuccessMsg(readLoggedAt
        ? `Registrado para ${new Date(readLoggedAt).toLocaleDateString('pt-BR')} com sucesso`
        : 'Registrado com sucesso')
      setReadMin(''); setReadLoggedAt(null)
      setTimeout(() => setReadSuccessMsg(null), 4000)
    },
  })
  const engMutation = useMutation({
    mutationFn: (m: number) => logEnglish(userId, m, engLoggedAt ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setEngSuccessMsg(engLoggedAt
        ? `Registrado para ${new Date(engLoggedAt).toLocaleDateString('pt-BR')} com sucesso`
        : 'Registrado com sucesso')
      setEngMin(''); setEngLoggedAt(null)
      setTimeout(() => setEngSuccessMsg(null), 4000)
    },
  })

  if (isLoading || !data) return (
    <div className="flex justify-center pt-20">
      <Loader2 className="animate-spin text-violet-500" size={28} />
    </div>
  )

  const { reading, english } = data.today
  const readGoal = data.settings.readingGoalMinutes
  const engGoal = data.settings.englishGoalMinutes
  const readPct = Math.min(100, Math.round((reading.total / readGoal) * 100))
  const engPct = Math.min(100, Math.round((english.total / engGoal) * 100))
  const engPts = Math.min(30, Math.round((english.total / engGoal) * 30))

  const tabs = [
    { key: 'reading' as Tab, label: 'Leitura', Icon: BookOpen, accent: '#8b5cf6' },
    { key: 'english' as Tab, label: 'Inglês', Icon: Languages, accent: '#f59e0b' },
  ]

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Estudos" subtitle="Leitura e inglês diários" Icon={BookOpen} iconColor="text-violet-400" />

      <div className="flex gap-2 p-1 rounded-2xl" style={{ background: '#1c1c28' }}>
        {tabs.map(({ key, label, Icon, accent }) => (
          <button key={key} onClick={() => setTab(key)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === key ? accent + '20' : 'transparent',
              color: tab === key ? accent : '#6b7280',
            }}>
            <Icon size={16} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'reading' && (
        <div className="space-y-4">
          <div className="rounded-3xl p-5 text-center space-y-3"
            style={{ background: '#1c1c28', border: '1px solid #8b5cf620' }}>
            <div className="text-4xl font-black text-white">{reading.total}
              <span className="text-xl font-normal text-gray-500 ml-1">min</span>
            </div>
            <p className="text-xs text-gray-600">meta: {readGoal} min</p>
            <ProgressBar value={reading.total} max={readGoal} color="bg-violet-500" height="h-2" />
            <p className="text-sm font-semibold text-violet-400">{readPct}% — {Math.min(15, Math.round((reading.total / readGoal) * 15))} pts</p>
          </div>

          {readSuccessMsg && <SuccessToast message={readSuccessMsg} />}

          <RetroactiveDate value={readLoggedAt} onChange={setReadLoggedAt} accent="#8b5cf6" />

          <div className="grid grid-cols-4 gap-2">
            {READ_PRESETS.map(m => (
              <button key={m} onClick={() => readMutation.mutate(m)}
                className="py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: '#242434', color: '#8b5cf6', border: '1px solid #8b5cf620' }}>
                +{m}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input type="number" placeholder="Personalizado (min)" value={readMin}
              onChange={e => setReadMin(e.target.value)} min={1}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-violet-500"
              style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
            <button onClick={() => { const m = parseInt(readMin); if (m >= 1) readMutation.mutate(m) }}
              disabled={!readMin || readMutation.isPending}
              className="px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-95"
              style={{ background: '#8b5cf6' }}>
              <Plus size={18} className="text-white" />
            </button>
          </div>

          {reading.logs.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-3 font-medium">Hoje</p>
              <div className="space-y-2">
                {[...reading.logs].reverse().map(log => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                    <span className="font-semibold text-white text-sm">{log.durationMinutes} min</span>
                    <span className="text-xs text-gray-600">
                      {new Date(log.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'english' && (
        <div className="space-y-4">
          <div className="rounded-3xl p-5 text-center space-y-3"
            style={{ background: '#1c1c28', border: '1px solid #f59e0b20' }}>
            <div className="text-4xl font-black text-white">{english.total}
              <span className="text-xl font-normal text-gray-500 ml-1">min</span>
            </div>
            <p className="text-xs text-gray-600">meta: {engGoal} min</p>
            <ProgressBar value={english.total} max={engGoal} color="bg-amber-500" height="h-2" />
            <p className="text-sm font-semibold text-amber-400">{engPct}% — {engPts} pts</p>
          </div>

          {engSuccessMsg && <SuccessToast message={engSuccessMsg} />}

          <RetroactiveDate value={engLoggedAt} onChange={setEngLoggedAt} accent="#f59e0b" />

          <div className="grid grid-cols-4 gap-2">
            {ENG_PRESETS.map(m => (
              <button key={m} onClick={() => engMutation.mutate(m)}
                className="py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: '#242434', color: '#f59e0b', border: '1px solid #f59e0b20' }}>
                +{m}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input type="number" placeholder="Personalizado (min)" value={engMin}
              onChange={e => setEngMin(e.target.value)} min={1}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
            <button onClick={() => { const m = parseInt(engMin); if (m >= 1) engMutation.mutate(m) }}
              disabled={!engMin || engMutation.isPending}
              className="px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-95"
              style={{ background: '#f59e0b' }}>
              <Plus size={18} className="text-black" />
            </button>
          </div>

          {english.logs.length > 0 && (
            <div>
              <p className="text-xs text-gray-600 uppercase tracking-wider mb-3 font-medium">Hoje</p>
              <div className="space-y-2">
                {[...english.logs].reverse().map(log => (
                  <div key={log.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                    style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                    <span className="font-semibold text-white text-sm">{log.durationMinutes} min</span>
                    <span className="text-xs text-gray-600">
                      {new Date(log.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
