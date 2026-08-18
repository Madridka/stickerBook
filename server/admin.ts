import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify'
import { BLISTER_CONFIGS, PITY_CONFIG } from '../src/config/gameBalance.ts'
import type { ServerConfig } from './config.ts'
import type { DatabaseBackupService } from './backup.ts'
import {
  type AdminUserRecord,
  type CloudSaveRecord,
  StickerBookServerDatabase,
} from './database.ts'
import { verifyPassword } from './password.ts'
import {
  parseSaveSnapshot,
  type SaveSnapshot as Snapshot,
  type SaveSnapshotTable as SnapshotTable,
} from './save-validation.ts'
import { RequestRateLimiter, sendRateLimit } from './security.ts'

interface SaveBody {
  baseVersion?: unknown
  data?: unknown
}

interface GrantBody {
  albumId?: unknown
  baseVersion?: unknown
  itemId?: unknown
  quality?: unknown
  quantity?: unknown
  type?: unknown
}

interface AdminSummary {
  coins: number
  energy: number
  cards: number
  duplicates: number
  packs: number
  invalidPacks: number
  goalsCompleted: number
  goalsClaimed: number
  albums: Array<{ id: string; cards: number; placed: number }>
  pity: Array<{
    albumId: string
    dryPackCount: number
    dryPacksBeforeGuarantee: number | null
    updatedAt: number
  }>
}

const emptySummary = (): AdminSummary => ({
  coins: 0,
  energy: 0,
  cards: 0,
  duplicates: 0,
  packs: 0,
  invalidPacks: 0,
  goalsCompleted: 0,
  goalsClaimed: 0,
  albums: [],
  pity: [],
})

const asRecord = (value: unknown): Record<string, unknown> | undefined =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined

const asNumber = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0

const getOrCreateTable = (snapshot: Snapshot, name: string): SnapshotTable => {
  let table = snapshot.tables.find((candidate) => candidate.name === name)
  if (!table) {
    table = { name, rows: [] }
    snapshot.tables.push(table)
  }
  return table
}

const ITEM_ID_PATTERN = /^[A-Za-z0-9_.-]{1,80}$/

/** Строит серверные индексы наборов из единой игровой конфигурации. */
const blisterConfigs = Object.values(BLISTER_CONFIGS)
const PACK_ALBUMS: Readonly<Record<string, readonly string[]>> = Object.fromEntries(
  blisterConfigs.map((config): [string, readonly string[]] => [config.id, config.albumIds]),
)
const DEFAULT_PACK_BY_ALBUM: Readonly<Record<string, string>> = Object.fromEntries(
  blisterConfigs
    .filter((config): boolean => config.albumIds.length === 1)
    .map((config): [string, string] => [config.albumId, config.id]),
)

const toAdminOptions = (values: readonly string[]): string =>
  values.map((value): string => `<option value="${value}">${value}</option>`).join('')
const ADMIN_ALBUM_OPTIONS: string = toAdminOptions([
  ...new Set(blisterConfigs.flatMap((config): readonly string[] => config.albumIds)),
])
const ADMIN_PACK_OPTIONS: string = toAdminOptions(
  blisterConfigs.map((config): string => config.id),
)

const isValidPack = (value: unknown): boolean => {
  const item = asRecord(value)
  if (item?.type !== 'pack' || typeof item.packId !== 'string') return false
  const albumId = typeof item.albumId === 'string' ? item.albumId : 'wc-26'
  return Boolean(PACK_ALBUMS[item.packId]?.includes(albumId))
}

const normalizePack = (value: unknown): boolean => {
  const item = asRecord(value)
  if (item?.type !== 'pack') return false
  const albumId =
    typeof item.albumId === 'string' && DEFAULT_PACK_BY_ALBUM[item.albumId]
      ? item.albumId
      : 'wc-26'
  const rawPackId = item.packId === 'standart' ? 'standard' : item.packId
  if (typeof rawPackId === 'string' && PACK_ALBUMS[rawPackId]?.includes(albumId)) {
    item.packId = rawPackId
    item.albumId = albumId
    return true
  }
  item.packId = DEFAULT_PACK_BY_ALBUM[albumId]
  item.albumId = albumId
  return true
}

