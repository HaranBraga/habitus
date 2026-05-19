import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logActivity } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { PageHeader } from '../components/PageHeader'
import { Plus, Loader2 } from 'lucide-react'
import { useState } from 'react'

type Props = { userId: string }

const PRESETS = [15, 30, 45, 60]

export function ActivityPage({ userId }: Props) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
  })
  const [minutes, setMinutes] = useState('')
  const [description, setDescription] = useState('')

  const mutation = useMutation({
    mutationFn: (d: { durationMinutes: number; description?: string }) => logActivity(userId, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setMinutes('')
      setDescription('')
    },
  })

  if (isLoading || !data) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-emerald-500" size={28} /></div>

  const { total, goal, logs } = data.today.activity
  const pct = Math.min(100, Math.round((total / goal) * 100))

  const handlePreset = (min: number) => mutation.mutate({ durationMinutes: min })

  const handleCustom = () => {
    const min = parseInt(minutes)
    if (min >= 1) mutation.mutate({ durationMinutes: min, description: description || undefined })
  }

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <PageHeader title="Atividade" subtitle="Exercício físico diário" icon="🏃" />

      <div className="bg-emerald-50 rounded-3xl p-6 text-center">
        <p className="text-5xl font-bold text-emerald-600">{total}<span className="text-2xl font-normal ml-1">min</span></p>
        <p className="text-emerald-400 mt-1 text-sm">meta: {goal} min</p>
        <ProgressBar value={total} max={goal} color="bg-emerald-500" className="mt-4" />
        <p className="text-emerald-500 font-semibold mt-2">{pct}%</p>
      </div>

      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Adicionar rápido</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((min) => (
            <button
              key={min}
              onClick={() => handlePreset(min)}
              disabled={mutation.isPending}
              className="bg-white border border-emerald-100 text-emerald-600 font-semibold py-3 rounded-xl hover:bg-emerald-50 active:scale-95 transition-all text-sm shadow-sm disabled:opacity-60"
            >
              +{min}min
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="number"
          placeholder="Duração (min)"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          min={1}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <input
          type="text"
          placeholder="O que fez? (opcional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
        <button
          onClick={handleCustom}
          disabled={mutation.isPending || !minutes}
          className="w-full bg-emerald-500 text-white py-2.5 rounded-xl font-semibold hover:bg-emerald-600 active:scale-95 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          Registrar
        </button>
      </div>

      {logs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Hoje</p>
          <div className="space-y-2">
            {[...logs].reverse().map((log) => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-900">{log.durationMinutes} min</p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {log.description && <p className="text-sm text-gray-500 mt-0.5">{log.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
