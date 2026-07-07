import { Droplets, Dumbbell, BookOpen, Languages, Scale, CheckSquare, LucideIcon } from 'lucide-react'
import type { TimelineEntry } from './api'

export const TIMELINE_TYPE_META: Record<TimelineEntry['type'], { label: string; color: string; Icon: LucideIcon }> = {
  water: { label: 'Água', color: '#3b82f6', Icon: Droplets },
  activity: { label: 'Atividade', color: '#10b981', Icon: Dumbbell },
  reading: { label: 'Leitura', color: '#8b5cf6', Icon: BookOpen },
  english: { label: 'Inglês', color: '#f59e0b', Icon: Languages },
  weight: { label: 'Peso', color: '#ec4899', Icon: Scale },
  groupTask: { label: 'Tarefa em grupo', color: '#7c5cfc', Icon: CheckSquare },
}

export function timelineEntryTitle(entry: TimelineEntry): string {
  switch (entry.type) {
    case 'water': return `${entry.amountMl} ml de água`
    case 'activity': return entry.description ? `${entry.durationMinutes} min — ${entry.description}` : `${entry.durationMinutes} min de atividade`
    case 'reading': return `${entry.durationMinutes} min de leitura`
    case 'english': return `${entry.durationMinutes ?? 0} min de inglês`
    case 'weight': return `${entry.weight} kg${entry.isOfficial ? ' · pesagem oficial' : ''}`
    case 'groupTask': return `${entry.title} · +${entry.pointValue}pts`
  }
}

export function timelineEntryColor(entry: TimelineEntry): string {
  return entry.type === 'groupTask' ? entry.color : TIMELINE_TYPE_META[entry.type].color
}
