import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logActivity } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { PageHeader } from '../components/PageHeader'
import { RetroactiveDate } from '../components/RetroactiveDate'
import { SuccessToast } from '../components/SuccessToast'
import { Dumbbell, Plus, Loader2 } from 'lucide-react'
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
  const [desc, setDesc] = useState('')
  const [loggedAt, setLoggedAt] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: (d: { durationMinutes: number; description?: string }) => logActivity(userId, { ...d, loggedAt: loggedAt ?? undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setSuccessMsg(loggedAt
        ? `Registrado para ${new Date(loggedAt).toLocaleDateString('pt-BR')} com sucesso`
        : 'Registrado com sucesso')
      setMinutes(''); setDesc(''); setLoggedAt(null)
      setTimeout(() => setSuccessMsg(null), 4000)
    },
  })

  if (isLoading || !data) return (
    <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-emerald-500" size={28} /></div>
  )

  const { total, goal, logs } = data.today.activity
  const pct = Math.min(100, Math.round((total / goal) * 100))
  const pts = Math.min(25, Math.round((total / goal) * 25))

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Atividade" subtitle="Exercício físico diário" Icon={Dumbbell} iconColor="text-emerald-400" />

      <div className="rounded-3xl p-6 text-center space-y-3"
        style={{ background: '#1c1c28', border: '1px solid rgba(16,185,129,0.2)' }}>
        <div className="text-5xl font-black text-white">
          {total}<span className="text-xl font-normal text-gray-500 ml-1">min</span>
        </div>
        <p className="text-xs text-gray-600">meta: {goal} min</p>
        <ProgressBar value={total} max={goal} color="bg-emerald-500" height="h-2" />
        <div className="flex justify-between text-xs px-1">
          <span className="text-emerald-400 font-semibold">{pct}%</span>
          <span className="text-gray-600">+{pts} pts</span>
        </div>
      </div>

      {successMsg && <SuccessToast message={successMsg} />}

      <RetroactiveDate value={loggedAt} onChange={setLoggedAt} accent="#10b981" />

      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map(min => (
          <button key={min} onClick={() => mutation.mutate({ durationMinutes: min })}
            disabled={mutation.isPending}
            className="py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
            style={{ background: '#1a2a24', color: '#10b981', border: '1px solid rgba(16,185,129,0.2)' }}>
            +{min}min
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <input type="number" placeholder="Duração (min)" value={minutes}
          onChange={e => setMinutes(e.target.value)} min={1}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          style={{ background: '#1a2a24', border: '1px solid rgba(16,185,129,0.2)' }} />
        <input type="text" placeholder="O que fez? (opcional)" value={desc}
          onChange={e => setDesc(e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          style={{ background: '#1a2a24', border: '1px solid rgba(16,185,129,0.2)' }} />
        <button onClick={() => { const m = parseInt(minutes); if (m >= 1) mutation.mutate({ durationMinutes: m, description: desc || undefined }) }}
          disabled={mutation.isPending || !minutes}
          className="w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          style={{ background: '#10b981', color: '#000' }}>
          {mutation.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
          Registrar
        </button>
      </div>

      {logs.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-3 font-medium">Hoje</p>
          <div className="space-y-2">
            {[...logs].reverse().map(log => (
              <div key={log.id} className="px-4 py-3 rounded-xl"
                style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                <div className="flex justify-between">
                  <span className="font-semibold text-white text-sm">{log.durationMinutes} min</span>
                  <span className="text-xs text-gray-600">
                    {new Date(log.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {log.description && <p className="text-xs text-gray-500 mt-0.5">{log.description}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
