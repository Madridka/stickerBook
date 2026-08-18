export interface SaveSnapshotTable {
  name: string
  rows: unknown[]
}

export interface SaveSnapshot {
  schemaVersion: 1
  tables: SaveSnapshotTable[]
}

const TABLE_NAME_PATTERN: RegExp = /^[A-Za-z][A-Za-z0-9_-]{0,63}$/
const MAX_TABLES: number = 64
const MAX_ROWS: number = 100_000

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

export const parseSaveSnapshot = (data: unknown): SaveSnapshot | undefined => {
  const snapshot = asRecord(data)
  if (snapshot?.schemaVersion !== 1 || !Array.isArray(snapshot.tables)) return undefined
  if (snapshot.tables.length > MAX_TABLES) return undefined

  const names = new Set<string>()
  const tables: SaveSnapshotTable[] = []
  let rowCount = 0
  for (const candidate of snapshot.tables) {
    const table = asRecord(candidate)
    if (
      !table ||
      typeof table.name !== 'string' ||
      !TABLE_NAME_PATTERN.test(table.name) ||
      names.has(table.name) ||
      !Array.isArray(table.rows)
    ) {
      return undefined
    }
    rowCount += table.rows.length
    if (rowCount > MAX_ROWS) return undefined
    names.add(table.name)
    tables.push({ name: table.name, rows: table.rows })
  }
  return { schemaVersion: 1, tables }
}
