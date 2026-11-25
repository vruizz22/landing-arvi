// Genera public/gestion/ig-r7w2.json con TODAS las publicaciones de @arvi.cl y @arvihappy
// (para la sección "Instagram" de /gestion). Se ejecuta antes de `astro build`; nunca hace fallar el build.
import { writeFileSync } from 'node:fs'
const OUT = new URL('../public/gestion/ig-r7w2.json', import.meta.url)
const V = 'v25.0'
const FIELDS = 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{id,media_type,media_url,thumbnail_url}'
const ACCOUNTS = [
  { key: 'arvi', handle: 'arvi.cl', id: process.env.INSTAGRAM_USER_ID, token: process.env.INSTAGRAM_ACCESS_TOKEN },
  { key: 'happy', handle: 'arvihappy', id: process.env.INSTAGRAM_HAPPY_USER_ID, token: process.env.INSTAGRAM_HAPPY_ACCESS_TOKEN },
]
async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.error) throw new Error(j.error?.message || `HTTP ${r.status}`)
  return j
}
async function fetchAll(acc) {
  if (!acc.id || !acc.token) return { handle: acc.handle, posts: [], error: 'Faltan credenciales' }
  const posts = []
  let url = `https://graph.instagram.com/${V}/${acc.id}/media?fields=${encodeURIComponent(FIELDS)}&limit=50&access_token=${acc.token}`
  try {
    for (let i = 0; i < 40 && url; i++) {
      const j = await getJson(url)
      for (const m of j.data || []) {
        const media = (m.media_type === 'CAROUSEL_ALBUM' && m.children?.data?.length ? m.children.data : [m])
          .map(c => ({ t: c.media_type === 'VIDEO' ? 'v' : 'i', u: c.media_url || null, th: c.thumbnail_url || c.media_url || null }))
          .filter(x => x.u)
        if (!media.length) continue
        posts.push({ id: m.id, ty: m.media_type, d: m.timestamp, cap: m.caption || '', link: m.permalink, m: media })
      }
      url = j.paging?.next || null
    }
    return { handle: acc.handle, posts }
  } catch (e) {
    console.warn(`[ig-gestion:${acc.key}]`, e.message)
    return { handle: acc.handle, posts, error: e.message }
  }
}
try {
  const out = { updated: new Date().toISOString(), accounts: {} }
  for (const a of ACCOUNTS) { out.accounts[a.key] = await fetchAll(a); console.log(`[ig-gestion] @${a.handle}: ${out.accounts[a.key].posts.length} publicaciones`) }
  writeFileSync(OUT, JSON.stringify(out))
} catch (e) { console.warn('[ig-gestion] omitido:', e.message) }
