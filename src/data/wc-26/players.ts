import mexicoPlayers from './mexico/players.json'
import southAfricaPlayers from './south-africa/players.json'
import koreaRepublicPlayers from './korea-republic/players.json'
import czechiaPlayers from './czechia/players.json'
import canadaPlayers from './canada/players.json'
import bosniaAndHerzegovinaPlayers from './bosnia-and-herzegovina/players.json'
import qatarPlayers from './qatar/players.json'
import switzerlandPlayers from './switzerland/players.json'
import brazilPlayers from './brazil/players.json'
import moroccoPlayers from './morocco/players.json'
import haitiPlayers from './haiti/players.json'
import scotlandPlayers from './scotland/players.json'
import usaPlayers from './usa/players.json'
import paraguayPlayers from './paraguay/players.json'
import australiaPlayers from './australia/players.json'
import turkiyePlayers from './turkiye/players.json'
import germanyPlayers from './germany/players.json'
import curacaoPlayers from './curacao/players.json'
import coteDivoirePlayers from './cote-divoire/players.json'
import ecuadorPlayers from './ecuador/players.json'
import netherlandsPlayers from './netherlands/players.json'
import japanPlayers from './japan/players.json'
import swedenPlayers from './sweden/players.json'
import tunisiaPlayers from './tunisia/players.json'
import belgiumPlayers from './belgium/players.json'
import egyptPlayers from './egypt/players.json'
import iranPlayers from './iran/players.json'
import newZealandPlayers from './new-zealand/players.json'
import spainPlayers from './spain/players.json'
import caboVerdePlayers from './cabo-verde/players.json'
import saudiArabiaPlayers from './saudi-arabia/players.json'
import uruguayPlayers from './uruguay/players.json'
import francePlayers from './france/players.json'
import senegalPlayers from './senegal/players.json'
import iraqPlayers from './iraq/players.json'
import norwayPlayers from './norway/players.json'
import argentinaPlayers from './argentina/players.json'
import algeriaPlayers from './algeria/players.json'
import austriaPlayers from './austria/players.json'
import jordanPlayers from './jordan/players.json'
import portugalPlayers from './portugal/players.json'
import congoDrPlayers from './congo-dr/players.json'
import uzbekistanPlayers from './uzbekistan/players.json'
import colombiaPlayers from './colombia/players.json'
import englandPlayers from './england/players.json'
import croatiaPlayers from './croatia/players.json'
import ghanaPlayers from './ghana/players.json'
import panamaPlayers from './panama/players.json'
import type { PlayerCard } from '@/types'

const players = [
  ...mexicoPlayers,
  ...southAfricaPlayers,
  ...koreaRepublicPlayers,
  ...czechiaPlayers,
  ...canadaPlayers,
  ...bosniaAndHerzegovinaPlayers,
  ...qatarPlayers,
  ...switzerlandPlayers,
  ...brazilPlayers,
  ...moroccoPlayers,
  ...haitiPlayers,
  ...scotlandPlayers,
  ...usaPlayers,
  ...paraguayPlayers,
  ...australiaPlayers,
  ...turkiyePlayers,
  ...germanyPlayers,
  ...curacaoPlayers,
  ...coteDivoirePlayers,
  ...ecuadorPlayers,
  ...netherlandsPlayers,
  ...japanPlayers,
  ...swedenPlayers,
  ...tunisiaPlayers,
  ...belgiumPlayers,
  ...egyptPlayers,
  ...iranPlayers,
  ...newZealandPlayers,
  ...spainPlayers,
  ...caboVerdePlayers,
  ...saudiArabiaPlayers,
  ...uruguayPlayers,
  ...francePlayers,
  ...senegalPlayers,
  ...iraqPlayers,
  ...norwayPlayers,
  ...argentinaPlayers,
  ...algeriaPlayers,
  ...austriaPlayers,
  ...jordanPlayers,
  ...portugalPlayers,
  ...congoDrPlayers,
  ...uzbekistanPlayers,
  ...colombiaPlayers,
  ...englandPlayers,
  ...croatiaPlayers,
  ...ghanaPlayers,
  ...panamaPlayers,
] as PlayerCard[]

export default players.map((player) => ({
  ...player,
  image: `${import.meta.env.BASE_URL}${player.image.replace(/^\/+/, '')}`,
}))
