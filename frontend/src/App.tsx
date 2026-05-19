import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from './hooks/useUser'
import { Layout } from './components/Layout'
import { SelectUser } from './pages/SelectUser'
import { Dashboard } from './pages/Dashboard'
import { WaterPage } from './pages/Water'
import { ActivityPage } from './pages/Activity'
import { ReadingPage } from './pages/Reading'
import { EnglishPage } from './pages/English'
import { WeightPage } from './pages/Weight'
import { SettingsPage } from './pages/Settings'

export default function App() {
  const { userId, selectUser, logout } = useUser()

  if (!userId) {
    return <SelectUser onSelect={selectUser} />
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout userId={userId} onLogout={logout} />}>
          <Route path="/" element={<Dashboard userId={userId} />} />
          <Route path="/water" element={<WaterPage userId={userId} />} />
          <Route path="/activity" element={<ActivityPage userId={userId} />} />
          <Route path="/reading" element={<ReadingPage userId={userId} />} />
          <Route path="/english" element={<EnglishPage userId={userId} />} />
          <Route path="/weight" element={<WeightPage userId={userId} />} />
          <Route path="/settings" element={<SettingsPage userId={userId} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
