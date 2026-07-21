export const formatCountdown = (milliseconds: number): string => {
  const totalSeconds: number = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours: number = Math.floor(totalSeconds / 3600)
  const minutes: number = Math.floor((totalSeconds % 3600) / 60)
  const seconds: number = totalSeconds % 60

  return [hours, minutes, seconds].map((value) => String(value).padStart(2, '0')).join(':')
}
