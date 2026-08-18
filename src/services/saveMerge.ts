import type { LocalSaveSnapshot, LocalSaveTableSnapshot } from '@/services/cloudSave'

type SaveRow = Record<string, unknown>

const EMPTY_SNAPSHOT: LocalSaveSnapshot = { schemaVersion: 1, tables: [] }

const isRow = (value: unknown): value is SaveRow =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const rowKey = (row: SaveRow): string | undefined => {
  for (const field of ['id', 'goalId', 'albumId']) {
    const value: unknown = row[field]
    if (typeof value === 'string' || typeof value === 'number') return String(value)
  }
  return undefined
}

const same = (left: unknown, right: unknown): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

const finiteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

const mergeAdditiveNumber = (
  base: SaveRow | undefined,
  local: SaveRow,
  remote: SaveRow,
  field: string,
): number | undefined => {
  if (!base) return undefined
  const localValue: number | undefined = finiteNumber(local[field])
  const remoteValue: number | undefined = finiteNumber(remote[field])
  if (localValue === undefined || remoteValue === undefined) return undefined
  const baseValue: number = finiteNumber(base[field]) ?? 0
  return remoteValue + (localValue - baseValue)
}

const mergeChangedRow = (
  tableName: string,
  base: SaveRow | undefined,
  local: SaveRow,
  remote: SaveRow,
): SaveRow => {
  if (tableName === 'player') {
    const coins: number | undefined = mergeAdditiveNumber(base, local, remote, 'coins')
    const localEnergyAt: number = finiteNumber(local.energyUpdatedAt) ?? 0
    const remoteEnergyAt: number = finiteNumber(remote.energyUpdatedAt) ?? 0
    const energySource: SaveRow = localEnergyAt >= remoteEnergyAt ? local : remote
    return {
      ...remote,
      ...energySource,
      coins: Math.max(0, coins ?? finiteNumber(local.coins) ?? finiteNumber(remote.coins) ?? 0),
    }
  }

  if (tableName === 'goalCounters') {
    const value: number | undefined = mergeAdditiveNumber(base, local, remote, 'value')
    return {
      ...remote,
      ...local,
      value: Math.max(
        0,
        value ?? Math.max(finiteNumber(local.value) ?? 0, finiteNumber(remote.value) ?? 0),
      ),
      updatedAt: Math.max(
        finiteNumber(local.updatedAt) ?? 0,
        finiteNumber(remote.updatedAt) ?? 0,
      ),
    }
  }

  if (tableName === 'goalStates') {
    const timestamps = (field: string): number | undefined => {
      const values: number[] = [local[field], remote[field]].filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value),
      )
      return values.length ? Math.min(...values) : undefined
    }
    const completedAt: number | undefined = timestamps('completedAt')
    const claimedAt: number | undefined = timestamps('claimedAt')
    return {
      ...remote,
      ...local,
      ...(completedAt === undefined ? {} : { completedAt }),
      ...(claimedAt === undefined ? {} : { claimedAt }),
    }
  }

  if (tableName === 'gameGuideProgress') {
    const completedStepIds: string[] = Array.from(
      new Set([...stringArray(remote.completedStepIds), ...stringArray(local.completedStepIds)]),
    )
    return {
      ...remote,
      ...local,
      completedStepIds,
      viewedCollection: remote.viewedCollection === true || local.viewedCollection === true,
      autoPreparationShown:
        remote.autoPreparationShown === true || local.autoPreparationShown === true,
      completed: remote.completed === true || local.completed === true,
      updatedAt: Math.max(
        finiteNumber(local.updatedAt) ?? 0,
        finiteNumber(remote.updatedAt) ?? 0,
      ),
    }
  }

  if (tableName === 'dailyTasks' && local.dayKey === remote.dayKey) {
    const taskRank: Record<string, number> = {
      'in-progress': 0,
      completed: 1,
      'reward-claimed': 2,
    }
    const remoteTasks: SaveRow[] = Array.isArray(remote.tasks)
      ? remote.tasks.filter(isRow)
      : []
    const localTasks: SaveRow[] = Array.isArray(local.tasks) ? local.tasks.filter(isRow) : []
    const tasks: Map<string, SaveRow> = new Map(
      remoteTasks.map((task, index): [string, SaveRow] => [String(task.taskId ?? index), task]),
    )
    for (const task of localTasks) {
      const key: string = String(task.taskId ?? '')
      const remoteTask: SaveRow | undefined = tasks.get(key)
      if (!remoteTask) {
        tasks.set(key, task)
        continue
      }
      const localStatus: string = typeof task.status === 'string' ? task.status : 'in-progress'
      const remoteStatus: string =
        typeof remoteTask.status === 'string' ? remoteTask.status : 'in-progress'
      tasks.set(key, {
        ...remoteTask,
        ...task,
        progress: Math.max(
          finiteNumber(task.progress) ?? 0,
          finiteNumber(remoteTask.progress) ?? 0,
        ),
        status: (taskRank[localStatus] ?? 0) >= (taskRank[remoteStatus] ?? 0)
          ? localStatus
          : remoteStatus,
      })
    }
    return {
      ...remote,
      ...local,
      tasks: [...tasks.values()],
      rewardClaimed: remote.rewardClaimed === true || local.rewardClaimed === true,
      updatedAt: Math.max(
        finiteNumber(local.updatedAt) ?? 0,
        finiteNumber(remote.updatedAt) ?? 0,
      ),
    }
  }

  const localUpdatedAt: number | undefined = finiteNumber(local.updatedAt)
  const remoteUpdatedAt: number | undefined = finiteNumber(remote.updatedAt)
  if (localUpdatedAt !== undefined || remoteUpdatedAt !== undefined) {
    return (localUpdatedAt ?? 0) >= (remoteUpdatedAt ?? 0) ? local : remote
  }

  // Для одной и той же карточки локальное действие пользователя важнее фонового
  // изменения другого устройства. Созданные на разных устройствах сущности имеют UUID
  // и объединяются независимо в mergeTable().
  return local
}

