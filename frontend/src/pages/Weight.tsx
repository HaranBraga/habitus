import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logWeight, getWeightHistory } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Plus, Loader2, TrendingDown, TrendingUp, Minus } from 'lucide-react'
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

  if (isLoading || !dash) return <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-pink-500" size={28} /></div>

  const { latest, daysAgo, due } = dash.weight
  const { height } = dash.user
  const bmi = latest ? (latest / Math.pow(height / 100, 2)).toFixed(1) : null

  const bmiCategory = bmi
    ? parseFloat(bmi) < 18.5 ? { label: 'Abaixo do peso', color: 'text-blue-500' }
    : parseFloat(bmi) < 25 ? { label: 'Peso normal', color: 'text-emerald-500' }
    : parseFloat(bmi) < 30 ? { label: 'Sobrepeso', color: 'text-amber-500' }
    : { label: 'Obesidade', color: 'text-red-500' }
    : null

  const lastTwo = history?.slice(0, 2)
  const trend = lastTwo && lastTwo.length === 2
    ? lastTwo[0].weight - lastTwo[1].weight
    : null

  return (
    <div className="px-4 pt-12 pb-6 space-y-6">
      <PageHeader title="Peso" subtitle="Acompanhamento de peso" icon="⚖️" />

      {/* Current weight */}
      <div className={`rounded-3xl p-6 text-center ${due ? 'bg-pink-50' : 'bg-white border border-gray-100 shadow-sm'}`}>
        {latest ? (
          <>
            <p className="text-5xl font-bold text-pink-600">{latest}<span className="text-2xl font-normal ml-1">kg</span></p>
            {bmi && bmiCategory && (
              <div className="mt-2">
                <p className="text-gray-500 text-sm">IMC: <span className={`font-bold ${bmiCategory.color}`}>{bmi} — {bmiCategory.label}</span></p>
              </div>
            )}
            {trend !== null && (
              <div className="flex items-center justify-center gap-1 mt-2">
                {trend < 0 ? <TrendingDown className="text-emerald-500" size={16} /> : trend > 0 ? <TrendingUp className="text-red-500" size={16} /> : <Minus className="text-gray-400" size={16} />}
                <span className={`text-sm font-medium ${trend < 0 ? 'text-emerald-500' : trend > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)} kg desde o último
                </span>
              </div>
            )}
            <p className="text-pink-400 mt-2 text-xs">registrado há {daysAgo} dia(s)</p>
            {due && <p className="text-pink-600 font-semibold mt-1 text-sm">⚠️ Hora de se pesar!</p>}
          </>
        ) : (
          <p className="text-gray-400">Nenhum registro ainda</p>
        )}
      </div>

      {/* Log weight */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="Peso atual (kg)"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          step="0.1"
          min={20}
          max={300}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300"
        />
        <button
          onClick={() => { const w = parseFloat(weight); if (w >= 20) mutation.mutate(w) }}
          disabled={mutation.isPending || !weight}
          className="bg-pink-500 text-white px-4 py-2.5 rounded-xl hover:bg-pink-600 active:scale-95 transition-all disabled:opacity-60"
        >
          <Plus size={20} />
        </button>
      </div>

      {/* History */}
      {history && history.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Histórico</p>
          <div className="space-y-2">
            {history.slice(0, 10).map((log, i) => (
              <div key={log.id} className="bg-white rounded-xl border border-gray-100 px-4 py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-gray-900">{log.weight} kg</p>
                  <p className="text-xs text-gray-400">
                    {new Date(log.loggedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </p>
                </div>
                {i < history.length - 1 && (
                  <span className={`text-sm font-medium ${
                    log.weight < history[i + 1].weight ? 'text-emerald-500' :
                    log.weight > history[i + 1].weight ? 'text-red-500' : 'text-gray-400'
                  }`}>
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
