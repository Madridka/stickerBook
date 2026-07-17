import mexicoPlayers from './mexico/players.json'
import croatiaPlayers from './croatia/players.json'
import portugalPlayers from './portugal/players.json'
import type { PlayerCard } from '@/types'

export default [...mexicoPlayers, ...croatiaPlayers, ...portugalPlayers] as PlayerCard[]
