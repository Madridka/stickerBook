export const formatPercent = (value: number): string => {
  // Добавляет знак процента к числовому значению
  return `${value}%`
}

/** Единый формат отображения энергии без изменения точности хранимого значения. */
export const formatEnergy = (value: number): string =>
  Number.isFinite(value) ? value.toFixed(2) : '0.00'
