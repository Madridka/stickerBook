import mexicoPlayers from './mexico/players.json'
import croatiaPlayers from './croatia/players.json'
import portugalPlayers from './portugal/players.json'
import type { PlayerCard } from '@/types'

const players = [...mexicoPlayers, ...croatiaPlayers, ...portugalPlayers] as PlayerCard[]

export default players.map((player) => ({
  ...player,
  image: `${import.meta.env.BASE_URL}${player.image.replace(/^\/+/, '')}`,
}))
