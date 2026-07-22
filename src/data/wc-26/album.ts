import mexicoPages from './mexico/pages.json'
import southAfricaPages from './south-africa/pages.json'
import koreaRepublicPages from './korea-republic/pages.json'
import czechiaPages from './czechia/pages.json'
import canadaPages from './canada/pages.json'
import bosniaAndHerzegovinaPages from './bosnia-and-herzegovina/pages.json'
import qatarPages from './qatar/pages.json'
import switzerlandPages from './switzerland/pages.json'
import brazilPages from './brazil/pages.json'
import moroccoPages from './morocco/pages.json'
import haitiPages from './haiti/pages.json'
import scotlandPages from './scotland/pages.json'
import usaPages from './usa/pages.json'
import paraguayPages from './paraguay/pages.json'
import australiaPages from './australia/pages.json'
import turkiyePages from './turkiye/pages.json'
import germanyPages from './germany/pages.json'
import curacaoPages from './curacao/pages.json'
import coteDivoirePages from './cote-divoire/pages.json'
import ecuadorPages from './ecuador/pages.json'
import netherlandsPages from './netherlands/pages.json'
import japanPages from './japan/pages.json'
import swedenPages from './sweden/pages.json'
import tunisiaPages from './tunisia/pages.json'
import belgiumPages from './belgium/pages.json'
import egyptPages from './egypt/pages.json'
import iranPages from './iran/pages.json'
import newZealandPages from './new-zealand/pages.json'
import spainPages from './spain/pages.json'
import caboVerdePages from './cabo-verde/pages.json'
import saudiArabiaPages from './saudi-arabia/pages.json'
import uruguayPages from './uruguay/pages.json'
import francePages from './france/pages.json'
import senegalPages from './senegal/pages.json'
import iraqPages from './iraq/pages.json'
import norwayPages from './norway/pages.json'
import argentinaPages from './argentina/pages.json'
import algeriaPages from './algeria/pages.json'
import austriaPages from './austria/pages.json'
import jordanPages from './jordan/pages.json'
import portugalPages from './portugal/pages.json'
import congoDrPages from './congo-dr/pages.json'
import uzbekistanPages from './uzbekistan/pages.json'
import colombiaPages from './colombia/pages.json'
import englandPages from './england/pages.json'
import croatiaPages from './croatia/pages.json'
import ghanaPages from './ghana/pages.json'
import panamaPages from './panama/pages.json'

const visibleTeamPages = [
  ...mexicoPages,
  ...southAfricaPages,
  ...koreaRepublicPages,
  ...czechiaPages,
  ...canadaPages,
  ...bosniaAndHerzegovinaPages,
  ...qatarPages,
  ...switzerlandPages,
  ...brazilPages,
  ...moroccoPages,
  ...haitiPages,
  ...scotlandPages,
  ...usaPages,
  ...paraguayPages,
  ...australiaPages,
  ...turkiyePages,
  ...germanyPages,
  ...curacaoPages,
  ...coteDivoirePages,
  ...ecuadorPages,
  ...netherlandsPages,
  ...japanPages,
  ...swedenPages,
  ...tunisiaPages,
  ...belgiumPages,
  ...egyptPages,
  ...iranPages,
  ...newZealandPages,
  ...spainPages,
  ...caboVerdePages,
  ...saudiArabiaPages,
  ...uruguayPages,
  ...francePages,
  ...senegalPages,
  ...iraqPages,
  ...norwayPages,
  ...argentinaPages,
  ...algeriaPages,
  ...austriaPages,
  ...jordanPages,
  ...portugalPages,
  ...congoDrPages,
  ...uzbekistanPages,
  ...colombiaPages,
  ...englandPages,
  ...croatiaPages,
  ...ghanaPages,
  ...panamaPages,
].map((page, index) => ({
  ...page,
  number: index + 8,
}))

export default {
  id: 'world-cup-2026',
  stickerRatio: { width: 2, height: 3 },
  pages: [
    {
      id: 'project-cover',
      number: 1,
      image: 'info/cover.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'project-info',
      number: 2,
      image: 'info/info-left.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'project-changelog',
      number: 3,
      image: 'info/info-right.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'contents-a-c',
      number: 4,
      image: 'info/info-left.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'contents-d-f',
      number: 5,
      image: 'info/info-right.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'contents-g-i',
      number: 6,
      image: 'info/info-left.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    {
      id: 'contents-j-l',
      number: 7,
      image: 'info/info-right.webp',
      width: 1536,
      height: 1200,
      slots: [],
    },
    ...visibleTeamPages,
  ],
}
