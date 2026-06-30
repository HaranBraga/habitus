import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logWater, deleteWaterLog } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { PageHeader } from '../components/PageHeader'
import { RetroactiveDate } from '../components/RetroactiveDate'
import { SuccessToast } from '../components/SuccessToast'
import { Droplets, Plus, Trash2, Loader2 } from 'lucide-react'
import { useState } from 'react'

type Props = { userId: string }
const PRESETS = [150, 200, 300, 500]

export function WaterPage({ userId }: Props) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
  })
  const [custom, setCustom] = useState('')
  const [loggedAt, setLoggedAt] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const logMutation = useMutation({
    mutationFn: (ml: number) => logWater(userId, ml, loggedAt ?? undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setSuccessMsg(loggedAt
        ? `Registrado para ${new Date(loggedAt).toLocaleDateString('pt-BR')} com sucesso`
        : 'Registrado com sucesso')
      setLoggedAt(null)
      setTimeout(() => setSuccessMsg(null), 4000)
    },
  })
  const deleteMutation = useMutation({
    mutationFn: deleteWaterLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard', userId] }),
  })

  if (isLoading || !data) return (
    <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-blue-500" size={28} /></div>
  )

  const { total, goal, logs } = data.today.water
  const pct = Math.min(100, Math.round((total / goal) * 100))
  const pts = Math.min(30, Math.round((total / goal) * 30))

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Água" subtitle="Hidratação diária" Icon={Droplets} iconColor="text-blue-400" />

      <div className="rounded-3xl p-6 text-center space-y-3"
        style={{ background: '#1c1c28', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div className="text-5xl font-black text-white">
          {total}<span className="text-xl font-normal text-gray-500 ml-1">ml</span>
        </div>
        <p className="text-xs text-gray-600">meta: {goal}ml</p>
        <ProgressBar value={total} max={goal} color="bg-blue-500" height="h-2" />
        <div className="flex justify-between text-xs px-1">
          <span className="text-blue-400 font-semibold">{pct}%</span>
          <span className="text-gray-600">+{pts} pts</span>
        </div>
      </div>

      {successMsg && <SuccessToast message={successMsg} />}

      <RetroactiveDate value={loggedAt} onChange={setLoggedAt} accent="#3b82f6" />

      <div>
        <p className="text-xs text-gray-600 uppercase tracking-wider mb-3 font-medium">Registro rápido</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map(ml => (
            <button key={ml} onClick={() => logMutation.mutate(ml)}
              disabled={logMutation.isPending}
              className="py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95 disabled:opacity-50"
              style={{ background: '#1c2034', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)' }}>
              +{ml}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <input type="number" placeholder="Personalizado (ml)" value={custom}
          onChange={e => setCustom(e.target.value)} min={50} max={2000}
          className="flex-1 px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ background: '#1c2034', border: '1px solid rgba(59,130,246,0.2)' }} />
        <button onClick={() => { const ml = parseInt(custom); if (ml >= 50) { logMutation.mutate(ml); setCustom('') } }}
          disabled={logMutation.isPending || !custom}
          className="px-4 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-95"
          style={{ background: '#3b82f6' }}>
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {logs.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-3 font-medium">Hoje</p>
          <div className="space-y-2">
            {[...logs].reverse().map(log => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                <div className="flex items-center gap-3">
                  <Droplets size={16} className="text-blue-500" strokeWidth={2} />
                  <div>
                    <p className="font-semibold text-white text-sm">{log.amountMl} ml</p>
                    <p className="text-xs text-gray-600">
                      {new Date(log.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button onClick={() => deleteMutation.mutate(log.id)}
                  className="text-gray-700 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
