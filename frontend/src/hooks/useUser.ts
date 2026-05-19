import { useState, useEffect } from 'react'

const STORAGE_KEY = 'habitus_user_id'

export function useUser() {
  const [userId, setUserId] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))

  const selectUser = (id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    setUserId(id)
  }

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY)
    setUserId(null)
  }

  return { userId, selectUser, logout }
}
