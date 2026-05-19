import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logWater, deleteWaterLog } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { PageHeader } from '../components/PageHeader'
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

  const logMutation = useMutation({
    mutationFn: (ml: number) => logWater(userId, ml),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard', userId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteWaterLog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dashboard', userId] }),
  })

  if (isLoading || !data) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-water" size={28} /></div>

  const { total, goal, logs } = data.today.water
  const pct = Math.min(100, Math.round((total / goal) * 100))

  const handleCustom = () => {
    const ml = parseInt(custom)
    if (ml >= 50 && ml <= 2000) {
      logMutation.mutate(ml)
      setCustom('')
    }
  }

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <PageHeader title="Água" subtitle="Hidratação diária" icon="💧" />

      {/* Big progress */}
      <div className="bg-blue-50 rounded-3xl p-6 text-center">
        <p className="text-5xl font-bold text-blue-600">{total}<span className="text-2xl font-normal ml-1">ml</span></p>
        <p className="text-blue-400 mt-1 text-sm">meta: {goal}ml</p>
        <ProgressBar value={total} max={goal} color="bg-blue-500" className="mt-4" />
        <p className="text-blue-500 font-semibold mt-2">{pct}%</p>
      </div>

      {/* Quick add */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Adicionar rápido</p>
        <div className="grid grid-cols-4 gap-2">
          {PRESETS.map((ml) => (
            <button
              key={ml}
              onClick={() => logMutation.mutate(ml)}
              disabled={logMutation.isPending}
              className="bg-white border border-blue-100 text-blue-600 font-semibold py-3 rounded-xl hover:bg-blue-50 active:scale-95 transition-all text-sm shadow-sm disabled:opacity-60"
            >
              +{ml}
            </button>
          ))}
        </div>
      </div>

      {/* Custom */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Personalizado (ml)"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          min={50}
          max={2000}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
        />
        <button
          onClick={handleCustom}
          disabled={logMutation.isPending}
          className="bg-blue-500 text-white px-4 py-2.5 rounded-xl hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-60"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* Logs today */}
      {logs.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Hoje</p>
          <div className="space-y-2">
            {[...logs].reverse().map((log) => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Droplets className="text-blue-400" size={18} />
                  <div>
                    <p className="font-semibold text-gray-900">{log.amountMl} ml</p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => deleteMutation.mutate(log.id)}
                  className="text-gray-300 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
