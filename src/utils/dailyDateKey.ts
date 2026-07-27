// Формирует единый локальный ключ игровых суток без смешивания с UTC.
export const getLocalDateKey = (timestamp: number): string => {
  const date: Date = new Date(timestamp)
  const year: string = String(date.getFullYear())
  const month: string = String(date.getMonth() + 1).padStart(2, '0')
  const day: string = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
