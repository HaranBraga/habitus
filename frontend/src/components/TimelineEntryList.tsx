import { Trash2 } from 'lucide-react'
import { TimelineEntry } from '../lib/api'
import { TIMELINE_TYPE_META, timelineEntryTitle, timelineEntryColor } from '../lib/timelineDisplay'

type Props = {
  entries: TimelineEntry[]
  onDelete?: (entry: TimelineEntry) => void
  deletingKey?: string | null
}

export function TimelineEntryList({ entries, onDelete, deletingKey }: Props) {
  return (
    <div className="space-y-2">
      {entries.map(entry => {
        const { Icon, label } = TIMELINE_TYPE_META[entry.type]
        const color = timelineEntryColor(entry)
        const key = `${entry.type}-${entry.id}`
        return (
          <div key={key}
            className="flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: color + '20' }}>
              <Icon size={16} style={{ color }} strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-white text-sm truncate">{timelineEntryTitle(entry)}</p>
              <p className="text-[11px] text-gray-600">{label}</p>
            </div>
            <span className="text-xs text-gray-600 flex-shrink-0">
              {new Date(entry.loggedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
            {onDelete && (
              <button type="button" onClick={() => onDelete(entry)}
                disabled={deletingKey === key}
                className="text-gray-700 hover:text-red-400 transition-colors p-1 flex-shrink-0 disabled:opacity-40">
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
