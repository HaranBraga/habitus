import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getWeightOfficial, getWeightHistory, getWeightStatus, logWeight, type WeightLog } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { Scale, TrendingDown, TrendingUp, Minus, Plus, Loader2, Trophy, AlertCircle, CheckCircle2, Clock } from 'lucide-react'

type Props = { userId: string }

function DiffBadge({ current, prev }: { current: number; prev: number }) {
  const diff = current - prev
  if (Math.abs(diff) < 0.05) return <span className="text-gray-600 text-xs flex items-center gap-0.5"><Minus size={10} /> igual</span>
  const color = diff < 0 ? 'text-emerald-400' : 'text-red-400'
  const Icon = diff < 0 ? TrendingDown : TrendingUp
  return (
    <span className={`text-xs flex items-center gap-0.5 font-semibold ${color}`}>
      <Icon size={10} />
      {diff > 0 ? '+' : ''}{diff.toFixed(1)}kg
    </span>
  )
}

export function WeightEvolutionPage({ userId }: Props) {
  const qc = useQueryClient()
  const [weightVal, setWeightVal] = useState('')
  const [lastResult, setLastResult] = useState<{ isOfficial: boolean; points: number; reason: string } | null>(null)

  const { data: status, isLoading: loadingStatus } = useQuery({
    queryKey: ['weight-status', userId],
    queryFn: () => getWeightStatus(userId),
    refetchInterval: 60_000,
  })

  const { data: official } = useQuery({
    queryKey: ['weight-official', userId],
    queryFn: () => getWeightOfficial(userId),
  })

  const { data: history } = useQuery({
    queryKey: ['weight-history', userId],
    queryFn: () => getWeightHistory(userId),
  })

  const mutation = useMutation({
    mutationFn: (w: number) => logWeight(userId, w),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['weight-status', userId] })
      qc.invalidateQueries({ queryKey: ['weight-official', userId] })
      qc.invalidateQueries({ queryKey: ['weight-history', userId] })
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      setWeightVal('')
      if (res.isOfficial) {
        setLastResult({
          isOfficial: true,
          points: res.weightPoints?.points ?? 0,
          reason: res.weightPoints?.reason ?? '',
        })
      } else {
        setLastResult({ isOfficial: false, points: 0, reason: '' })
      }
    },
  })

  if (loadingStatus) return (
    <div className="flex justify-center pt-20"><Loader2 className="animate-spin text-pink-500" size={28} /></div>
  )

  const goal = status?.goal
  const latest = status?.latest
  const distToIdeal = latest && goal ? (latest - goal.ideal).toFixed(1) : null

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Evolução do Peso" subtitle="Histórico oficial e pontuação" Icon={Scale} iconColor="text-pink-400" />

      {/* Status card */}
      <div className="rounded-2xl p-4 space-y-3"
        style={{ background: '#1c1c28', border: `1px solid ${status?.due ? 'rgba(236,72,153,0.3)' : '#2a2a3a'}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-black text-white">{latest ? `${latest} kg` : '—'}</p>
            {distToIdeal && goal && (
              <p className="text-xs mt-0.5" style={{
                color: parseFloat(distToIdeal) === 0 ? '#10b981'
                  : Math.abs(parseFloat(distToIdeal)) < 2 ? '#f59e0b' : '#6b7280'
              }}>
                {parseFloat(distToIdeal) > 0 ? `+${distToIdeal}` : distToIdeal}kg do ideal ({goal.ideal}kg)
              </p>
            )}
          </div>
          <div className="text-right">
            {status?.due ? (
              <div className="flex items-center gap-1.5 text-pink-400">
                <AlertCircle size={14} />
                <span className="text-sm font-bold">Hora de pesar!</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-500">
                <Clock size={14} />
                <span className="text-sm">Próximo em {status?.daysUntilNext}d</span>
              </div>
            )}
            <p className="text-xs text-gray-600 mt-0.5">
              a cada {status?.intervalDays} dias (oficial)
            </p>
          </div>
        </div>

        {/* Personal goal vs system goal */}
        {(goal || status?.personalGoalKg) && (
          <div className="space-y-2">
            {status?.personalGoalKg && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500">Minha meta pessoal</span>
                <span className="font-bold text-pink-400">{status.personalGoalKg}kg</span>
              </div>
            )}
            {goal && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-600">Faixa IMC:</span>
                <span className="text-blue-400">{goal.min}</span>
                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: '#2a2a3a' }}>
                  {latest && (
                    <div className="h-full rounded-full transition-all"
                      style={{
                        background: latest >= goal.min && latest <= goal.max ? '#10b981' : '#f59e0b',
                        width: `${Math.min(100, Math.max(0, ((latest - goal.min) / (goal.max - goal.min)) * 100))}%`,
                      }} />
                  )}
                </div>
                <span className="text-red-400">{goal.max}</span>
                <span className="text-primary font-semibold">Ideal {goal.ideal}kg</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log weight */}
      <div className="space-y-2">
        <div className="flex gap-2">
          <input type="number" placeholder={status?.due ? 'Registrar peso oficial (kg)' : 'Registrar peso (kg)'}
            value={weightVal} step="0.1"
            onChange={e => setWeightVal(e.target.value)} min={20} max={300}
            className="flex-1 px-3 py-3 rounded-xl text-white text-base font-bold focus:outline-none focus:ring-2 focus:ring-pink-500"
            style={{ background: '#1c1c28', border: `1px solid ${status?.due ? 'rgba(236,72,153,0.4)' : '#2a2a3a'}` }} />
          <button onClick={() => { const w = parseFloat(weightVal); if (w >= 20) mutation.mutate(w) }}
            disabled={mutation.isPending || !weightVal}
            className="px-5 rounded-xl flex items-center justify-center disabled:opacity-50 transition-all active:scale-95"
            style={{ background: '#ec4899' }}>
            {mutation.isPending ? <Loader2 size={18} className="text-white animate-spin" /> : <Plus size={20} className="text-white" />}
          </button>
        </div>

        {lastResult !== null && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{
              background: lastResult.isOfficial ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${lastResult.isOfficial ? 'rgba(16,185,129,0.2)' : '#2a2a3a'}`,
            }}>
            {lastResult.isOfficial
              ? <CheckCircle2 size={15} className="text-emerald-400 flex-shrink-0" />
              : <Clock size={15} className="text-gray-600 flex-shrink-0" />}
            <span className="text-xs text-white">
              {lastResult.isOfficial
                ? `Peso oficial registrado! ${lastResult.reason} (+${lastResult.points}pts)`
                : 'Registrado (não oficial — aguarda o próximo ciclo para pontuar)'}
            </span>
          </div>
        )}

        {!status?.due && (
          <p className="text-xs text-gray-700 text-center">
            O peso não oficial não conta para pontos. Próximo oficial em {status?.daysUntilNext} dia(s).
          </p>
        )}
      </div>

      {/* Official history */}
      {official && official.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={13} className="text-amber-400" />
            <p className="text-xs text-gray-600 uppercase tracking-wider font-medium">Pesagens oficiais</p>
          </div>
          <div className="space-y-2">
            {official.map((log: WeightLog, i: number) => {
              const prev = official[i + 1]
              return (
                <div key={log.id} className="flex items-center gap-3 px-4 py-3 rounded-xl"
                  style={{ background: '#1c1c28', border: '1px solid rgba(236,72,153,0.15)' }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#ec4899' }} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{log.weight} kg</span>
                      {prev && <DiffBadge current={log.weight} prev={prev.weight} />}
                    </div>
                    <p className="text-xs text-gray-600">
                      {new Date(log.loggedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                  </div>
                  {goal && (
                    <span className="text-xs font-medium" style={{
                      color: log.weight >= goal.min && log.weight <= goal.max ? '#10b981' : '#f59e0b'
                    }}>
                      IMC {(log.weight / Math.pow(goal.ideal / 22, 2)).toFixed(1)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* All history (non-official) */}
      {history && history.filter(l => !l.isOfficial).length > 0 && (
        <div>
          <p className="text-xs text-gray-700 uppercase tracking-wider mb-3 font-medium">Registros não oficiais</p>
          <div className="space-y-1.5">
            {history.filter(l => !l.isOfficial).slice(0, 5).map((log: WeightLog) => (
              <div key={log.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid #2a2a3a' }}>
                <span className="text-gray-500 text-sm">{log.weight} kg</span>
                <span className="text-xs text-gray-700">
                  {new Date(log.loggedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
