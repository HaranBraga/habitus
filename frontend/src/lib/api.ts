import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

export type User = {
  id: string; name: string; phone: string; height: number; createdAt: string
  settings: UserSettings | null
}
export type UserSettings = {
  waterGoalMl: number; waterReminderIntervalHours: number
  weightCheckIntervalDays: number; activityGoalMinutes: number
  readingGoalMinutes: number; englishGoalMinutes: number
}
export type DashboardData = {
  user: { id: string; name: string; height: number }
  settings: UserSettings
  today: {
    water: { total: number; goal: number; logs: { id: string; amountMl: number; loggedAt: string }[] }
    activity: { total: number; goal: number; logs: { id: string; durationMinutes: number; description?: string; loggedAt: string }[] }
    reading: { total: number; goal: number; logs: { id: string; durationMinutes: number; loggedAt: string }[] }
    english: { studied: boolean; log: { id: string; durationMinutes?: number } | null }
  }
  weight: { latest: number | null; loggedAt: string | null; due: boolean; daysAgo: number | null }
  gamification: { streak: number; points: number }
}
export type RankingUser = {
  userId: string; name: string; todayPoints: number; streak: number
  level: number; levelName: string; totalPoints: number
  today: {
    water: { total: number; goal: number }
    activity: { total: number; goal: number }
    reading: { total: number; goal: number }
    english: { studied: boolean; minutes: number }
    customTasksCompleted: number; customTasksTotal: number
  }
  weekWaterAvg: number; latestWeight: number | null
}
export type CustomTask = {
  id: string; userId: string; title: string; description?: string
  pointValue: number; color: string; icon: string; active: boolean
  completedToday?: boolean
}

// Users
export const getUsers = () => api.get<User[]>('/users').then(r => r.data)
export const createUser = (d: { name: string; phone: string; height: number }) =>
  api.post<User>('/users', d).then(r => r.data)

// Dashboard
export const getDashboard = (userId: string) =>
  api.get<DashboardData>(`/dashboard/${userId}`).then(r => r.data)

// Water
export const logWater = (userId: string, amountMl: number) =>
  api.post(`/water/${userId}`, { amountMl }).then(r => r.data)
export const deleteWaterLog = (logId: string) => api.delete(`/water/${logId}`)

// Weight
export const logWeight = (userId: string, weight: number) =>
  api.post(`/weight/${userId}`, { weight }).then(r => r.data)
export const getWeightHistory = (userId: string) =>
  api.get<{ id: string; weight: number; loggedAt: string }[]>(`/weight/${userId}/history`).then(r => r.data)

// Activity
export const logActivity = (userId: string, d: { durationMinutes: number; description?: string }) =>
  api.post(`/activity/${userId}`, d).then(r => r.data)

// Reading
export const logReading = (userId: string, durationMinutes: number) =>
  api.post(`/reading/${userId}`, { durationMinutes }).then(r => r.data)

// English
export const logEnglish = (userId: string, d: { studied: boolean; durationMinutes?: number }) =>
  api.post(`/english/${userId}`, d).then(r => r.data)

// Settings
export const updateSettings = (userId: string, d: Partial<UserSettings>) =>
  api.put(`/settings/${userId}`, d).then(r => r.data)

// Tasks
export const getTasks = (userId: string) =>
  api.get<CustomTask[]>(`/tasks/${userId}/today`).then(r => r.data)
export const createTask = (userId: string, d: Partial<CustomTask>) =>
  api.post<CustomTask>(`/tasks/${userId}`, d).then(r => r.data)
export const completeTask = (taskId: string) =>
  api.post(`/tasks/${taskId}/log`).then(r => r.data)
export const deleteTask = (taskId: string) =>
  api.delete(`/tasks/${taskId}`)
export const updateTask = (taskId: string, d: Partial<CustomTask>) =>
  api.put(`/tasks/${taskId}`, d).then(r => r.data)

// Ranking
export const getRanking = () => api.get<RankingUser[]>('/ranking').then(r => r.data)

// Analysis
export const getAnalysis = (userId: string) =>
  api.get<{ analysis: string; data: Record<string, unknown> }>(`/analysis/${userId}`).then(r => r.data)
