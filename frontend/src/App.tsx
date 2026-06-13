import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useUser } from './hooks/useUser'
import { Layout } from './components/Layout'
import { SelectUser } from './pages/SelectUser'
import { Dashboard } from './pages/Dashboard'
import { WaterPage } from './pages/Water'
import { ActivityPage } from './pages/Activity'
import { StudiesPage } from './pages/Studies'
import { RankingPage } from './pages/Ranking'
import { MorePage } from './pages/More'
import { WeightPage } from './pages/Weight'
import { WeightEvolutionPage } from './pages/WeightEvolution'
import { OverviewPage } from './pages/Overview'
import { TasksPage } from './pages/Tasks'
import { SettingsPage } from './pages/Settings'
import { AnalysisPage } from './pages/Analysis'

export default function App() {
  const { userId, selectUser, logout } = useUser()

  if (!userId) return <SelectUser onSelect={selectUser} />

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout userId={userId} onLogout={logout} />}>
          <Route path="/" element={<Dashboard userId={userId} />} />
          <Route path="/water" element={<WaterPage userId={userId} />} />
          <Route path="/activity" element={<ActivityPage userId={userId} />} />
          <Route path="/studies" element={<StudiesPage userId={userId} />} />
          <Route path="/ranking" element={<RankingPage userId={userId} />} />
          <Route path="/more" element={<MorePage userId={userId} onLogout={logout} />} />
          <Route path="/weight" element={<WeightPage userId={userId} />} />
          <Route path="/weight-evolution" element={<WeightEvolutionPage userId={userId} />} />
          <Route path="/overview" element={<OverviewPage userId={userId} />} />
          <Route path="/tasks" element={<TasksPage userId={userId} />} />
          <Route path="/settings" element={<SettingsPage userId={userId} />} />
          <Route path="/analysis" element={<AnalysisPage userId={userId} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
