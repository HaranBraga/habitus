import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logWeight, getWeightHistory } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Scale, Plus, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
import { useState } from 'react'

type Props = { userId: string }

export function WeightPage({ userId }: Props) {
  const qc = useQueryClient()
  const { data: dash, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
  })
  const { data: history } = useQuery({
    queryKey: ['weight-history', userId],
    queryFn: () => getWeightHistory(userId),
  })
  const [weight, setWeight] = useState('')

  const mutation = useMutation({
    mutationFn: (w: number) => logWeight(userId, w),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      qc.invalidateQueries({ queryKey: ['weight-history', userId] })
      setWeight('')
    },
  })

  if (isLoading || !dash) return (
    <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-pink-500" size={28} /></div>
  )

  const { latest, daysAgo, due } = dash.weight
  const { height } = dash.user
  const bmi = latest ? (latest / Math.pow(height / 100, 2)).toFixed(1) : null
  const bmiInfo = bmi ? parseFloat(bmi) < 18.5 ? { label: 'Abaixo do peso', color: '#3b82f6' }
    : parseFloat(bmi) < 25 ? { label: 'Peso normal', color: '#10b981' }
    : parseFloat(bmi) < 30 ? { label: 'Sobrepeso', color: '#f59e0b' }
    : { label: 'Obesidade', color: '#ef4444' } : null

  const lastTwo = history?.slice(0, 2)
  const trend = lastTwo?.length === 2 ? lastTwo[0].weight - lastTwo[1].weight : null

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Peso" subtitle="Acompanhamento de peso" Icon={Scale} iconColor="text-pink-400" />

      <div className="rounded-3xl p-6 text-center space-y-2"
        style={{ background: '#1c1c28', border: `1px solid ${due ? 'rgba(236,72,153,0.3)' : '#2a2a3a'}` }}>
        {latest ? (
          <>
            <div className="text-5xl font-black text-white">
              {latest}<span className="text-xl font-normal text-gray-500 ml-1">kg</span>
            </div>
            {bmiInfo && <p className="text-sm" style={{ color: bmiInfo.color }}>IMC {bmi} — {bmiInfo.label}</p>}
            {trend !== null && (
              <div className="flex items-center justify-center gap-1.5">
                {trend < 0
                  ? <TrendingDown size={14} className="text-emerald-400" />
                  : trend > 0 ? <TrendingUp size={14} className="text-red-400" />
                  : <Minus size={14} className="text-gray-500" />}
                <span className="text-sm font-semibold"
                  style={{ color: trend < 0 ? '#10b981' : trend > 0 ? '#ef4444' : '#6b7280' }}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)} kg
                </span>
              </div>
            )}
            {due && <p className="text-pink-400 text-sm font-semibold">Hora de pesar-se!</p>}
            <p className="text-xs text-gray-600">registrado há {daysAgo}d</p>
          </>
        ) : <p className="text-gray-600">Nenhum registro ainda</p>}
      </div>

      <div className="flex gap-2">
        <input type="number" placeholder="Peso (kg)" value={weight} step="0.1"
          onChange={e => setWeight(e.target.value)} min={20} max={300}
          className="flex-1 px-3 py-3 rounded-xl text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-pink-500"
          style={{ background: '#1c1c28', border: '1px solid rgba(236,72,153,0.2)' }} />
        <button onClick={() => { const w = parseFloat(weight); if (w >= 20) mutation.mutate(w) }}
          disabled={mutation.isPending || !weight}
          className="px-5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          style={{ background: '#ec4899' }}>
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {history && history.length > 0 && (
        <div>
          <p className="text-xs text-gray-600 uppercase tracking-wider mb-3 font-medium">Histórico</p>
          <div className="space-y-2">
            {history.slice(0, 10).map((log, i) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                <div>
                  <p className="font-semibold text-white text-sm">{log.weight} kg</p>
                  <p className="text-xs text-gray-600">
                    {new Date(log.loggedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </p>
                </div>
                {i < history.length - 1 && (
                  <span className="text-sm font-bold"
                    style={{ color: log.weight < history[i + 1].weight ? '#10b981' : log.weight > history[i + 1].weight ? '#ef4444' : '#6b7280' }}>
                    {log.weight < history[i + 1].weight ? '↓' : log.weight > history[i + 1].weight ? '↑' : '→'}
                    {Math.abs(log.weight - history[i + 1].weight).toFixed(1)}kg
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