const grantItems = (
  snapshot: Snapshot,
  body: Required<Omit<GrantBody, 'baseVersion'>>,
): { destination: string; quantity: number } => {
  const quantity = Number(body.quantity)
  const albumId = String(body.albumId)
  const itemId = String(body.itemId)
  const now = Date.now()

  if (body.type === 'pack') {
    const inventory = getOrCreateTable(snapshot, 'inventory')
    const packId = String(body.itemId)
    const packAlbumId = PACK_ALBUMS[packId]?.[0]
    if (!packAlbumId) return { destination: 'inventory', quantity: 0 }
    for (let index = 0; index < quantity; index += 1) {
      inventory.rows.push({
        id: randomUUID(),
        type: 'pack',
        packId,
        albumId: packAlbumId,
        createdAt: now + index,
      })
    }
    return { destination: 'inventory', quantity }
  }

  const cards = getOrCreateTable(snapshot, 'cards')
  const duplicates = getOrCreateTable(snapshot, 'duplicates')
  const hasOriginal = cards.rows.some((value) => {
    const card = asRecord(value)
    return card?.albumId === albumId && card.playerId === itemId && card.location !== 'deleted'
  })
  const quality = Math.min(100, Math.max(1, Math.round(Number(body.quality))))
  for (let index = 0; index < quantity; index += 1) {
    const isDuplicate = hasOriginal || index > 0
    ;(isDuplicate ? duplicates : cards).rows.push({
      id: randomUUID(),
      albumId,
      playerId: itemId,
      quality,
      location: isDuplicate ? 'duplicate' : 'inventory',
    })
  }
  return { destination: hasOriginal ? 'duplicates' : 'cards', quantity }
}

const summarize = (save: CloudSaveRecord | null): AdminSummary => {
  const snapshot = save ? parseSaveSnapshot(save.data) : undefined
  if (!snapshot) return emptySummary()
  const tables = new Map(snapshot.tables.map((table) => [table.name, table.rows]))
  const player = asRecord(tables.get('player')?.[0])
  const cards = tables.get('cards') ?? []
  const duplicates = tables.get('duplicates') ?? []
  const inventory = tables.get('inventory') ?? []
  const goals = tables.get('goalStates') ?? []
  const pityStates = tables.get('albumPityStates') ?? []
  const albumMap = new Map<string, { cards: number; placed: number }>()

  for (const value of cards) {
    const card = asRecord(value)
    if (!card) continue
    const albumId = typeof card.albumId === 'string' ? card.albumId : 'wc-26'
    const album = albumMap.get(albumId) ?? { cards: 0, placed: 0 }
    album.cards += 1
    if (card.location === 'album') album.placed += 1
    albumMap.set(albumId, album)
  }

  return {
    coins: asNumber(player?.coins),
    energy: asNumber(player?.energy),
    cards: cards.length,
    duplicates: duplicates.length,
    packs: inventory.filter(isValidPack).length,
    invalidPacks: inventory.filter(
      (value) => asRecord(value)?.type === 'pack' && !isValidPack(value),
    ).length,
    goalsCompleted: goals.filter((value) => asNumber(asRecord(value)?.completedAt) > 0).length,
    goalsClaimed: goals.filter((value) => asNumber(asRecord(value)?.claimedAt) > 0).length,
    albums: [...albumMap.entries()]
      .map(([id, counts]) => ({ id, ...counts }))
      .sort((left, right) => right.placed - left.placed),
    pity: pityStates
      .flatMap((value): AdminSummary['pity'] => {
        const state = asRecord(value)
        if (!state || typeof state.albumId !== 'string') return []
        const rawTarget = asNumber(state.dryPacksBeforeGuarantee)
        const dryPacksBeforeGuarantee =
          Number.isInteger(rawTarget) &&
          rawTarget >= PITY_CONFIG.minDryPacksBeforeGuarantee &&
          rawTarget <= PITY_CONFIG.maxDryPacksBeforeGuarantee
            ? rawTarget
            : null
        return [{
          albumId: state.albumId,
          dryPackCount: Math.max(0, Math.floor(asNumber(state.dryPackCount))),
          dryPacksBeforeGuarantee,
          updatedAt: asNumber(state.updatedAt),
        }]
      })
      .sort((left, right) => right.dryPackCount - left.dryPackCount),
  }
}

