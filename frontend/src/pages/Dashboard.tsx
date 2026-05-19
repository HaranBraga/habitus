import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../lib/api'
import { ProgressBar } from '../components/ProgressBar'
import { Droplets, Dumbbell, BookOpen, Languages, Scale, Flame, Star, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type Props = { userId: string }

export function Dashboard({ userId }: Props) {
  const navigate = useNavigate()
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard', userId],
    queryFn: () => getDashboard(userId),
    refetchInterval: 60_000,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen">
      <Loader2 className="animate-spin text-primary" size={32} />
    </div>
  )

  if (error || !data) return (
    <div className="flex items-center justify-center h-screen text-red-500 text-sm">
      Erro ao carregar dados
    </div>
  )

  const { today, weight, gamification, settings, user } = data
  const waterPct = Math.min(100, Math.round((today.water.total / today.water.goal) * 100))
  const actPct = Math.min(100, Math.round((today.activity.total / settings.activityGoalMinutes) * 100))
  const readPct = Math.min(100, Math.round((today.reading.total / settings.readingGoalMinutes) * 100))
  const dayOfWeek = new Date().toLocaleDateString('pt-BR', { weekday: 'long' })
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })

  const habitCards = [
    {
      to: '/water',
      icon: <Droplets size={20} />,
      label: 'Água',
      value: `${today.water.total}ml`,
      goal: `${today.water.goal}ml`,
      pct: waterPct,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600',
      done: waterPct >= 100,
    },
    {
      to: '/activity',
      icon: <Dumbbell size={20} />,
      label: 'Atividade',
      value: `${today.activity.total}min`,
      goal: `${settings.activityGoalMinutes}min`,
      pct: actPct,
      color: 'bg-emerald-500',
      bgColor: 'bg-emerald-50',
      textColor: 'text-emerald-600',
      done: actPct >= 100,
    },
    {
      to: '/reading',
      icon: <BookOpen size={20} />,
      label: 'Leitura',
      value: `${today.reading.total}min`,
      goal: `${settings.readingGoalMinutes}min`,
      pct: readPct,
      color: 'bg-violet-500',
      bgColor: 'bg-violet-50',
      textColor: 'text-violet-600',
      done: readPct >= 100,
    },
    {
      to: '/english',
      icon: <Languages size={20} />,
      label: 'Inglês',
      value: today.english.studied ? 'Feito ✓' : 'Pendente',
      goal: 'Check diário',
      pct: today.english.studied ? 100 : 0,
      color: 'bg-amber-500',
      bgColor: 'bg-amber-50',
      textColor: 'text-amber-600',
      done: today.english.studied,
    },
  ]

  return (
    <div className="px-4 pt-12 pb-4 space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-gray-400 capitalize">{dayOfWeek}, {dateStr}</p>
        <h1 className="text-2xl font-bold text-gray-900">Olá, {user.name.split(' ')[0]}! 👋</h1>
      </div>

      {/* Gamification */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-orange-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
            <Flame className="text-orange-500" size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">{gamification.streak}</p>
            <p className="text-xs text-orange-400 font-medium">dias seguidos</p>
          </div>
        </div>
        <div className="bg-indigo-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
            <Star className="text-primary" size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{gamification.points}</p>
            <p className="text-xs text-indigo-400 font-medium">pontos hoje</p>
          </div>
        </div>
      </div>

      {/* Daily progress */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Progresso do dia</p>
          <p className="text-xs font-bold text-primary">{gamification.points}/100</p>
        </div>
        <ProgressBar value={gamification.points} max={100} color="bg-primary" />
      </div>

      {/* Habit cards */}
      <div className="grid grid-cols-2 gap-3">
        {habitCards.map((card) => (
          <button
            key={card.to}
            onClick={() => navigate(card.to)}
            className={`${card.bgColor} rounded-2xl p-4 text-left transition-transform active:scale-95 relative overflow-hidden`}
          >
            {card.done && (
              <div className="absolute top-2 right-2 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm">
                <span className="text-[10px]">✓</span>
              </div>
            )}
            <div className={`${card.textColor} mb-2`}>{card.icon}</div>
            <p className="font-bold text-gray-900 text-lg">{card.value}</p>
            <p className="text-xs text-gray-400 mb-2">meta: {card.goal}</p>
            <ProgressBar value={card.pct} max={100} color={card.color} />
          </button>
        ))}
      </div>

      {/* Weight */}
      <button
        onClick={() => navigate('/weight')}
        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
          weight.due ? 'bg-pink-50 border-pink-200' : 'bg-white border-gray-100 shadow-sm'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${weight.due ? 'bg-pink-100' : 'bg-gray-100'}`}>
            <Scale className={weight.due ? 'text-pink-500' : 'text-gray-500'} size={20} />
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900">
              {weight.latest ? `${weight.latest} kg` : 'Sem registro'}
            </p>
            <p className="text-xs text-gray-400">
              {weight.due ? '⚠️ Hora de pesar!' : `há ${weight.daysAgo} dia(s)`}
            </p>
          </div>
        </div>
        <span className="text-gray-300 text-lg">›</span>
      </button>
    </div>
  )
}
