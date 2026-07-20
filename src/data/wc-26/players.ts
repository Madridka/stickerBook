import mexicoPlayers from './mexico/players.json'
import spainPlayers from './spain/players.json'
import portugalPlayers from './portugal/players.json'
import croatiaPlayers from './croatia/players.json'
import type { PlayerCard } from '@/types'

const players = [
  ...mexicoPlayers,
  ...spainPlayers,
  ...portugalPlayers,
  ...croatiaPlayers,
] as PlayerCard[]

export default players.map((player) => ({
  ...player,
  image: `${import.meta.env.BASE_URL}${player.image.replace(/^\/+/, '')}`,
}))
