import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

export type User = {
  id: string; name: string; phone: string; height: number
  age: number; isAdmin: boolean; createdAt: string
  settings: UserSettings | null
  weightGoal?: { min: number; ideal: number; max: number }
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
export type WeightLog = {
  id: string; weight: number; isOfficial: boolean; loggedAt: string
}
export type WeightStatus = {
  latest: number | null; latestAt: string | null
  lastOfficial: number | null; lastOfficialAt: string | null
  due: boolean; daysAgo: number | null; daysUntilNext: number
  intervalDays: number
  goal: { min: number; ideal: number; max: number } | null
}
export type RankingUser = {
  userId: string; name: string; isAdmin: boolean
  todayPoints: number; monthlyPoints: number; streak: number
  level: number; levelName: string; totalPoints: number
  today: {
    water: { total: number; goal: number }
    activity: { total: number; goal: number }
    reading: { total: number; goal: number }
    english: { studied: boolean }
    groupTasksCompleted: number; groupTasksTotal: number
  }
  latestWeight: number | null
}
export type GroupTask = {
  id: string; title: string; description?: string
  pointValue: number; color: string; active: boolean
  completedToday?: boolean
}

// Users
export const getUsers = () => api.get<User[]>('/users').then(r => r.data)
export const createUser = (d: { name: string; phone: string; height: number; age: number }) =>
  api.post<User>('/users', d).then(r => r.data)
export const getUser = (id: string) => api.get<User>(`/users/${id}`).then(r => r.data)

// Dashboard
export const getDashboard = (userId: string) =>
  api.get<DashboardData>(`/dashboard/${userId}`).then(r => r.data)

// Water
export const logWater = (userId: string, amountMl: number) =>
  api.post(`/water/${userId}`, { amountMl }).then(r => r.data)
export const deleteWaterLog = (logId: string) => api.delete(`/water/${logId}`)

// Weight
export const logWeight = (userId: string, weight: number) =>
  api.post<{ isOfficial: boolean; newWaterGoal: number; weightPoints: { points: number; reason: string } | null }>(`/weight/${userId}`, { weight }).then(r => r.data)
export const getWeightHistory = (userId: string) =>
  api.get<WeightLog[]>(`/weight/${userId}/history`).then(r => r.data)
export const getWeightOfficial = (userId: string) =>
  api.get<WeightLog[]>(`/weight/${userId}/official`).then(r => r.data)
export const getWeightGoal = (userId: string) =>
  api.get<{ min: number; ideal: number; max: number }>(`/weight/${userId}/goal`).then(r => r.data)
export const getWeightStatus = (userId: string) =>
  api.get<WeightStatus>(`/weight/${userId}/status`).then(r => r.data)

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

// Group Tasks
export const getGroupTasks = (userId: string) =>
  api.get<GroupTask[]>(`/grouptasks/today/${userId}`).then(r => r.data)
export const createGroupTask = (adminId: string, d: Partial<GroupTask>) =>
  api.post<GroupTask>('/grouptasks', { adminId, ...d }).then(r => r.data)
export const completeGroupTask = (taskId: string, userId: string) =>
  api.post(`/grouptasks/${taskId}/complete`, { userId }).then(r => r.data)
export const deleteGroupTask = (taskId: string, adminId: string) =>
  api.delete(`/grouptasks/${taskId}?adminId=${adminId}`)

// Ranking
export const getRankingDaily = () => api.get<RankingUser[]>('/ranking/daily').then(r => r.data)
export const getRankingMonthly = () => api.get<RankingUser[]>('/ranking/monthly').then(r => r.data)

// Analysis
export const getAnalysis = (userId: string) =>
  api.get<{ analysis: string; data: Record<string, unknown> }>(`/analysis/${userId}`).then(r => r.data)
