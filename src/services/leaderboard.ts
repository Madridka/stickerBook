import { apiRequest } from '@/services/api'
import type { LeaderboardProfileResponse, LeaderboardResponse } from '@/types/leaderboard'

export const getLeaderboard = (signal?: AbortSignal): Promise<LeaderboardResponse> =>
  apiRequest<LeaderboardResponse>('/api/leaderboard', { signal })

export const getLeaderboardProfile = (
  userId: string,
  signal?: AbortSignal,
): Promise<LeaderboardProfileResponse> =>
  apiRequest<LeaderboardProfileResponse>(`/api/leaderboard/${encodeURIComponent(userId)}`, {
    signal,
  })
