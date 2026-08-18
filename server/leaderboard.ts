import type { FastifyInstance, FastifyReply } from 'fastify'
import type { AdminUserRecord, CloudSaveRecord, StickerBookServerDatabase } from './database.ts'
import { LEADERBOARD_CONFIG } from '../src/config/gameBalance.ts'
import { LEADERBOARD_RUNTIME_CONFIG } from '../src/config/runtimeConfig.ts'
import type {
  LeaderboardAlbumDetails,
  LeaderboardAlbumId,
  LeaderboardPlayer,
  LeaderboardProfileResponse,
  LeaderboardResponse,
} from '../src/types/leaderboard.ts'

interface PlayerStats {
  totalCards: number
  uniqueCards: number
  duplicateCards: number
  placedCards: number
  completedGoals: number
  completedDailyTasks: number
  albums: LeaderboardAlbumDetails[]
}

interface CachedPlayer extends PlayerStats {
  userId: string
  username: string
  createdAt: number
  saveUpdatedAt: number
}

interface LeaderboardSnapshot {
  generatedAt: number
  nextRefreshAt: number
  players: CachedPlayer[]
}

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const readTables = (save: CloudSaveRecord | null): Map<string, unknown[]> => {
  const snapshot = asRecord(save?.data)
  if (snapshot?.schemaVersion !== 1 || !Array.isArray(snapshot.tables)) return new Map()

  const tables = new Map<string, unknown[]>()
  for (const value of snapshot.tables) {
    const table = asRecord(value)
    if (!table || typeof table.name !== 'string' || !Array.isArray(table.rows)) continue
    tables.set(table.name, table.rows)
  }
  return tables
}

// Собирает безопасную публичную статистику из таблиц облачного сохранения.
const summarizePlayer = (save: CloudSaveRecord | null): PlayerStats => {
  const tables = readTables(save)
  const albumCounts = new Map<string, { totalCards: number; placedCards: number }>()
  let uniqueCards = 0
  let duplicateCards = 0
  let placedCards = 0

  const countCards = (values: unknown[], duplicates: boolean): void => {
    for (const value of values) {
      const card = asRecord(value)
      if (!card || card.location === 'deleted') continue
      const albumId =
        typeof card.albumId === 'string' ? card.albumId : LEADERBOARD_CONFIG.albumIds[0]
      const album = albumCounts.get(albumId) ?? { totalCards: 0, placedCards: 0 }
      album.totalCards += 1
      if (card.location === 'album') {
        album.placedCards += 1
        placedCards += 1
      }
      albumCounts.set(albumId, album)
      if (duplicates) duplicateCards += 1
      else uniqueCards += 1
    }
  }

  countCards(tables.get('cards') ?? [], false)
  countCards(tables.get('duplicates') ?? [], true)

  const completedGoals = (tables.get('goalStates') ?? []).filter((value): boolean => {
    const completedAt = asRecord(value)?.completedAt
    return typeof completedAt === 'number' && Number.isFinite(completedAt) && completedAt > 0
  }).length
  const completedDailyTasks = (tables.get('dailyTasks') ?? []).reduce<number>(
    (total, value): number => {
      const tasks = asRecord(value)?.tasks
      if (!Array.isArray(tasks)) return total
      return total + tasks.filter((task): boolean => {
        const status = asRecord(task)?.status
        return status === 'completed' || status === 'reward-claimed'
      }).length
    },
    0,
  )

  const knownAlbumIds = new Set<string>(LEADERBOARD_CONFIG.albumIds)
  const albumIds = [
    ...LEADERBOARD_CONFIG.albumIds,
    ...[...albumCounts.keys()].filter((id): boolean => !knownAlbumIds.has(id)).sort(),
  ]
  const albums = albumIds.map((albumId): LeaderboardAlbumDetails => ({
    albumId,
    totalCards: albumCounts.get(albumId)?.totalCards ?? 0,
    placedCards: albumCounts.get(albumId)?.placedCards ?? 0,
  }))

  return {
    totalCards: uniqueCards + duplicateCards,
    uniqueCards,
    duplicateCards,
    placedCards,
    completedGoals,
    completedDailyTasks,
    albums,
  }
}

