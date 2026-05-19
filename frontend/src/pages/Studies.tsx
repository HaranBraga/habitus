import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logReading, logEnglish } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { PageHeader } from '../components/PageHeader'
import { BookOpen, Languages, Plus, CheckCircle2, Circle, Loader2, Clock } from 'lucide-react'

type Props = { userId: string }
type Tab = 'reading' | 'english'

const READ_PRESETS = [10, 20, 30, 60]
const ENG_PRESETS = [5, 15, 30, 60]

export function StudiesPage({ userId }: Props) {
  const qc = useQueryClient()
  const [tab, setTab] = useState<Tab>('reading')
  const [readMin, setReadMin] = useState('')
  const [engMin, setEngMin] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
  })

  const readMutation = useMutation({
    mutationFn: (m: number) => logReading(userId, m),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dashboard', userId] }); setReadMin('') },
  })
  const engMutation = useMutation({
    mutationFn: (d: { studied: boolean; durationMinutes?: number }) => logEnglish(userId, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dashboard', userId] }); setEngMin('') },
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
  const engPts = english.studied
    ? 20 + Math.min(10, Math.floor((english.log?.durationMinutes ?? engGoal) / 5))
    : 0

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
        </div>
      )}

      {tab === 'english' && (
        <div className="space-y-4">
          <div className="rounded-3xl p-6 flex flex-col items-center text-center space-y-4"
            style={{ background: '#1c1c28', border: `1px solid ${english.studied ? '#f59e0b30' : '#2a2a3a'}` }}>
            {english.studied ? (
              <>
                <CheckCircle2 size={48} className="text-amber-400" strokeWidth={1.5} />
                <div>
                  <p className="font-bold text-white text-lg">Inglês concluído!</p>
                  <p className="text-amber-400 text-sm mt-0.5 font-semibold">+{engPts} pontos</p>
                  {english.log?.durationMinutes && (
                    <p className="text-gray-600 text-xs mt-1 flex items-center gap-1 justify-center">
                      <Clock size={11} /> {english.log.durationMinutes} min estudados
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <Circle size={48} className="text-gray-700" strokeWidth={1.5} />
                <div>
                  <p className="font-bold text-white">Estudou inglês hoje?</p>
                  <p className="text-gray-500 text-sm mt-0.5">Vale 20+ pontos</p>
                </div>
              </>
            )}
          </div>

          {!english.studied && (
            <>
              <div className="grid grid-cols-4 gap-2">
                {ENG_PRESETS.map(m => (
                  <button key={m} onClick={() => engMutation.mutate({ studied: true, durationMinutes: m })}
                    className="py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                    style={{ background: '#242434', color: '#f59e0b', border: '1px solid #f59e0b20' }}>
                    {m}min
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input type="number" placeholder="Minutos (opcional)" value={engMin}
                  onChange={e => setEngMin(e.target.value)} min={1}
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
                <button
                  onClick={() => engMutation.mutate({ studied: true, durationMinutes: parseInt(engMin) || undefined })}
                  disabled={engMutation.isPending}
                  className="px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
                  style={{ background: '#f59e0b', color: '#000' }}>
                  {engMutation.isPending ? <Loader2 size={15} className="animate-spin" /> : null}
                  Marcar feito
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
