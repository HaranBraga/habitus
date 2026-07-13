import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTimeline, getUsers, deleteTimelineEntry, TimelineEntry } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { TimelineEntryList } from '../components/TimelineEntryList'
import { TimelineQuickAdd } from '../components/TimelineQuickAdd'
import { TIMELINE_TYPE_META } from '../lib/timelineDisplay'
import { todayAcre } from '../lib/date'
import { History, ChevronLeft, ChevronRight, CalendarDays, Loader2 } from 'lucide-react'

type Props = { userId: string }

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00-05:00`)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export function TimelinePage({ userId }: Props) {
  const qc = useQueryClient()
  const [selectedUserId, setSelectedUserId] = useState(userId)
  const [date, setDate] = useState(todayAcre())
  const [deletingKey, setDeletingKey] = useState<string | null>(null)
  const today = todayAcre()
  const isOwnTimeline = selectedUserId === userId

  const { data: users } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const { data, isLoading } = useQuery({
    queryKey: ['timeline', selectedUserId, date],
    queryFn: () => getTimeline(selectedUserId, date),
  })

  function refreshAfterEdit() {
    qc.invalidateQueries({ queryKey: ['timeline', selectedUserId, date] })
    qc.invalidateQueries({ queryKey: ['dashboard', selectedUserId] })
    qc.invalidateQueries({ queryKey: ['weight-history', selectedUserId] })
    qc.invalidateQueries({ queryKey: ['ranking'] })
  }

  const deleteMutation = useMutation({
    mutationFn: deleteTimelineEntry,
    onMutate: (entry: TimelineEntry) => setDeletingKey(`${entry.type}-${entry.id}`),
    onSettled: () => setDeletingKey(null),
    onSuccess: refreshAfterEdit,
  })

  const dateLabel = new Date(`${date}T12:00:00-05:00`).toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })

  const totalsChips = data ? [
    { label: 'Água', value: `${data.totals.water}ml`, color: TIMELINE_TYPE_META.water.color },
    { label: 'Atividade', value: `${data.totals.activityMinutes}min`, color: TIMELINE_TYPE_META.activity.color },
    { label: 'Leitura', value: `${data.totals.readingMinutes}min`, color: TIMELINE_TYPE_META.reading.color },
    { label: 'Inglês', value: `${data.totals.englishMinutes}min`, color: TIMELINE_TYPE_META.english.color },
  ] : []

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Linha do Tempo" subtitle="Tudo que foi registrado, dia a dia" Icon={History} iconColor="text-primary" />

      {users && users.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {users.map(u => (
            <button key={u.id} onClick={() => setSelectedUserId(u.id)}
              className="flex-shrink-0 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: selectedUserId === u.id ? 'rgba(124,92,252,0.2)' : '#1c1c28',
                color: selectedUserId === u.id ? '#9d82fd' : '#6b7280',
                border: `1px solid ${selectedUserId === u.id ? '#7c5cfc40' : '#2a2a3a'}`,
              }}>
              {u.id === userId ? 'Você' : u.name}
            </button>
          ))}
        </div>
      )}

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

      {isOwnTimeline && (
        <TimelineQuickAdd userId={selectedUserId} date={date} onAdded={refreshAfterEdit} />
      )}

      {isLoading || !data ? (
        <div className="flex justify-center pt-10"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : data.entries.length === 0 ? (
        <div className="text-center pt-10 space-y-2">
          <History size={28} className="mx-auto text-gray-700" />
          <p className="text-sm text-gray-600">Nada registrado neste dia</p>
        </div>
      ) : (
        <TimelineEntryList entries={data.entries}
          onDelete={isOwnTimeline ? (entry => deleteMutation.mutate(entry)) : undefined}
          deletingKey={deletingKey} />
      )}
    </div>
  )
}