const toRatingPlayer = (player: CachedPlayer, position: number): LeaderboardPlayer => ({
  position,
  userId: player.userId,
  username: player.username,
  totalCards: player.totalCards,
  albums: Object.fromEntries(
    LEADERBOARD_CONFIG.albumIds.map((albumId): [LeaderboardAlbumId, number] => [
      albumId,
      player.albums.find(({ albumId: id }): boolean => id === albumId)?.totalCards ?? 0,
    ]),
  ) as Record<LeaderboardAlbumId, number>,
})

class LeaderboardService {
  private snapshot: LeaderboardSnapshot | undefined
  private readonly storage: StickerBookServerDatabase

  constructor(storage: StickerBookServerDatabase) {
    this.storage = storage
  }

  // Возвращает один согласованный снимок рейтинга и профилей на весь период кэширования.
  getSnapshot = (now: number = Date.now()): LeaderboardSnapshot => {
    if (this.snapshot && now < this.snapshot.nextRefreshAt) return this.snapshot

    const players = this.storage
      .listUsersWithSaves()
      .flatMap((user: AdminUserRecord): CachedPlayer[] => {
        if (!user.save) return []
        const stats = summarizePlayer(user.save)
        return stats.totalCards >= LEADERBOARD_CONFIG.minimumCards
          ? [{
              userId: user.id,
              username: user.username,
              createdAt: user.createdAt,
              saveUpdatedAt: user.save.updatedAt,
              ...stats,
            }]
          : []
      })
      .sort(
        (left, right): number =>
          right.totalCards - left.totalCards ||
          right.placedCards - left.placedCards ||
          left.username.localeCompare(right.username, 'ru'),
      )

    this.snapshot = {
      generatedAt: now,
      nextRefreshAt: now + LEADERBOARD_RUNTIME_CONFIG.cacheTtlMs,
      players,
    }
    return this.snapshot
  }
}

const setCacheHeaders = (reply: FastifyReply): void => {
  const maxAgeSeconds = Math.floor(LEADERBOARD_RUNTIME_CONFIG.cacheTtlMs / 1_000)
  reply.header(
    'Cache-Control',
    `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}, stale-while-revalidate=${LEADERBOARD_RUNTIME_CONFIG.staleWhileRevalidateSeconds}`,
  )
}

export const registerLeaderboard = (
  server: FastifyInstance,
  storage: StickerBookServerDatabase,
): void => {
  const leaderboard = new LeaderboardService(storage)

  server.get('/api/leaderboard', async (_request, reply) => {
    const snapshot = leaderboard.getSnapshot()
    setCacheHeaders(reply)
    const response: LeaderboardResponse = {
      minimumCards: LEADERBOARD_CONFIG.minimumCards,
      generatedAt: snapshot.generatedAt,
      nextRefreshAt: snapshot.nextRefreshAt,
      players: snapshot.players.map(toRatingPlayer),
    }
    return response
  })

  server.get<{ Params: { userId: string } }>(
    '/api/leaderboard/:userId',
    async (request, reply) => {
      const snapshot = leaderboard.getSnapshot()
      const playerIndex = snapshot.players.findIndex(
        ({ userId }): boolean => userId === request.params.userId,
      )
      if (playerIndex < 0) return reply.code(404).send({ code: 'player-not-found' })

      const player = snapshot.players[playerIndex]
      setCacheHeaders(reply)
      const response: LeaderboardProfileResponse = {
        generatedAt: snapshot.generatedAt,
        nextRefreshAt: snapshot.nextRefreshAt,
        player: {
          ...toRatingPlayer(player, playerIndex + 1),
          uniqueCards: player.uniqueCards,
          duplicateCards: player.duplicateCards,
          placedCards: player.placedCards,
          completedTasks: player.completedGoals + player.completedDailyTasks,
          completedGoals: player.completedGoals,
          completedDailyTasks: player.completedDailyTasks,
          createdAt: player.createdAt,
          saveUpdatedAt: player.saveUpdatedAt,
          albumDetails: player.albums,
        },
      }
      return response
    },
  )
}
