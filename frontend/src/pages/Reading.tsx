import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logReading } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { PageHeader } from '../components/PageHeader'
import { Plus, Loader2 } from 'lucide-react'
import { useState } from 'react'

type Props = { userId: string }

const PRESETS = [10, 20, 30, 60]

export function ReadingPage({ userId }: Props) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
  })
  const [minutes, setMinutes] = useState('')

  const mutation = useMutation({
    mutationFn: (min: number) => logReading(userId, min),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setMinutes('')
    },
  })

  if (isLoading || !data) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-violet-500" size={28} /></div>

  const { total, goal, logs } = data.today.reading
  const pct = Math.min(100, Math.round((total / goal) * 100))

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <PageHeader title="Leitura" subtitle="Leitura diária" icon="📚" />

      <div className="bg-violet-50 rounded-3xl p-6 text-center">
        <p className="text-5xl font-bold text-violet-600">{total}<span className="text-2xl font-normal ml-1">min</span></p>
        <p className="text-violet-400 mt-1 text-sm">meta: {goal} min</p>
        <ProgressBar value={total} max={goal} color="bg-violet-500" className="mt-4" />
        <p className="text-violet-500 font-semibold mt-2">{pct}%</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Adicionar rápido</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((min) => (
            <button
              key={min}
              onClick={() => mutation.mutate(min)}
              disabled={mutation.isPending}
              className="bg-white border border-violet-100 text-violet-600 font-semibold py-3 rounded-xl hover:bg-violet-50 active:scale-95 transition-all text-sm shadow-sm disabled:opacity-60"
            >
              +{min}min
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Minutos lidos"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          min={1}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
        />
        <button
          onClick={() => { const m = parseInt(minutes); if (m >= 1) mutation.mutate(m) }}
          disabled={mutation.isPending || !minutes}
          className="bg-violet-500 text-white px-4 py-2.5 rounded-xl hover:bg-violet-600 active:scale-95 transition-all disabled:opacity-60"
        >
          <Plus size={20} />
        </button>
      </div>

      {logs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Hoje</p>
          <div className="space-y-2">
            {[...logs].reverse().map((log) => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex justify-between items-center">
                <p className="font-semibold text-gray-900">{log.durationMinutes} min</p>
                <p className="text-xs text-gray-400">
                  {new Date(log.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
