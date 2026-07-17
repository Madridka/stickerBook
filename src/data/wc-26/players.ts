import mexicoPlayers from './mexico/players.json'
import croatiaPlayers from './croatia/players.json'
import type { PlayerCard } from '@/types'

export default [...mexicoPlayers, ...croatiaPlayers] as PlayerCard[]
