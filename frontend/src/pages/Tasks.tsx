import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, createTask, completeTask, deleteTask, type CustomTask } from '../lib/api'
import { PageHeader } from '../components/PageHeader'
import { CheckSquare, Plus, Trash2, Loader2, Check, Star } from 'lucide-react'

type Props = { userId: string }

const COLORS = ['#7c5cfc', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#06b6d4', '#84cc16']
const POINT_OPTIONS = [5, 10, 15, 20, 25, 30, 50]

export function TasksPage({ userId }: Props) {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', pointValue: 10, color: '#7c5cfc' })

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', userId],
    queryFn: () => getTasks(userId),
  })

  const createMutation = useMutation({
    mutationFn: () => createTask(userId, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks', userId] }); setShowForm(false); setForm({ title: '', description: '', pointValue: 10, color: '#7c5cfc' }) },
  })

  const completeMutation = useMutation({
    mutationFn: completeTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', userId] }),
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks', userId] }),
  })

  const totalPossible = tasks?.reduce((s, t) => s + t.pointValue, 0) ?? 0
  const earnedToday = tasks?.filter(t => t.completedToday).reduce((s, t) => s + t.pointValue, 0) ?? 0

  return (
    <div className="px-4 pt-12 pb-4 space-y-5">
      <PageHeader title="Tarefas" subtitle="Hábitos personalizados" Icon={CheckSquare} iconColor="text-primary" />

      {earnedToday > 0 && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-2xl"
          style={{ background: 'rgba(124,92,252,0.1)', border: '1px solid rgba(124,92,252,0.2)' }}>
          <Star size={15} className="text-primary" />
          <span className="text-sm text-primary font-semibold">
            {earnedToday} de {totalPossible} pts possíveis hoje
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center pt-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
      ) : (
        <div className="space-y-2">
          {tasks?.map((task: CustomTask) => (
            <div key={task.id} className="flex items-center gap-3 p-4 rounded-2xl transition-all"
              style={{
                background: task.completedToday ? task.color + '15' : '#1c1c28',
                border: `1px solid ${task.completedToday ? task.color + '40' : '#2a2a3a'}`,
              }}>
              <button
                onClick={() => !task.completedToday && completeMutation.mutate(task.id)}
                disabled={task.completedToday || completeMutation.isPending}
                className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                style={{ background: task.completedToday ? task.color : task.color + '20' }}>
                {task.completedToday
                  ? <Check size={16} className="text-white" strokeWidth={2.5} />
                  : <div className="w-3 h-3 rounded-sm" style={{ border: `1.5px solid ${task.color}` }} />
                }
              </button>
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${task.completedToday ? 'line-through text-gray-500' : 'text-white'}`}>
                  {task.title}
                </p>
                {task.description && <p className="text-xs text-gray-600 truncate">{task.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold px-2 py-1 rounded-lg"
                  style={{ background: task.color + '20', color: task.color }}>
                  +{task.pointValue}
                </span>
                <button onClick={() => deleteMutation.mutate(task.id)}
                  className="text-gray-700 hover:text-red-400 transition-colors p-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {tasks?.length === 0 && !showForm && (
            <div className="text-center py-10 text-gray-600">
              <CheckSquare size={36} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">Nenhuma tarefa ainda</p>
              <p className="text-xs mt-1">Crie hábitos personalizados</p>
            </div>
          )}
        </div>
      )}

      {showForm ? (
        <div className="rounded-2xl p-4 space-y-4" style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
          <h3 className="font-bold text-white">Nova tarefa</h3>
          <input type="text" placeholder="Nome da tarefa" value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
          <input type="text" placeholder="Descrição (opcional)" value={form.description}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary"
            style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
          <div>
            <p className="text-xs text-gray-500 mb-2">Pontos</p>
            <div className="flex gap-2 flex-wrap">
              {POINT_OPTIONS.map(p => (
                <button key={p} onClick={() => setForm(f => ({ ...f, pointValue: p }))}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                  style={{
                    background: form.pointValue === p ? '#7c5cfc' : '#242434',
                    color: form.pointValue === p ? '#fff' : '#6b7280',
                  }}>{p}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-2">Cor</p>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                  className="w-7 h-7 rounded-lg transition-all"
                  style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: '2px' }} />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500 border border-gray-700">
              Cancelar
            </button>
            <button onClick={() => createMutation.mutate()}
              disabled={!form.title || createMutation.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 transition-all"
              style={{ background: form.color }}>
              {createMutation.isPending ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Criar'}
            </button>
          </div>
        </div>
      ) : (
        <button onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-semibold text-primary transition-all active:scale-95"
          style={{ border: '2px dashed rgba(124,92,252,0.3)', background: 'rgba(124,92,252,0.05)' }}>
          <Plus size={18} />
          Nova tarefa
        </button>
      )}
    </div>
  )
}
