import astonVilla from './aston-villa/cards.json'
import atleticoMadrid from './atletico-madrid/cards.json'
import clubBrugge from './club-brugge/cards.json'
import como from './como/cards.json'
import feyenoord from './feyenoord/cards.json'
import galatasaray from './galatasaray/cards.json'
import inter from './inter/cards.json'
import lens from './lens/cards.json'
import lille from './lille/cards.json'
import liverpool from './liverpool/cards.json'
import manchesterCity from './manchester-city/cards.json'
import manchesterUnited from './manchester-united/cards.json'
import napoli from './napoli/cards.json'
import porto from './porto/cards.json'
import psv from './psv/cards.json'
import rbLeipzig from './rb-leipzig/cards.json'
import realBetis from './real-betis/cards.json'
import roma from './roma/cards.json'
import slaviaPraha from './slavia-praha/cards.json'
import sporting from './sporting/cards.json'
import stuttgart from './stuttgart/cards.json'
import villarreal from './villarreal/cards.json'

// Явные импорты позволяют HMR увидеть новые каталоги сразу после их добавления.
const provisionalCatalogs: Record<string, unknown> = {
  './aston-villa/cards.json': astonVilla,
  './atletico-madrid/cards.json': atleticoMadrid,
  './club-brugge/cards.json': clubBrugge,
  './como/cards.json': como,
  './feyenoord/cards.json': feyenoord,
  './galatasaray/cards.json': galatasaray,
  './inter/cards.json': inter,
  './lens/cards.json': lens,
  './lille/cards.json': lille,
  './liverpool/cards.json': liverpool,
  './manchester-city/cards.json': manchesterCity,
  './manchester-united/cards.json': manchesterUnited,
  './napoli/cards.json': napoli,
  './porto/cards.json': porto,
  './psv/cards.json': psv,
  './rb-leipzig/cards.json': rbLeipzig,
  './real-betis/cards.json': realBetis,
  './roma/cards.json': roma,
  './slavia-praha/cards.json': slaviaPraha,
  './sporting/cards.json': sporting,
  './stuttgart/cards.json': stuttgart,
  './villarreal/cards.json': villarreal,
}

export default provisionalCatalogs
