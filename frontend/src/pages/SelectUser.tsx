import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getUsers, createUser, type User } from '../lib/api'
import { UserRound, Plus, Loader2, Leaf } from 'lucide-react'
import axios from 'axios'

type Props = { onSelect: (id: string) => void }

export function SelectUser({ onSelect }: Props) {
  const qc = useQueryClient()
  const { data: users, isLoading } = useQuery({ queryKey: ['users'], queryFn: getUsers })
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', height: '', age: '' })
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: createUser,
    onSuccess: (user) => { qc.invalidateQueries({ queryKey: ['users'] }); onSelect(user.id) },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status
        if (status === 409) {
          setError('Este telefone já está cadastrado. Selecione seu nome acima.')
          setShowForm(false)
        } else if (status === 400) {
          setError('Dados inválidos. Verifique nome, telefone e altura.')
        } else if (!err.response) {
          setError('Servidor indisponível. Tente novamente em instantes.')
        } else {
          setError('Erro ao cadastrar. Tente novamente.')
        }
      } else {
        setError('Erro ao cadastrar. Tente novamente.')
      }
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate({ name: form.name, phone: form.phone, height: parseFloat(form.height), age: parseInt(form.age) })
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, #0d0d14 0%, #13101e 100%)' }}>
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(124,92,252,0.15)', border: '1px solid rgba(124,92,252,0.3)' }}>
            <Leaf size={32} className="text-primary" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-black text-white">Habitus</h1>
          <p className="text-gray-600 mt-1 text-sm">Construa hábitos que transformam</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary" size={24} /></div>
        ) : (
          <>
            {users && users.length > 0 && !showForm && (
              <div className="space-y-2">
                <p className="text-xs text-gray-600 uppercase tracking-wider font-medium">Quem é você?</p>
                {users.map((u: User) => (
                  <button key={u.id} onClick={() => onSelect(u.id)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl transition-all active:scale-95"
                    style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                    <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ background: 'rgba(124,92,252,0.15)' }}>
                      <UserRound size={20} className="text-primary" strokeWidth={1.75} />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-white">{u.name}</p>
                      <p className="text-xs text-gray-600">{u.phone}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {!showForm ? (
              <button onClick={() => setShowForm(true)}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-semibold text-primary transition-all active:scale-95"
                style={{ border: '2px dashed rgba(124,92,252,0.3)', background: 'rgba(124,92,252,0.05)' }}>
                <Plus size={18} /> Novo participante
              </button>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl p-5"
                style={{ background: '#1c1c28', border: '1px solid #2a2a3a' }}>
                <h2 className="font-bold text-white">Novo participante</h2>
                {error && (
                  <p className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>
                )}
                {[
                  { key: 'name', label: 'Nome', type: 'text', placeholder: 'Seu nome' },
                  { key: 'phone', label: 'WhatsApp', type: 'tel', placeholder: '11 99999-9999' },
                  { key: 'age', label: 'Idade (anos)', type: 'number', placeholder: '28' },
                  { key: 'height', label: 'Altura (cm)', type: 'number', placeholder: '170' },
                ].map(({ key, label, type, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs text-gray-600 font-medium">{label}</label>
                    <input type={type} required placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                      className="mt-1 w-full px-3 py-2.5 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      style={{ background: '#242434', border: '1px solid #2a2a3a' }} />
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-500"
                    style={{ border: '1px solid #2a2a3a' }}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={mutation.isPending}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 flex items-center justify-center gap-2"
                    style={{ background: '#7c5cfc' }}>
                    {mutation.isPending && <Loader2 size={14} className="animate-spin" />}
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