const safeEqual = (actual: string, expected: string): boolean => {
  const actualBuffer = Buffer.from(actual)
  const expectedBuffer = Buffer.from(expected)
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer)
}

const readBasicCredentials = (
  authorization: string | undefined,
): { username: string; password: string } | undefined => {
  if (!authorization?.startsWith('Basic ')) return undefined
  try {
    const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8')
    const separator = decoded.indexOf(':')
    if (separator < 0) return undefined
    return { username: decoded.slice(0, separator), password: decoded.slice(separator + 1) }
  } catch {
    return undefined
  }
}

const adminHtml = `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Вклейка · Админка</title>
  <style nonce="__CSP_NONCE__">
    :root{color-scheme:dark;--bg:#0b1020;--panel:#131a2b;--line:#27324a;--muted:#8f9bb4;--text:#eef2ff;--accent:#7c5cff;--green:#34d399;--danger:#fb7185}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#19213a 0,var(--bg) 40%);color:var(--text);font:14px/1.5 Inter,system-ui,sans-serif}button,input,select,textarea{font:inherit}.shell{max-width:1280px;margin:auto;padding:32px 24px}.top{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:24px}.top-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}h1{font-size:30px;margin:0}.eyebrow{color:#9c8cff;text-transform:uppercase;font-size:11px;font-weight:800;letter-spacing:.16em}.muted{color:var(--muted)}.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:18px}.stat,.panel{background:rgba(19,26,43,.94);border:1px solid var(--line);border-radius:16px}.stat{padding:16px}.stat b{display:block;font-size:24px}.toolbar{display:flex;gap:10px;margin-bottom:14px}input,select,textarea{width:100%;color:var(--text);background:#0c1221;border:1px solid var(--line);border-radius:10px;padding:10px 12px;outline:none}input:focus,select:focus,textarea:focus{border-color:var(--accent)}button{color:white;background:var(--accent);border:0;border-radius:10px;padding:10px 16px;font-weight:700;cursor:pointer}button.secondary{background:#263149}button:disabled{opacity:.55;cursor:not-allowed}.panel{overflow:hidden}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:900px}th,td{text-align:left;padding:13px 16px;border-bottom:1px solid var(--line)}th{color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.08em}tbody tr{cursor:pointer}tbody tr:hover{background:#192239}.name{font-weight:750}.pill{display:inline-flex;padding:3px 8px;border-radius:99px;background:#24304a;color:#cfd7ed;font-size:12px}.empty{padding:48px;text-align:center;color:var(--muted)}.pager{display:flex;justify-content:space-between;align-items:center;padding:13px 16px}.drawer{position:fixed;inset:0;display:none;background:#050812b8;z-index:5}.drawer.open{display:flex;justify-content:flex-end}.sheet{width:min(720px,100%);height:100%;overflow:auto;background:var(--bg);border-left:1px solid var(--line);padding:26px}.sheet-head{display:flex;justify-content:space-between;gap:16px}.close{font-size:20px;padding:6px 12px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:22px 0}.mini{padding:12px;background:var(--panel);border:1px solid var(--line);border-radius:12px}.mini b{display:block;font-size:20px}.albums{margin:18px 0}.album{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--line)}.grant{margin:22px 0;padding:18px;background:var(--panel);border:1px solid var(--line);border-radius:14px}.grant h3{margin:0 0 4px}.grant-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}.grant-actions{display:flex;align-items:center;gap:12px;margin-top:12px}.grant-actions .message{flex:1;margin:0}textarea{min-height:360px;resize:vertical;font:12px/1.5 ui-monospace,Consolas,monospace}.editor-head{display:flex;justify-content:space-between;align-items:center;margin:18px 0 8px}.editor-title{margin:0}.message{min-height:22px;margin-top:8px;color:var(--green)}.message.error{color:var(--danger)}@media(max-width:700px){.shell{padding:20px 12px}.top{align-items:start;flex-direction:column}.stats{grid-template-columns:1fr}.grid,.grant-grid{grid-template-columns:1fr 1fr}.sheet{padding:18px}}
  </style>
</head>
<body>
  <main class="shell">
    <div class="top"><div><div class="eyebrow">Sticker Book</div><h1>Пользователи</h1><div class="muted">Аккаунты и облачный игровой прогресс</div></div><div class="top-actions"><span id="backupStatus" class="muted"></span><button id="backup" class="secondary">Создать бэкап</button><button id="refresh" class="secondary">Обновить</button></div></div>
    <section class="stats"><div class="stat"><span class="muted">Пользователей</span><b id="total">—</b></div><div class="stat"><span class="muted">С сохранением на странице</span><b id="saved">—</b></div><div class="stat"><span class="muted">Карточек на странице</span><b id="cards">—</b></div></section>
    <div class="toolbar"><input id="search" type="search" placeholder="Поиск по имени…" autocomplete="off"><button id="searchButton">Найти</button></div>
    <section class="panel"><div class="table-wrap"><table><thead><tr><th>Пользователь</th><th>Создан</th><th>Последнее сохранение</th><th>Монеты</th><th>Энергия</th><th>Карточки</th><th>В альбоме</th><th>Дубли</th></tr></thead><tbody id="rows"></tbody></table><div id="empty" class="empty" hidden>Пользователи не найдены</div></div><div class="pager"><button id="prev" class="secondary">Назад</button><span id="page" class="muted"></span><button id="next" class="secondary">Дальше</button></div></section>
  </main>
  <aside id="drawer" class="drawer"><div class="sheet"><div class="sheet-head"><div><div class="eyebrow">Пользователь</div><h2 id="detailName"></h2><div id="detailMeta" class="muted"></div></div><button id="close" class="secondary close">×</button></div><div id="detailStats" class="grid"></div><div id="packWarning" class="grant" hidden><h3>Найдены некорректные паки</h3><div id="packWarningText" class="muted"></div><div class="grant-actions"><button id="repairPacks">Исправить паки</button><div id="repairMessage" class="message"></div></div></div><div class="albums"><h3>Альбомы</h3><div id="albums"></div></div><div class="albums"><h3>Pity system</h3><div id="pity"></div></div><section class="grant"><h3>Выдать предмет</h3><div class="muted">Предмет сразу появится в сохранении игрока</div><div class="grant-grid"><label><span class="muted">Тип</span><select id="grantType"><option value="card">Карточка</option><option value="pack">Пак</option></select></label><label id="grantAlbumField"><span class="muted">Альбом карточки</span><select id="grantAlbum">${ADMIN_ALBUM_OPTIONS}</select></label><label id="grantCardField"><span class="muted">ID карточки</span><input id="grantId" placeholder="Например: arg-01"></label><label id="grantPackField" hidden><span class="muted">Блистер</span><select id="grantPackId">${ADMIN_PACK_OPTIONS}</select></label><label><span class="muted">Количество</span><input id="grantQuantity" type="number" min="1" max="100" value="1"></label><label id="qualityField"><span class="muted">Качество, %</span><input id="grantQuality" type="number" min="1" max="100" value="100"></label></div><div class="grant-actions"><button id="grantButton">Выдать</button><div id="grantMessage" class="message"></div></div></section><div class="editor-head"><div><h3 class="editor-title">JSON сохранения</h3><span class="muted">Расширенное ручное редактирование</span></div><button id="save">Сохранить JSON</button></div><textarea id="json" spellcheck="false"></textarea><div id="message" class="message"></div></div></aside>
  <script nonce="__CSP_NONCE__">
    const state={offset:0,limit:25,total:0,search:'',selected:null};
    const el=id=>document.getElementById(id); const fmt=value=>value?new Intl.DateTimeFormat('ru-RU',{dateStyle:'short',timeStyle:'short'}).format(value):'—'; const fmtEnergy=value=>Number.isFinite(value)?value.toFixed(2):'0.00';
    const api=async(url,options)=>{const response=await fetch(url,options);if(!response.ok){const body=await response.json().catch(()=>({}));throw new Error(body.code||('HTTP '+response.status))}return response.status===204?null:response.json()};
    const cell=(row,text,cls)=>{const td=document.createElement('td');td.textContent=text;if(cls)td.className=cls;row.append(td)};
    const load=async()=>{const params=new URLSearchParams({offset:String(state.offset),limit:String(state.limit)});if(state.search)params.set('search',state.search);const data=await api('/api/admin/users?'+params);state.total=data.total;el('rows').replaceChildren();for(const user of data.users){const row=document.createElement('tr');cell(row,user.username,'name');cell(row,fmt(user.createdAt));cell(row,fmt(user.updatedAt));cell(row,String(user.summary.coins));cell(row,fmtEnergy(user.summary.energy));cell(row,String(user.summary.cards));cell(row,String(user.summary.albums.reduce((sum,a)=>sum+a.placed,0)));cell(row,String(user.summary.duplicates));row.onclick=()=>openUser(user.id);el('rows').append(row)}el('empty').hidden=data.users.length>0;el('total').textContent=String(data.total);el('saved').textContent=String(data.users.filter(u=>u.version!==null).length);el('cards').textContent=String(data.users.reduce((sum,u)=>sum+u.summary.cards,0));const current=Math.floor(state.offset/state.limit)+1,totalPages=Math.max(1,Math.ceil(state.total/state.limit));el('page').textContent='Страница '+current+' из '+totalPages;el('prev').disabled=state.offset===0;el('next').disabled=state.offset+state.limit>=state.total}
    const mini=(label,value)=>'<div class="mini"><span class="muted">'+label+'</span><b>'+value+'</b></div>';
    const openUser=async(id)=>{const data=await api('/api/admin/users/'+encodeURIComponent(id));state.selected=data.user;const u=data.user,s=u.summary;el('detailName').textContent=u.username;el('detailMeta').textContent='Создан: '+fmt(u.createdAt)+' · save v'+(u.save?.version??0);el('detailStats').innerHTML=mini('Монеты',s.coins)+mini('Энергия',fmtEnergy(s.energy))+mini('Карточки',s.cards)+mini('Дубли',s.duplicates)+mini('Наборы',s.packs)+mini('Цели',s.goalsCompleted)+mini('Награды',s.goalsClaimed);el('packWarning').hidden=s.invalidPacks===0;el('packWarningText').textContent='Некорректных записей: '+s.invalidPacks+'. Они не отображаются в магазине.';el('repairMessage').textContent='';el('albums').replaceChildren();for(const a of s.albums){const row=document.createElement('div');row.className='album';const name=document.createElement('b');name.textContent=a.id;const value=document.createElement('span');value.textContent=a.placed+' вклеено · '+a.cards+' карточек';row.append(name,value);el('albums').append(row)}if(!s.albums.length)el('albums').textContent='Нет карточек';el('pity').replaceChildren();for(const p of s.pity){const row=document.createElement('div');row.className='album';const name=document.createElement('b');name.textContent=p.albumId;const value=document.createElement('span');value.textContent=p.dryPackCount+'/'+(p.dryPacksBeforeGuarantee??'?')+' dry pack · '+fmt(p.updatedAt);row.append(name,value);el('pity').append(row)}if(!s.pity.length)el('pity').textContent='Нет накопленного pity';el('json').value=JSON.stringify(u.save?.data??{schemaVersion:1,tables:[]},null,2);el('message').textContent='';el('grantMessage').textContent='';el('drawer').classList.add('open')}
    const save=async()=>{if(!state.selected)return;let data;try{data=JSON.parse(el('json').value)}catch{el('message').textContent='JSON содержит синтаксическую ошибку';el('message').className='message error';return}el('save').disabled=true;try{const result=await api('/api/admin/users/'+encodeURIComponent(state.selected.id)+'/save',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({baseVersion:state.selected.save?.version??0,data})});el('message').textContent='Сохранено: версия '+result.save.version;el('message').className='message';await openUser(state.selected.id);await load()}catch(error){el('message').textContent='Не сохранено: '+error.message;el('message').className='message error'}finally{el('save').disabled=false}}
    const updateGrantForm=()=>{const pack=el('grantType').value==='pack';el('grantAlbumField').hidden=pack;el('grantCardField').hidden=pack;el('grantPackField').hidden=!pack;el('qualityField').hidden=pack}
    const grant=async()=>{if(!state.selected)return;const type=el('grantType').value,itemId=type==='pack'?el('grantPackId').value:el('grantId').value.trim();if(!itemId){el('grantMessage').textContent='Укажите ID карточки';el('grantMessage').className='message error';return}el('grantButton').disabled=true;try{const result=await api('/api/admin/users/'+encodeURIComponent(state.selected.id)+'/grant',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({baseVersion:state.selected.save?.version??0,type,albumId:el('grantAlbum').value,itemId,quantity:Number(el('grantQuantity').value),quality:Number(el('grantQuality').value)})});await openUser(state.selected.id);el('grantMessage').textContent='Выдано: '+result.granted.quantity;el('grantMessage').className='message';await load()}catch(error){el('grantMessage').textContent='Не выдано: '+error.message;el('grantMessage').className='message error'}finally{el('grantButton').disabled=false}}
    const repairPacks=async()=>{if(!state.selected)return;el('repairPacks').disabled=true;try{const result=await api('/api/admin/users/'+encodeURIComponent(state.selected.id)+'/repair-packs',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({baseVersion:state.selected.save?.version??0})});await openUser(state.selected.id);el('repairMessage').textContent='Исправлено: '+result.repaired;await load()}catch(error){el('repairMessage').textContent='Ошибка: '+error.message;el('repairMessage').className='message error'}finally{el('repairPacks').disabled=false}}
    const refreshBackups=async()=>{try{const data=await api('/api/admin/backups');const latest=data.backups[0];el('backup').disabled=!data.enabled;el('backupStatus').textContent=latest?'Последний бэкап: '+fmt(latest.createdAt):data.enabled?'Бэкапов пока нет':'Бэкапы отключены'}catch(error){el('backupStatus').textContent='Бэкапы недоступны: '+error.message}}
    const createBackup=async()=>{el('backup').disabled=true;el('backupStatus').textContent='Создание бэкапа…';try{const data=await api('/api/admin/backups',{method:'POST'});el('backupStatus').textContent='Создан: '+fmt(data.backup.createdAt)}catch(error){el('backupStatus').textContent='Ошибка бэкапа: '+error.message}finally{await refreshBackups()}}
    el('searchButton').onclick=()=>{state.search=el('search').value.trim();state.offset=0;load()};el('search').onkeydown=e=>{if(e.key==='Enter')el('searchButton').click()};el('refresh').onclick=()=>{load();refreshBackups()};el('backup').onclick=createBackup;el('prev').onclick=()=>{state.offset=Math.max(0,state.offset-state.limit);load()};el('next').onclick=()=>{state.offset+=state.limit;load()};el('close').onclick=()=>el('drawer').classList.remove('open');el('drawer').onclick=e=>{if(e.target===el('drawer'))el('drawer').classList.remove('open')};el('save').onclick=save;el('grantType').onchange=updateGrantForm;el('grantButton').onclick=grant;el('repairPacks').onclick=repairPacks;updateGrantForm();refreshBackups();load().catch(error=>{el('empty').hidden=false;el('empty').textContent='Ошибка загрузки: '+error.message});
  </script>
</body>
</html>`

