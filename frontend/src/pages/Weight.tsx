import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logWeight, getWeightHistory, getWeightGoal } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Scale, Plus, Loader2, TrendingDown, TrendingUp, Minus, Target } from 'lucide-react'
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
  const { data: weightGoal } = useQuery({
    queryKey: ['weight-goal', userId],
    queryFn: () => getWeightGoal(userId),
  })
  const [weight, setWeight] = useState('')

  const mutation = useMutation({
    mutationFn: (w: number) => logWeight(userId, w),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      qc.invalidateQueries({ queryKey: ['weight-history', userId] })
      if (res.newWaterGoal) {
        // Dashboard will refresh with new water goal
        qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      }
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

  const diffToIdeal = latest && weightGoal ? (latest - weightGoal.ideal).toFixed(1) : null

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Peso" subtitle="Acompanhamento e meta" Icon={Scale} iconColor="text-pink-400" />

      {/* Current + BMI */}
      <div className="rounded-3xl p-6 space-y-3"
        style={{ background: '#1c1c28', border: `1px solid ${due ? 'rgba(236,72,153,0.3)' : '#2a2a3a'}` }}>
        <div className="text-center">
          {latest ? (
            <>
              <div className="text-5xl font-black text-white">
                {latest}<span className="text-xl font-normal text-gray-500 ml-1">kg</span>
              </div>
              {bmiInfo && <p className="text-sm mt-1" style={{ color: bmiInfo.color }}>IMC {bmi} — {bmiInfo.label}</p>}
              {trend !== null && (
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  {trend < 0 ? <TrendingDown size={13} className="text-emerald-400" />
                    : trend > 0 ? <TrendingUp size={13} className="text-red-400" />
                    : <Minus size={13} className="text-gray-500" />}
                  <span className="text-sm font-semibold"
                    style={{ color: trend < 0 ? '#10b981' : trend > 0 ? '#ef4444' : '#6b7280' }}>
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)} kg desde o último
                  </span>
                </div>
              )}
              {due && <p className="text-pink-400 text-sm font-semibold mt-1">Hora de pesar-se!</p>}
              <p className="text-xs text-gray-600 mt-1">registrado há {daysAgo}d</p>
            </>
          ) : <p className="text-gray-600 py-4">Nenhum registro ainda</p>}
        </div>
      </div>

      {/* Weight goal */}
      {weightGoal && (
        <div className="rounded-2xl p-4" style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
          <div className="flex items-center gap-2 mb-3">
            <Target size={14} className="text-primary" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Meta calculada pelo sistema</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="text-center">
              <p className="text-xs text-gray-600">Mínimo</p>
              <p className="font-bold text-white">{weightGoal.min}kg</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-primary font-medium">Ideal (IMC 22)</p>
              <p className="font-black text-primary text-xl">{weightGoal.ideal}kg</p>
              {diffToIdeal && (
                <p className="text-xs mt-0.5" style={{ color: parseFloat(diffToIdeal) > 0 ? '#f59e0b' : '#10b981' }}>
                  {parseFloat(diffToIdeal) > 0 ? `+${diffToIdeal}` : diffToIdeal}kg
                </p>
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600">Máximo</p>
              <p className="font-bold text-white">{weightGoal.max}kg</p>
            </div>
          </div>
          <p className="text-xs text-gray-700 text-center mt-2">Baseado na sua altura: {height}cm</p>
        </div>
      )}

      {/* Log weight */}
      <div className="flex gap-2">
        <input type="number" placeholder="Peso atual (kg)" value={weight} step="0.1"
          onChange={e => setWeight(e.target.value)} min={20} max={300}
          className="flex-1 px-3 py-3 rounded-xl text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-pink-500"
          style={{ background: '#1c1c28', border: '1px solid rgba(236,72,153,0.2)' }} />
        <button onClick={() => { const w = parseFloat(weight); if (w >= 20) mutation.mutate(w) }}
          disabled={mutation.isPending || !weight}
          className="px-5 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          style={{ background: '#ec4899' }}>
          {mutation.isPending ? <Loader2 size={16} className="animate-spin text-white" /> : <Plus size={20} className="text-white" />}
        </button>
      </div>

      {mutation.isSuccess && (
        <p className="text-xs text-emerald-400 text-center">
          Meta de água atualizada automaticamente para {Math.round(parseFloat(weight) * 35 / 100) * 100}ml/dia
        </p>
      )}

      {/* History */}
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
