import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logWeight, getRankingDaily } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { Droplets, Dumbbell, BookOpen, Languages, Scale, Flame, Star, Loader2, X, TrendingUp, Trophy } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Props = { userId: string }

const LEVEL_NAMES = ['', 'Iniciante', 'Aprendiz', 'Comprometido', 'Consistente', 'Elite']
const LEVEL_THRESHOLDS = [0, 0, 500, 1500, 3000, 6000]

function getLevel(points: number) {
  for (let i = 5; i >= 1; i--) if (points >= LEVEL_THRESHOLDS[i]) return i
  return 1
}

function WeightModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [val, setVal] = useState('')
  const mutation = useMutation({
    mutationFn: (w: number) => logWeight(userId, w),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      if (res.newWaterGoal) {
        qc.invalidateQueries({ queryKey: ['dashboard', userId] })
      }
      onClose()
    },
  })
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}>
      <div className="w-full max-w-sm rounded-3xl p-6 space-y-4"
        style={{ background: '#1c1c28', border: '1px solid rgba(236,72,153,0.3)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">Hora de pesar!</h3>
            <p className="text-gray-500 text-xs mt-0.5">A meta de água será recalculada automaticamente</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 p-1">
            <X size={20} />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <input type="number" placeholder="Ex: 72.5" step="0.1" value={val}
            onChange={e => setVal(e.target.value)}
            className="flex-1 px-4 py-3 rounded-2xl text-white text-lg font-bold focus:outline-none focus:ring-2 focus:ring-pink-500"
            style={{ background: '#242434', border: '1px solid rgba(236,72,153,0.2)' }}
            autoFocus />
          <span className="text-gray-500 font-medium">kg</span>
        </div>
        <button onClick={() => { const w = parseFloat(val); if (w >= 20) mutation.mutate(w) }}
          disabled={mutation.isPending || !val}
          className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
          style={{ background: '#ec4899' }}>
          {mutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}
          Registrar peso
        </button>
      </div>
    </div>
  )
}