export const registerAdmin = (
  server: FastifyInstance,
  storage: StickerBookServerDatabase,
  backupService: DatabaseBackupService,
  config: ServerConfig,
): void => {
  const enabled: boolean = Boolean(config.adminPasswordHash)
  const limiter = new RequestRateLimiter()

  const authorize = async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!enabled) {
      await reply.code(404).send({ code: 'not-found' })
      return
    }
    const rateKey = `admin:${request.ip}`
    const retryAfter = limiter.consume(rateKey, 8, 15 * 60 * 1_000)
    if (retryAfter !== undefined) {
      await sendRateLimit(reply, retryAfter)
      return
    }
    const credentials = readBasicCredentials(request.headers.authorization)
    const passwordMatches = credentials
      ? await verifyPassword(credentials.password, config.adminPasswordHash ?? '')
      : false
    if (
      !credentials ||
      !safeEqual(credentials.username, config.adminUsername) ||
      !passwordMatches
    ) {
      reply.header('WWW-Authenticate', 'Basic realm="Sticker Book Admin", charset="UTF-8"')
      await reply.code(401).send({ code: 'admin-unauthorized' })
      return
    }
    limiter.reset(rateKey)
  }

  const sendAdminPage = async (_request: FastifyRequest, reply: FastifyReply): Promise<FastifyReply> => {
    const nonce: string = randomBytes(18).toString('base64')
    return reply
      .header('Cache-Control', 'no-store')
      .header(
        'Content-Security-Policy',
        `default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; connect-src 'self'`,
      )
      .type('text/html; charset=utf-8')
      .send(adminHtml.replaceAll('__CSP_NONCE__', nonce))
  }

  server.get('/admin', { preHandler: authorize }, sendAdminPage)
  server.get('/admin/', { preHandler: authorize }, sendAdminPage)

  server.get('/api/admin/backups', { preHandler: authorize }, async () => ({
    enabled: backupService.isEnabled(),
    backups: backupService.list(),
  }))

  server.post('/api/admin/backups', { preHandler: authorize }, async (_request, reply) => {
    if (!backupService.isEnabled()) {
      return reply.code(503).send({ code: 'database-backups-disabled' })
    }
    const created = await backupService.create('manual')
    return reply.code(201).send({ backup: created })
  })

  server.get<{ Querystring: { search?: string; limit?: string; offset?: string } }>(
    '/api/admin/users',
    { preHandler: authorize },
    async (request) => {
      const search = request.query.search?.trim().slice(0, 64) ?? ''
      const limit = Math.min(100, Math.max(1, Number.parseInt(request.query.limit ?? '25', 10) || 25))
      const offset = Math.max(0, Number.parseInt(request.query.offset ?? '0', 10) || 0)
      const result = storage.listUsers(search, limit, offset)
      return {
        total: result.total,
        users: result.users.map((user) => ({
          id: user.id,
          username: user.username,
          createdAt: user.createdAt,
          version: user.save?.version ?? null,
          updatedAt: user.save?.updatedAt ?? null,
          summary: summarize(user.save),
        })),
      }
    },
  )

  server.get<{ Params: { id: string } }>(
    '/api/admin/users/:id',
    { preHandler: authorize },
    async (request, reply) => {
      const user: AdminUserRecord | undefined = storage.getAdminUser(request.params.id)
      if (!user) return reply.code(404).send({ code: 'user-not-found' })
      return { user: { ...user, summary: summarize(user.save) } }
    },
  )

  server.put<{ Params: { id: string }; Body: SaveBody }>(
    '/api/admin/users/:id/save',
    { preHandler: authorize },
    async (request, reply) => {
      const user = storage.getAdminUser(request.params.id)
      if (!user) return reply.code(404).send({ code: 'user-not-found' })
      const { baseVersion, data } = request.body ?? {}
      const snapshot = parseSaveSnapshot(data)
      if (!Number.isInteger(baseVersion) || Number(baseVersion) < 0 || !snapshot) {
        return reply.code(400).send({ code: 'invalid-save' })
      }
      const save = storage.putCloudSave(user.id, Number(baseVersion), snapshot)
      if (!save) {
        return reply.code(409).send({ code: 'save-conflict', save: storage.getCloudSave(user.id) })
      }
      return { save }
    },
  )

  server.post<{ Params: { id: string }; Body: GrantBody }>(
    '/api/admin/users/:id/grant',
    { preHandler: authorize },
    async (request, reply) => {
      const user = storage.getAdminUser(request.params.id)
      if (!user) return reply.code(404).send({ code: 'user-not-found' })
      const { albumId, baseVersion, itemId, quality = 100, quantity, type } = request.body ?? {}
      if (
        !Number.isInteger(baseVersion) ||
        Number(baseVersion) < 0 ||
        (type !== 'card' && type !== 'pack') ||
        typeof albumId !== 'string' ||
        !ITEM_ID_PATTERN.test(albumId) ||
        typeof itemId !== 'string' ||
        !ITEM_ID_PATTERN.test(itemId) ||
        (type === 'pack' && !PACK_ALBUMS[itemId]) ||
        !Number.isInteger(quantity) ||
        Number(quantity) < 1 ||
        Number(quantity) > 100 ||
        (type === 'card' &&
          (!Number.isFinite(quality) || Number(quality) < 1 || Number(quality) > 100))
      ) {
        return reply.code(400).send({ code: 'invalid-grant' })
      }

      const snapshot = user.save
        ? parseSaveSnapshot(user.save.data)
        : { schemaVersion: 1, tables: [] }
      if (!snapshot) return reply.code(400).send({ code: 'invalid-current-save' })
      const granted = grantItems(snapshot, {
        albumId,
        itemId,
        quality,
        quantity,
        type,
      })
      const save = storage.putCloudSave(user.id, Number(baseVersion), snapshot)
      if (!save) {
        return reply.code(409).send({ code: 'save-conflict', save: storage.getCloudSave(user.id) })
      }
      return { granted, save: { version: save.version, updatedAt: save.updatedAt } }
    },
  )

  server.post<{ Params: { id: string }; Body: { baseVersion?: unknown } }>(
    '/api/admin/users/:id/repair-packs',
    { preHandler: authorize },
    async (request, reply) => {
      const user = storage.getAdminUser(request.params.id)
      if (!user) return reply.code(404).send({ code: 'user-not-found' })
      const baseVersion = request.body?.baseVersion
      if (!Number.isInteger(baseVersion) || Number(baseVersion) < 0) {
        return reply.code(400).send({ code: 'invalid-save-version' })
      }
      const snapshot = user.save ? parseSaveSnapshot(user.save.data) : undefined
      if (!snapshot) return reply.code(400).send({ code: 'invalid-current-save' })
      const inventory = getOrCreateTable(snapshot, 'inventory')
      let repaired = 0
      for (const item of inventory.rows) {
        if (asRecord(item)?.type === 'pack' && !isValidPack(item) && normalizePack(item)) {
          repaired += 1
        }
      }
      const save = storage.putCloudSave(user.id, Number(baseVersion), snapshot)
      if (!save) {
        return reply.code(409).send({ code: 'save-conflict', save: storage.getCloudSave(user.id) })
      }
      return { repaired, save: { version: save.version, updatedAt: save.updatedAt } }
    },
  )
}
