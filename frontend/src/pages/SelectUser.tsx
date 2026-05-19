import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, type User } from '../lib/api'
import { UserCircle, Plus, Loader2 } from 'lucide-react'

type Props = { onSelect: (id: string) => void }

export function SelectUser({ onSelect }: Props) {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', height: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      onSelect(user.id)
    },
    onError: () => setError('Erro ao cadastrar. Verifique os dados.'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate({
      name: form.name,
      phone: form.phone,
      height: parseFloat(form.height),
    })
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-indigo-50 to-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-6xl mb-3">🌱</div>
          <h1 className="text-3xl font-bold text-gray-900">Habitus</h1>
          <p className="text-gray-500 mt-1 text-sm">Sua jornada para uma vida mais saudável</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center">
            <Loader2 className="animate-spin text-primary" size={28} />
          </div>
        ) : (
          <>
            {users && users.length > 0 && !showForm && (
              <div className="space-y-3 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Quem é você?</p>
                {users.map((u: User) => (
                  <button
                    key={u.id}
                    onClick={() => onSelect(u.id)}
                    className="w-full flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm hover:border-primary hover:shadow-md transition-all"
                  >
                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <UserCircle className="text-primary" size={24} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!showForm ? (
              <button
                onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-indigo-200 rounded-2xl text-primary font-medium hover:bg-indigo-50 transition-colors"
              >
                <Plus size={20} />
                Novo cadastro
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
                <h2 className="font-bold text-gray-900 text-lg">Novo participante</h2>
                {error && <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</label>
                  <input
                    type="text"
                    required
                    placeholder="Seu nome"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">WhatsApp</label>
                  <input
                    type="tel"
                    required
                    placeholder="11 99999-9999"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Altura (cm)</label>
                  <input
                    type="number"
                    required
                    placeholder="170"
                    min={100}
                    max={250}
                    value={form.height}
                    onChange={(e) => setForm((f) => ({ ...f, height: e.target.value }))}
                    className="mt-1 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-xl text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={mutation.isPending}
                    className="flex-1 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-primary-dark transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {mutation.isPending && <Loader2 size={16} className="animate-spin" />}
                    Entrar
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  )
}
