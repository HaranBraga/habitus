import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDashboard, logWeight } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { Droplets, Dumbbell, BookOpen, Languages, Scale, Flame, Star, Loader2, X, TrendingUp } from 'lucide-react'
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dashboard', userId] }); onClose() },
  })
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}>
      <div className="w-full max-w-sm rounded-3xl p-6 space-y-4"
        style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-lg">Hora de pesar!</h3>
            <p className="text-gray-500 text-sm mt-0.5">Registre seu peso de hoje</p>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400 p-1">
            <X size={20} />
          </button>
        </div>
        <div className="flex gap-3">
          <input
            type="number"
            placeholder="Ex: 72.5"
            step="0.1"
            value={val}
            onChange={e => setVal(e.target.value)}
            className="flex-1 px-4 py-3 rounded-2xl text-white text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ background: '#242434', border: '1px solid #2a2a3a' }}
            autoFocus
          />
          <span className="flex items-center text-gray-500 font-medium">kg</span>
        </div>
        <button
          onClick={() => { const w = parseFloat(val); if (w >= 20) mutation.mutate(w) }}
          disabled={mutation.isPending || !val}
          className="w-full py-3 rounded-2xl font-bold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50 transition-all active:scale-95"
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
  const levelName = LEVEL_NAMES[level]
  const nextThreshold = LEVEL_THRESHOLDS[Math.min(level + 1, 5)]
  const prevThreshold = LEVEL_THRESHOLDS[level]
  const levelProgress = nextThreshold > prevThreshold
    ? ((totalPts - prevThreshold) / (nextThreshold - prevThreshold)) * 100
    : 100

  const dayName = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })

  const habitCards = [
    { to: '/water', label: 'Água', value: `${today.water.total}ml`, goal: today.water.goal,
      current: today.water.total, Icon: Droplets, color: 'bg-blue-500', accent: '#3b82f6',
      pct: Math.min(100, Math.round((today.water.total / today.water.goal) * 100)) },
    { to: '/activity', label: 'Atividade', value: `${today.activity.total}min`, goal: settings.activityGoalMinutes,
      current: today.activity.total, Icon: Dumbbell, color: 'bg-emerald-500', accent: '#10b981',
      pct: Math.min(100, Math.round((today.activity.total / settings.activityGoalMinutes) * 100)) },
    { to: '/studies', label: 'Leitura', value: `${today.reading.total}min`, goal: settings.readingGoalMinutes,
      current: today.reading.total, Icon: BookOpen, color: 'bg-violet-500', accent: '#8b5cf6',
      pct: Math.min(100, Math.round((today.reading.total / settings.readingGoalMinutes) * 100)) },
    { to: '/studies', label: 'Inglês', value: today.english.studied ? 'Feito' : 'Pendente',
      goal: 1, current: today.english.studied ? 1 : 0, Icon: Languages, color: 'bg-amber-500', accent: '#f59e0b',
      pct: today.english.studied ? 100 : 0 },
  ]

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      {showWeightModal && <WeightModal userId={userId} onClose={() => setShowWeightModal(false)} />}

      <div>
        <p className="text-xs text-gray-600 capitalize">{dayName}, {dateStr}</p>
        <h1 className="text-2xl font-bold text-white mt-0.5">Olá, {user.name.split(' ')[0]}</h1>
      </div>

      {/* Level + streak */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star size={16} className="text-primary" />
            <span className="text-sm font-semibold text-white">Nível {level} — {levelName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Flame size={14} className="text-orange-400" />
            <span className="text-sm font-bold text-orange-400">{gamification.streak}d</span>
          </div>
        </div>
        <ProgressBar value={levelProgress} max={100} color="bg-primary" height="h-2" />
        <div className="flex justify-between text-xs text-gray-600">
          <span>{totalPts} pts totais</span>
          <span>Hoje: {gamification.points} pts</span>
        </div>
      </div>

      {/* Habit cards */}
      <div className="grid grid-cols-2 gap-3">
        {habitCards.map((card) => (
          <button key={card.label} onClick={() => navigate(card.to)}
            className="rounded-2xl p-4 text-left transition-all active:scale-95 relative overflow-hidden"
            style={{ background: '#1c1c28', border: `1px solid ${card.pct >= 100 ? card.accent + '40' : '#2a2a3a'}` }}>
            {card.pct >= 100 && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: card.accent + '30' }}>
                <TrendingUp size={10} style={{ color: card.accent }} />
              </div>
            )}
            <card.Icon size={18} style={{ color: card.accent }} className="mb-2" strokeWidth={2} />
            <p className="font-bold text-white text-base leading-tight">{card.value}</p>
            <p className="text-xs text-gray-600 mb-2">meta: {card.goal}{typeof card.goal === 'number' && card.goal > 1 ? (card.label === 'Água' ? 'ml' : 'min') : ''}</p>
            <ProgressBar value={card.pct} max={100} color={card.color} />
          </button>
        ))}
      </div>

      {/* Weight card */}
      <button onClick={() => setShowWeightModal(true)}
        className="w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-95"
        style={{ background: '#1c1c28', border: `1px solid ${weight.due ? '#ec489940' : '#2a2a3a'}` }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: weight.due ? '#ec489920' : '#ffffff10' }}>
            <Scale size={18} style={{ color: weight.due ? '#ec4899' : '#6b7280' }} strokeWidth={2} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-white text-sm">
              {weight.latest ? `${weight.latest} kg` : 'Sem registro'}
            </p>
            <p className="text-xs text-gray-600">
              {weight.due ? 'Hora de pesar-se!' : `Registrado há ${weight.daysAgo}d`}
            </p>
          </div>
        </div>
        <span className="text-gray-700 text-xl">›</span>
      </button>
    </div>
  )
}