export function Dashboard({ userId }: Props) {
  const navigate = useNavigate()
  const [showWeightModal, setShowWeightModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
    refetchInterval: 60_000,
  })

  const { data: ranking } = useQuery({
    queryKey: ['ranking', 'daily'],
    queryFn: getRankingDaily,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (data?.weight.due) setShowWeightModal(true)
  }, [data?.weight.due])

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  )
  if (!data) return null

  const { today, weight, gamification, settings, user } = data
  const totalPts = gamification.streak * 50 + gamification.points
  const level = getLevel(totalPts)
  const nextThreshold = LEVEL_THRESHOLDS[Math.min(level + 1, 5)]
  const prevThreshold = LEVEL_THRESHOLDS[level]
  const levelProgress = nextThreshold > prevThreshold
    ? Math.min(100, ((totalPts - prevThreshold) / (nextThreshold - prevThreshold)) * 100) : 100

  const dayName = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })

  // Week dots (Mon–Sun) with today indicator and streak highlight
  const todayMid = new Date()
  todayMid.setHours(0, 0, 0, 0)
  const mondayOffset = (todayMid.getDay() + 6) % 7
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(todayMid)
    d.setDate(d.getDate() - mondayOffset + i)
    const diffDays = Math.round((todayMid.getTime() - d.getTime()) / 86400000)
    return {
      label: d.toLocaleDateString('pt-BR', { weekday: 'narrow' }),
      isToday: diffDays === 0,
      active: diffDays >= 0 && diffDays < gamification.streak,
    }
  })

  const habitCards = [
    { to: '/water', label: 'Água', value: `${today.water.total}ml`, goal: today.water.goal,
      current: today.water.total, Icon: Droplets, accent: '#3b82f6', barColor: 'bg-blue-500',
      pct: Math.min(100, Math.round((today.water.total / today.water.goal) * 100)) },
    { to: '/activity', label: 'Atividade', value: `${today.activity.total}min`, goal: settings.activityGoalMinutes,
      current: today.activity.total, Icon: Dumbbell, accent: '#10b981', barColor: 'bg-emerald-500',
      pct: Math.min(100, Math.round((today.activity.total / settings.activityGoalMinutes) * 100)) },
    { to: '/studies', label: 'Leitura', value: `${today.reading.total}min`, goal: settings.readingGoalMinutes,
      current: today.reading.total, Icon: BookOpen, accent: '#8b5cf6', barColor: 'bg-violet-500',
      pct: Math.min(100, Math.round((today.reading.total / settings.readingGoalMinutes) * 100)) },
    { to: '/studies', label: 'Inglês', value: `${today.english.total}min`, goal: today.english.goal,
      current: today.english.total, Icon: Languages, accent: '#f59e0b', barColor: 'bg-amber-500',
      pct: Math.min(100, Math.round((today.english.total / today.english.goal) * 100)) },
  ]

  // Mini ranking data
  const myRanking = ranking?.find(r => r.userId === userId)
  const opponent = ranking?.find(r => r.userId !== userId)
  const myPts = myRanking?.todayPoints ?? 0
  const oppPts = opponent?.todayPoints ?? 0
  const isWinning = myPts >= oppPts

  return (
    <div className="px-4 pt-12 pb-4 space-y-4">
      {showWeightModal && <WeightModal userId={userId} onClose={() => setShowWeightModal(false)} />}

      <div>
        <p className="text-xs text-gray-600 capitalize">{dayName}, {dateStr}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Olá, {user.name.split(' ')[0]}</h1>
      </div>

      {/* Level + streak */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={14} className="text-primary" />
            <span className="text-xs font-semibold text-white">Nv.{level} — {LEVEL_NAMES[level]}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={13} className="text-orange-400" />
            <span className="text-sm font-black text-orange-400">{gamification.streak}</span>
            <span className="text-xs text-gray-600">dias</span>
            <span className="text-gray-700 mx-1">·</span>
            <Star size={13} className="text-primary" />
            <span className="text-sm font-black text-primary">{gamification.points}</span>
            <span className="text-xs text-gray-600">hoje</span>
          </div>
        </div>
        <ProgressBar value={levelProgress} max={100} color="bg-primary" height="h-1.5" />
        {/* 7-day dots */}
        <div className="flex items-center justify-between pt-1">
          {weekDays.map((d, i) => (
            <div key={i} className="flex flex-col items-center gap-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                d.active ? 'bg-primary' : d.isToday ? 'border border-gray-700' : ''
              }`} style={d.active && d.isToday ? { boxShadow: '0 0 8px rgba(124,92,252,0.5)' } : {}}>
                {d.active && <div className="w-2 h-2 rounded-full bg-white opacity-80" />}
              </div>
              <span className="text-[9px] text-gray-700">{d.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Habit cards 2×2 */}
      <div className="grid grid-cols-2 gap-3">
        {habitCards.map(card => (
          <button key={card.label} onClick={() => navigate(card.to)}
            className="rounded-2xl p-4 text-left transition-all active:scale-95"
            style={{
              background: '#1c1c28',
              border: `1px solid ${card.pct >= 100 ? card.accent + '35' : '#2a2a3a'}`,
            }}>
            <div className="flex items-center justify-between mb-2">
              <card.Icon size={16} style={{ color: card.accent }} strokeWidth={2} />
              {card.pct >= 100 && <TrendingUp size={12} style={{ color: card.accent }} />}
            </div>
            <p className="font-bold text-white text-base leading-tight">{card.value}</p>
            <p className="text-xs text-gray-600 mb-2">/ {card.goal}{card.label === 'Água' ? 'ml' : 'min'}</p>
            <ProgressBar value={card.pct} max={100} color={card.barColor} height="h-1" />
          </button>
        ))}
      </div>

      {/* Mini ranking widget */}
      {ranking && ranking.length >= 2 && (
        <button onClick={() => navigate('/ranking')}
          className="w-full rounded-2xl p-4 space-y-3 transition-all active:scale-95"
          style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-amber-400" />
              <span className="text-xs font-semibold text-gray-400">Ranking de hoje</span>
            </div>
            <span className="text-xs text-primary">{isWinning && myPts > oppPts ? 'Você está na frente!' : oppPts > myPts ? `${opponent?.name} está na frente` : 'Empatados!'}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 text-left">
              <p className="text-xs text-gray-600">{myRanking?.name ?? user.name}</p>
              <p className="font-black text-primary text-xl">{myPts}</p>
            </div>
            <span className="text-gray-700 font-bold text-lg">vs</span>
            <div className="flex-1 text-right">
              <p className="text-xs text-gray-600">{opponent?.name}</p>
              <p className="font-black text-pink-400 text-xl">{oppPts}</p>
            </div>
          </div>
          <div className="flex gap-1 h-2">
            {(myPts + oppPts) > 0 ? (
              <>
                <div className="rounded-l-full bg-primary h-full transition-all"
                  style={{ width: `${(myPts / (myPts + oppPts)) * 100}%` }} />
                <div className="rounded-r-full h-full transition-all" style={{ background: '#ec4899', width: `${(oppPts / (myPts + oppPts)) * 100}%` }} />
              </>
            ) : <div className="w-full rounded-full" style={{ background: '#2a2a3a' }} />}
          </div>
        </button>
      )}

      {/* Weight card */}
      <button onClick={() => setShowWeightModal(true)}
        className="w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-95"
        style={{ background: '#1c1c28', border: `1px solid ${weight.due ? 'rgba(236,72,153,0.3)' : '#2a2a3a'}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: weight.due ? 'rgba(236,72,153,0.15)' : '#ffffff08' }}>
            <Scale size={17} style={{ color: weight.due ? '#ec4899' : '#4b5563' }} strokeWidth={2} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-white text-sm">
              {weight.latest ? `${weight.latest} kg` : 'Sem registro'}
            </p>
            <p className="text-xs text-gray-600">
              {weight.due ? 'Hora de se pesar!' : `Registrado há ${weight.daysAgo}d`}
            </p>
          </div>
        </div>
        <span className="text-gray-700 text-xl">›</span>
      </button>
    </div>
  )
}
