import type { PlayerPosition } from '@/types'

export const playerPositionLabels: Readonly<Record<PlayerPosition, string>> = {
  GK: 'GOALKEEPER',
  DF: 'DEFENDER',
  MF: 'MIDFIELDER',
  FW: 'FORWARD',
}
