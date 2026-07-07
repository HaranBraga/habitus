import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTimeline, TimelineEntry } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { todayAcre } from '../lib/date'
import {
  ScrollText, Droplets, Dumbbell, BookOpen, Languages, Scale, CheckSquare,
  ChevronLeft, ChevronRight, CalendarDays, Loader2, LucideIcon,
} from 'lucide-react'

type Props = { userId: string }

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00-05:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

const TYPE_META: Record<TimelineEntry['type'], { label: string; color: string; Icon: LucideIcon }> = {
  water: { label: 'Água', color: '#3b82f6', Icon: Droplets },
  activity: { label: 'Atividade', color: '#10b981', Icon: Dumbbell },
  reading: { label: 'Leitura', color: '#8b5cf6', Icon: BookOpen },
  english: { label: 'Inglês', color: '#f59e0b', Icon: Languages },
  weight: { label: 'Peso', color: '#ec4899', Icon: Scale },
  groupTask: { label: 'Tarefa em grupo', color: '#7c5cfc', Icon: CheckSquare },
}

function entryTitle(entry: TimelineEntry): string {
  switch (entry.type) {
    case 'water': return `${entry.amountMl} ml de água`
    case 'activity': return entry.description ? `${entry.durationMinutes} min — ${entry.description}` : `${entry.durationMinutes} min de atividade`
    case 'reading': return `${entry.durationMinutes} min de leitura`
    case 'english': return `${entry.durationMinutes ?? 0} min de inglês`
    case 'weight': return `${entry.weight} kg${entry.isOfficial ? ' · pesagem oficial' : ''}`
    case 'groupTask': return `${entry.title} · +${entry.pointValue}pts`
  }
}

export function ExtratoPage({ userId }: Props) {
  const [date, setDate] = useState(todayAcre())
  const today = todayAcre()

  const { data, isLoading } = useQuery({
    queryKey: ['timeline', userId, date],
    queryFn: () => getTimeline(userId, date),
  })

  const dateLabel = new Date(`${date}T12:00:00-05:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  const totalsChips = data ? [
    { label: 'Água', value: `${data.totals.water}ml`, color: TYPE_META.water.color },
    { label: 'Atividade', value: `${data.totals.activityMinutes}min`, color: TYPE_META.activity.color },
    { label: 'Leitura', value: `${data.totals.readingMinutes}min`, color: TYPE_META.reading.color },
    { label: 'Inglês', value: `${data.totals.englishMinutes}min`, color: TYPE_META.english.color },
  ] : []

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Extrato do Dia" subtitle="Tudo que você registrou, dia a dia" Icon={ScrollText} iconColor="text-primary" />

      <div className="flex items-center justify-between rounded-2xl px-2 py-2"
        style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
        <button onClick={() => setDate(d => shiftDate(d, -1))}
          className="p-2 rounded-xl text-gray-400 active:scale-95 transition-all">
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-sm font-semibold text-white capitalize">{dateLabel}</p>
          {date === today && <p className="text-[10px] text-gray-600 uppercase tracking-wider">Hoje</p>}
        </div>
        <button onClick={() => setDate(d => shiftDate(d, 1))}
          disabled={date >= today}
          className="p-2 rounded-xl text-gray-400 active:scale-95 transition-all disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="relative flex items-center justify-center gap-1.5 py-1 text-xs text-gray-600">
        <CalendarDays size={13} />
        <span>Escolher outra data</span>
        <input type="date" max={today} value={date}
          onChange={e => e.target.value && setDate(e.target.value)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
      </div>

      {data && data.entries.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {totalsChips.map(chip => (
            <div key={chip.label} className="flex-shrink-0 px-3 py-2 rounded-xl text-center min-w-[76px]"
              style={{ background: chip.color + '15', border: `1px solid ${chip.color}30` }}>
              <p className="text-sm font-bold" style={{ color: chip.color }}>{chip.value}</p>
              <p className="text-[10px] text-gray-600">{chip.label}</p>
            </div>
          ))}
        </div>
      )}

      {isLoading || !data ? (
        <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : data.entries.length === 0 ? (
        <div className="text-center pt-10 space-y-2">
          <ScrollText size={28} className="mx-auto text-gray-700" />
          <p className="text-sm text-gray-600">Nada registrado neste dia</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.entries.map(entry => {
            const { Icon, color } = TYPE_META[entry.type]
            const iconColor = entry.type === 'groupTask' ? entry.color : color
            return (
              <div key={`${entry.type}-${entry.id}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl"
                style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: iconColor + '20' }}>
                  <Icon size={16} style={{ color: iconColor }} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white text-sm truncate">{entryTitle(entry)}</p>
                  <p className="text-[11px] text-gray-600">{TYPE_META[entry.type].label}</p>
                </div>
                <span className="text-xs text-gray-600 flex-shrink-0">
                  {new Date(entry.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