const indexRows = (rows: unknown[]): Map<string, SaveRow> => {
  const result: Map<string, SaveRow> = new Map()
  rows.forEach((value, index): void => {
    if (!isRow(value)) return
    result.set(rowKey(value) ?? `__index_${index}`, value)
  })
  return result
}

const mergeTable = (
  tableName: string,
  baseRows: unknown[],
  localRows: unknown[],
  remoteRows: unknown[],
): unknown[] => {
  const base: Map<string, SaveRow> = indexRows(baseRows)
  const local: Map<string, SaveRow> = indexRows(localRows)
  const remote: Map<string, SaveRow> = indexRows(remoteRows)
  const keys: Set<string> = new Set([...base.keys(), ...local.keys(), ...remote.keys()])
  const merged: SaveRow[] = []

  for (const key of keys) {
    const baseRow: SaveRow | undefined = base.get(key)
    const localRow: SaveRow | undefined = local.get(key)
    const remoteRow: SaveRow | undefined = remote.get(key)

    if (same(localRow, remoteRow)) {
      if (localRow) merged.push(localRow)
      continue
    }
    if (same(localRow, baseRow)) {
      if (remoteRow) merged.push(remoteRow)
      continue
    }
    if (same(remoteRow, baseRow)) {
      if (localRow) merged.push(localRow)
      continue
    }
    if (!localRow || !remoteRow) {
      // Удаление/расход уже существующей сущности побеждает параллельное изменение:
      // так один и тот же пак или дубль нельзя потратить дважды на разных устройствах.
      if (!baseRow) merged.push(localRow ?? remoteRow!)
      continue
    }
    merged.push(mergeChangedRow(tableName, baseRow, localRow, remoteRow))
  }

  return merged
}

const tablesByName = (snapshot: LocalSaveSnapshot): Map<string, unknown[]> =>
  new Map(snapshot.tables.map(({ name, rows }): [string, unknown[]] => [name, rows]))

/** Объединяет только изменения обеих сторон относительно последней общей копии. */
export const mergeSaveSnapshots = (
  baseSnapshot: LocalSaveSnapshot | undefined,
  localSnapshot: LocalSaveSnapshot,
  remoteSnapshot: LocalSaveSnapshot,
): LocalSaveSnapshot => {
  const base: Map<string, unknown[]> = tablesByName(baseSnapshot ?? EMPTY_SNAPSHOT)
  const local: Map<string, unknown[]> = tablesByName(localSnapshot)
  const remote: Map<string, unknown[]> = tablesByName(remoteSnapshot)
  const tableNames: Set<string> = new Set([...base.keys(), ...local.keys(), ...remote.keys()])
  const tables: LocalSaveTableSnapshot[] = [...tableNames].map(
    (name): LocalSaveTableSnapshot => ({
      name,
      rows: mergeTable(name, base.get(name) ?? [], local.get(name) ?? [], remote.get(name) ?? []),
    }),
  )
  return { schemaVersion: 1, tables }
}
