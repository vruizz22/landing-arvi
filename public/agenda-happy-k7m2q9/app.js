import { firebaseConfig, USERS } from './config.js?v=4'

const FB = 'https://www.gstatic.com/firebasejs/10.12.2/'
const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'PEGAR_AQUI'
const $ = (s, el = document) => el.querySelector(s)
const $$ = (s, el = document) => [...el.querySelectorAll(s)]
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const BLOQUES = { AM: '11:00 a 14:00', PM: '17:00 a 20:00', ALT: '16:00 a 19:00', OTRO: '' }
const GARANTIA = 50000
// Festivos de fecha fija (para sugerir precio de fin de semana/festivo). Los móviles se ajustan a mano.
const FESTIVOS = ['01-01', '05-01', '05-21', '06-29', '07-16', '08-15', '09-18', '09-19', '10-12', '10-31', '11-01', '12-08', '12-25']

const state = { items: [], view: 'cal', y: 0, m: 0, user: '', editing: null }
let store = null

// ---------- utils ----------
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const parseISO = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d) }
const todayISO = () => iso(new Date())
const clp = (n) => (n == null || isNaN(n) ? '—' : '$' + Math.round(n).toLocaleString('es-CL'))
const num = (v) => {
  if (v == null || v === '') return null
  if (typeof v === 'number') return v
  const m = String(v).replace(/\./g, '').match(/\d+/)
  return m ? Number(m[0]) : null
}
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const isWeekendOrHoliday = (s) => { const d = parseISO(s); return d.getDay() === 0 || d.getDay() === 6 || FESTIVOS.includes(s.slice(5)) }
function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600) }

function calc(r) {
  const precio = num(r.precio)
  const pagado = (num(r.abono) || 0) + (num(r.saldoPagado) || 0)
  const pendiente = precio == null ? null : Math.max(0, precio - pagado)
  let color = 'red'
  if (r.estado === 'cancelado') color = 'gry'
  else if (precio != null && pendiente === 0) color = 'grn'
  else if (pagado > 0) color = 'yel'
  const pct = precio ? Math.min(100, Math.round((pagado / precio) * 100)) : 0
  return { precio, pagado, pendiente, color, pct }
}
function suggestPrice(r) {
  if (!r.fecha) return null
  let p
  if (/convenio|curso|jard|baby|reuni/i.test(r.tipo || '')) p = 250000
  else if (isWeekendOrHoliday(r.fecha)) p = r.bloque === 'AM' ? 180000 : 200000
  else p = 150000
  return p + (r.horaExtra ? 50000 : 0)
}
const daysUntil = (s) => Math.round((parseISO(s) - parseISO(todayISO())) / 86400000)

// ---------- data stores ----------
function demoStore() {
  const KEY = 'arvihappy-agenda-demo'
  const subs = []
  const load = () => {
    try { const v = JSON.parse(localStorage.getItem(KEY)); if (v) return v } catch (e) { /* vacío */ }
    const t = new Date(), y = t.getFullYear(), m = t.getMonth()
    const mk = (d, o) => ({ id: 'demo' + d + (o.nino || ''), fecha: iso(new Date(y, m, d)), bloque: 'PM', horario: BLOQUES.PM, tipo: 'Cumpleaños', estado: 'reservado', garantia: 'pendiente', ...o })
    return [
      mk(6, { responsable: 'Familia Ejemplo', nino: 'Sofía', precio: 200000, abono: 100000, contacto: '+56 9 1111 1111', personaje: 'Unicornio' }),
      mk(7, { responsable: 'Mamá de prueba', nino: 'Tomás', precio: 180000, abono: 90000, saldoPagado: 90000, bloque: 'AM', horario: BLOQUES.AM, garantia: 'pagada' }),
      mk(13, { responsable: 'Papá demo', nino: 'Martina', precio: 200000, abono: 0, notas: 'Decoración rosada' }),
      mk(14, { responsable: 'Jardín Las Flores', nino: 'Graduación', tipo: 'Convenio / curso / jardín', precio: 250000, abono: 125000, bloque: 'ALT', horario: BLOQUES.ALT }),
      mk(20, { responsable: 'Familia Test', nino: 'Benja', precio: 200000, abono: 200000, garantia: 'pagada' }),
    ]
  }
  let data = load()
  const emit = () => { localStorage.setItem(KEY, JSON.stringify(data)); subs.forEach((f) => f(data.slice())) }
  return {
    subscribe(cb) { subs.push(cb); cb(data.slice()); window.addEventListener('storage', (e) => { if (e.key === KEY) { data = load(); subs.forEach((f) => f(data.slice())) } }) },
    async save(r) { const id = r.id || 'r' + Date.now(); data = data.filter((x) => x.id !== id).concat({ ...r, id }); emit() },
    async saveMany(list) { const ids = new Set(list.map((x) => x.id)); data = data.filter((x) => !ids.has(x.id)).concat(list); emit() },
    async remove(id) { data = data.filter((x) => x.id !== id); emit() },
  }
}

async function firebaseStore(app) {
  const fs = await import(FB + 'firebase-firestore.js')
  const db = fs.getFirestore(app)
  const col = fs.collection(db, 'reservas')
  return {
    subscribe(cb) {
      fs.onSnapshot(col, { includeMetadataChanges: true }, (snap) => {
        setLive(!snap.metadata.fromCache)
        cb(snap.docs.filter((d) => !d.id.startsWith('gestion__')).map((d) => ({ id: d.id, ...d.data() }))) // los gestion__ son de arvi.cl/gestion
      }, (err) => { setLive(false); toast('Error de conexión: ' + err.code) })
    },
    async save(r) {
      const { id, ...rest } = r
      const ref = id ? fs.doc(db, 'reservas', id) : fs.doc(col)
      await fs.setDoc(ref, { ...rest, updatedBy: state.user, updatedAt: fs.serverTimestamp() })
    },
    async saveMany(list) {
      for (let i = 0; i < list.length; i += 400) {
        const b = fs.writeBatch(db)
        list.slice(i, i + 400).forEach(({ id, ...rest }) => b.set(fs.doc(db, 'reservas', id), { ...rest, updatedBy: state.user, updatedAt: fs.serverTimestamp() }))
        await b.commit()
      }
    },
    async remove(id) { await fs.deleteDoc(fs.doc(db, 'reservas', id)) },
  }
}
function setLive(on) { $('.live').classList.toggle('off', !on); $('#liveTxt').textContent = on ? 'En vivo' : 'Sin conexión' }

// ---------- auth ----------
let auth = null, authMod = null, fbApp = null
async function boot() {
  const now = new Date(); state.y = now.getFullYear(); state.m = now.getMonth()
  if (DEMO) {
    $('#demoBar').classList.remove('hidden')
    const u = sessionStorage.getItem('ah-demo-user')
    if (u) return enter(u)
    return showLogin()
  }
  const { initializeApp } = await import(FB + 'firebase-app.js')
  authMod = await import(FB + 'firebase-auth.js')
  fbApp = initializeApp(firebaseConfig)
  auth = authMod.getAuth(fbApp)
  authMod.onAuthStateChanged(auth, (u) => {
    if (u) {
      const name = Object.keys(USERS).find((k) => USERS[k] === u.email) || u.email
      enter(prettyUser(name))
    } else showLogin()
  })
}
const prettyUser = (k) => ({ arviadmin: 'ArviAdmin', coniadmin: 'ConiAdmin', bastianadmin: 'BastiánAdmin' })[k] || k
const normUser = (s) => s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

function showLogin() { $('#app').classList.add('hidden'); $('#login').classList.remove('hidden'); $('#lgUser').focus() }
$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault()
  const raw = $('#lgUser').value.trim(), pass = $('#lgPass').value
  const err = $('#lgErr'); err.textContent = ''
  // Se puede entrar con el usuario (ArviAdmin…) o directamente con el correo.
  let key = normUser(raw)
  if (raw.includes('@')) key = Object.keys(USERS).find((k) => USERS[k] === raw.toLowerCase()) || ''
  const email = raw.includes('@') ? raw.toLowerCase() : USERS[key]
  if (!email) { err.textContent = 'Usuario no encontrado. Escribe ArviAdmin, ConiAdmin o BastiánAdmin.'; return }
  if (DEMO) { sessionStorage.setItem('ah-demo-user', prettyUser(key)); return enter(prettyUser(key)) }
  try { await authMod.signInWithEmailAndPassword(auth, email, pass) }
  catch (ex) {
    console.warn(ex.code)
    err.textContent = ex.code === 'auth/too-many-requests' ? 'Demasiados intentos, espera un momento.'
      : ex.code === 'auth/network-request-failed' ? 'Sin conexión a internet.'
      : ex.code === 'auth/operation-not-allowed' ? 'El ingreso con correo no está habilitado en Firebase.'
      : 'Contraseña incorrecta o usuario no creado en Firebase (' + ex.code + ')'
  }
})
$('#btnLogout').addEventListener('click', async () => {
  if (DEMO) { sessionStorage.removeItem('ah-demo-user'); location.reload(); return }
  await authMod.signOut(auth); location.reload()
})

let entered = false
async function enter(user) {
  state.user = user
  $('#whoName').textContent = '👋 ' + user
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden')
  if (entered) return
  entered = true
  store = DEMO ? demoStore() : await firebaseStore(fbApp)
  store.subscribe((items) => { state.items = items; render() })
}

// ---------- render ----------
function monthItems(y = state.y, m = state.m) {
  const pre = `${y}-${pad(m + 1)}-`
  return state.items.filter((r) => r.fecha && r.fecha.startsWith(pre)).sort(sortItems)
}
const blockOrder = { AM: 0, ALT: 1, PM: 2, OTRO: 3 }
const sortItems = (a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : (blockOrder[a.bloque] ?? 9) - (blockOrder[b.bloque] ?? 9))

function render() {
  $('#monthTitle').textContent = `${MESES[state.m]} ${state.y}`
  renderStats(); renderAlerts()
  if (state.view === 'cal') renderCal($('#cal'), state.y, state.m, false)
  else renderList()
}

function statsFor(list) {
  const act = list.filter((r) => r.estado !== 'cancelado')
  let total = 0, pagado = 0, pend = 0, gar = 0, sinPrecio = 0
  act.forEach((r) => { const c = calc(r); if (c.precio == null) sinPrecio++; total += c.precio || 0; pagado += c.pagado; pend += c.pendiente || 0; if (r.garantia === 'pagada' || r.garantia === 'devuelta') gar++ })
  return { n: act.length, total, pagado, pend, gar, sinPrecio }
}
function renderStats() {
  const s = statsFor(monthItems())
  $('#stats').innerHTML = `
    <div class="stat s1" data-ico="🎈"><b>${s.n}</b><span>reservas del mes</span></div>
    <div class="stat s2" data-ico="🧾"><b>${clp(s.total)}</b><span>total a pagar${s.sinPrecio ? ` · ${s.sinPrecio} sin precio` : ''}</span></div>
    <div class="stat s3" data-ico="💚"><b>${clp(s.pagado)}</b><span>abonado / pagado</span></div>
    <div class="stat s4" data-ico="⏳"><b>${clp(s.pend)}</b><span>saldo pendiente</span></div>
    <div class="stat s5" data-ico="🛡️"><b>${s.gar} / ${s.n}</b><span>garantías pagadas</span></div>`
}
function renderAlerts() {
  const up = state.items.filter((r) => r.estado !== 'cancelado' && r.fecha && daysUntil(r.fecha) >= 0 && daysUntil(r.fecha) <= 7)
    .filter((r) => { const c = calc(r); return (c.pendiente ?? 1) > 0 || r.garantia === 'pendiente' }).sort(sortItems)
  $('#alerts').innerHTML = up.map((r) => {
    const c = calc(r), d = daysUntil(r.fecha)
    const when = d === 0 ? 'HOY' : d === 1 ? 'mañana' : `en ${d} días`
    const que = [(c.pendiente ?? 1) > 0 ? `saldo ${c.pendiente == null ? 'por definir' : clp(c.pendiente)}` : '', r.garantia === 'pendiente' ? 'garantía' : ''].filter(Boolean).join(' + ')
    return `<div class="alert" data-id="${esc(r.id)}">⚠️ <span><b>${esc(r.nino || r.responsable)}</b> (${when}, ${fmtDay(r.fecha)}) · falta cobrar ${que}${d <= 3 ? ' · <b>¡debía pagarse 3 días antes!</b>' : ''}</span></div>`
  }).join('')
  $$('#alerts .alert').forEach((a) => a.addEventListener('click', () => openForm(state.items.find((x) => x.id === a.dataset.id))))
}
const fmtDay = (s) => { const d = parseISO(s); return `${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()]} ${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)}` }

function evChip(r, big) {
  const c = calc(r)
  const warn = c.color !== 'gry' && (c.pendiente ?? 1) > 0 && daysUntil(r.fecha) >= 0 && daysUntil(r.fecha) <= 3 ? ' <span class="warn">⚠</span>' : ''
  const sub = big
    ? `${esc(r.horario || BLOQUES[r.bloque] || '')} · ${esc(r.responsable || '')}<br>${c.pendiente == null ? 'Precio por definir' : c.pendiente === 0 ? '✅ Pagado' : 'Debe ' + clp(c.pendiente)}`
    : `${esc(r.bloque === 'OTRO' ? r.horario || '' : r.bloque || '')}${c.pendiente ? ' · debe ' + clp(c.pendiente) : c.pendiente === 0 ? ' · ✅' : ''}`
  return `<div class="ev ${c.color}" data-id="${esc(r.id)}"><b>${esc(r.nino || r.responsable || 'Reserva')}${warn}</b><small>${sub}</small></div>`
}

function renderCal(el, y, m, exportMode) {
  const first = new Date(y, m, 1)
  const start = new Date(y, m, 1 - ((first.getDay() + 6) % 7))
  const items = state.items.filter((r) => r.fecha)
  const byDay = {}
  items.forEach((r) => (byDay[r.fecha] = byDay[r.fecha] || []).push(r))
  let html = DIAS.map((d, i) => `<div class="dow ${i > 4 ? 'we' : ''}">${d}</div>`).join('')
  const lastDay = new Date(y, m + 1, 0)
  const cells = Math.ceil(((first.getDay() + 6) % 7 + lastDay.getDate()) / 7) * 7
  const t = todayISO()
  for (let i = 0; i < cells; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const k = iso(d), out = d.getMonth() !== m
    const evs = (byDay[k] || []).sort(sortItems)
    const max = exportMode ? 4 : 3
    const cls = ['day', out ? 'out' : '', d.getDay() % 6 === 0 || FESTIVOS.includes(k.slice(5)) ? 'we' : '', k === t && !exportMode ? 'today' : ''].join(' ')
    html += `<div class="${cls}" data-day="${k}"><div class="n">${d.getDate()}</div>${out && exportMode ? '' : evs.slice(0, max).map((r) => evChip(r, exportMode)).join('')}${evs.length > max && !(out && exportMode) ? `<div class="more">+${evs.length - max} más</div>` : ''}</div>`
  }
  el.innerHTML = html
  if (!exportMode) $$('.day', el).forEach((c) => c.addEventListener('click', () => openDay(c.dataset.day)))
}

function itemCard(r) {
  const c = calc(r), d = parseISO(r.fecha)
  const tags = [
    `<span class="tag">${esc(r.tipo || 'Cumpleaños')}</span>`,
    `<span class="tag">${esc(r.horario || BLOQUES[r.bloque] || r.bloque || '')}</span>`,
    r.personaje ? `<span class="tag">⭐ ${esc(r.personaje)}</span>` : '',
    r.corporeo ? `<span class="tag">🧸 ${esc(r.corporeo)}</span>` : '',
    r.horaExtra ? '<span class="tag yel">+ hora extra</span>' : '',
    `<span class="tag ${r.garantia === 'pagada' || r.garantia === 'devuelta' ? 'grn' : r.garantia === 'na' ? '' : 'red'}">Garantía ${esc(r.garantia || 'pendiente')}</span>`,
    r.estado && r.estado !== 'reservado' ? `<span class="tag ${r.estado === 'cancelado' ? 'red' : 'grn'}">${esc(r.estado)}</span>` : '',
  ].join('')
  return `<div class="item" data-id="${esc(r.id)}">
    <div class="date"><small>${['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'][d.getDay()]}</small><b>${d.getDate()}</b><small>${MESES[d.getMonth()].slice(0, 3)}</small></div>
    <div><h4>${esc(r.nino || '—')} <span class="muted" style="font-weight:500">· ${esc(r.responsable || '')}</span></h4>
      <div class="sub">📞 ${esc(r.contacto || 'sin contacto')}${r.notas ? ' · 📝 ' + esc(r.notas).slice(0, 90) : ''}</div><div class="tags">${tags}</div></div>
    <div class="money"><span>${c.pendiente == null ? 'Precio por definir' : c.pendiente === 0 ? '✅ Pagado' : 'Saldo pendiente'}</span><b style="color:${c.pendiente ? 'var(--cherry)' : '#4a7a17'}">${c.pendiente ? clp(c.pendiente) : clp(c.precio)}</b>
      <span>Abonado ${clp(c.pagado)} de ${clp(c.precio)}</span><div class="bar"><i style="width:${c.pct}%"></i></div></div></div>`
}

function renderList() {
  const q = normUser($('#search').value || '')
  const f = $('#fltPay').value
  let list = $('#fltAll').checked ? state.items.filter((r) => r.fecha).sort(sortItems) : monthItems()
  if (q) list = list.filter((r) => normUser([r.responsable, r.nino, r.contacto, r.personaje, r.notas].join(' ')).includes(q))
  if (f === 'pend') list = list.filter((r) => { const c = calc(r); return r.estado !== 'cancelado' && (c.pendiente ?? 1) > 0 })
  if (f === 'ok') list = list.filter((r) => calc(r).pendiente === 0)
  if (f === 'gar') list = list.filter((r) => r.garantia === 'pendiente' && r.estado !== 'cancelado')
  $('#list').innerHTML = list.length ? list.map(itemCard).join('') : `<div class="empty"><img src="/happy/assets/nina.webp" alt="">No hay reservas para mostrar.</div>`
  $$('#list .item').forEach((el) => el.addEventListener('click', () => openForm(state.items.find((x) => x.id === el.dataset.id))))
}

// ---------- panels ----------
function openPanel(id) { $(id).classList.remove('hidden') }
function closePanels() { $$('.panel').forEach((p) => p.classList.add('hidden')) }
$$('[data-close]').forEach((b) => b.addEventListener('click', closePanels))
$$('.panel').forEach((p) => p.addEventListener('click', (e) => { if (e.target === p) closePanels() }))
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePanels() })

function openDay(k) {
  state.day = k
  const d = parseISO(k)
  $('#dayTitle').textContent = `${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`
  const evs = state.items.filter((r) => r.fecha === k).sort(sortItems)
  $('#dayList').innerHTML = evs.length ? evs.map(itemCard).join('') : `<div class="empty"><img src="/happy/assets/nino.webp" alt="">¡Día libre! Aún no hay reservas.</div>`
  $$('#dayList .item').forEach((el) => el.addEventListener('click', () => { closePanels(); openForm(state.items.find((x) => x.id === el.dataset.id)) }))
  openPanel('#dayPanel')
}
$('#dayAdd').addEventListener('click', () => { closePanels(); openForm(null, state.day) })
$('#btnNew').addEventListener('click', () => openForm(null))

const form = $('#resForm')
const MONEY = ['precio', 'abono', 'saldoPagado']
function fmtMoneyInput(v) { const n = num(v); return n == null ? '' : n.toLocaleString('es-CL') }
function readForm() {
  const fd = new FormData(form), r = {}
  for (const [k, v] of fd.entries()) r[k] = typeof v === 'string' ? v.trim() : v
  MONEY.forEach((k) => (r[k] = num(r[k])))
  r.horaExtra = form.horaExtra.checked
  return r
}
function updatePayBox() {
  const r = readForm(), c = calc(r), s = suggestPrice(r)
  $('#suggest').textContent = s && s !== c.precio ? `Sugerido: ${clp(s)} (usar)` : ''
  $('#payBox').innerHTML = `<div><span>Precio</span><b>${clp(c.precio)}</b></div><div><span>Abonado</span><b style="color:#4a7a17">${clp(c.pagado)}</b></div><div><span>Falta pagar</span><b style="color:var(--cherry)">${clp(c.pendiente)}</b></div><div class="bar"><i style="width:${c.pct}%"></i></div>`
}
$('#suggest').addEventListener('click', () => { const s = suggestPrice(readForm()); if (s) { form.precio.value = fmtMoneyInput(s); updatePayBox() } })
form.addEventListener('input', updatePayBox)
MONEY.forEach((k) => form[k].addEventListener('blur', () => { form[k].value = fmtMoneyInput(form[k].value); updatePayBox() }))
form.bloque.addEventListener('change', () => { if (BLOQUES[form.bloque.value]) form.horario.value = BLOQUES[form.bloque.value] })

function openForm(r, day) {
  state.editing = r ? r.id : null
  form.reset()
  $('#formTitle').textContent = r ? 'Editar reserva' : 'Nueva reserva 🎉'
  $('#btnDel').classList.toggle('hidden', !r)
  const v = r || { fecha: day || iso(new Date(state.y, state.m, Math.min(new Date().getDate(), 28))), bloque: 'PM', horario: BLOQUES.PM, garantia: 'pendiente', estado: 'reservado' }
  for (const el of form.elements) {
    if (!el.name) continue
    if (el.type === 'checkbox') el.checked = !!v[el.name]
    else el.value = MONEY.includes(el.name) ? fmtMoneyInput(v[el.name]) : v[el.name] ?? ''
  }
  if (!r) { const s = suggestPrice(v); if (s) form.precio.value = fmtMoneyInput(s) }
  const when = r && r.updatedAt ? (r.updatedAt.toDate ? r.updatedAt.toDate() : null) : null
  $('#formMeta').textContent = r && r.updatedBy ? `Última edición: ${r.updatedBy}${when ? ' · ' + when.toLocaleString('es-CL') : ''}` : ''
  updatePayBox(); openPanel('#formPanel')
}
form.addEventListener('submit', async (e) => {
  e.preventDefault()
  const r = readForm()
  if (!r.fecha) return
  const prev = state.items.find((x) => x.id === state.editing)
  const out = { ...(prev ? { createdBy: prev.createdBy || '' } : { createdBy: state.user }), ...r, id: state.editing || undefined }
  if (!out.id) delete out.id
  try { await store.save(out); closePanels(); toast('Reserva guardada ✨') } catch (ex) { toast('No se pudo guardar: ' + (ex.code || ex.message)) }
})
$('#btnDel').addEventListener('click', async () => {
  const r = state.items.find((x) => x.id === state.editing)
  if (!r || !confirm(`¿Eliminar la reserva de ${r.nino || r.responsable} del ${fmtDay(r.fecha)}? Esto no se puede deshacer.`)) return
  try { await store.remove(r.id); closePanels(); toast('Reserva eliminada') } catch (ex) { toast('No se pudo eliminar: ' + (ex.code || ex.message)) }
})

// ---------- toolbar ----------
$('#prevM').addEventListener('click', () => { state.m--; if (state.m < 0) { state.m = 11; state.y-- } render() })
$('#nextM').addEventListener('click', () => { state.m++; if (state.m > 11) { state.m = 0; state.y++ } render() })
$('#todayBtn').addEventListener('click', () => { const n = new Date(); state.y = n.getFullYear(); state.m = n.getMonth(); render() })
$$('.seg button').forEach((b) => b.addEventListener('click', () => {
  state.view = b.dataset.view; $$('.seg button').forEach((x) => x.classList.toggle('on', x === b))
  $('#calView').classList.toggle('hidden', state.view !== 'cal'); $('#listView').classList.toggle('hidden', state.view !== 'list'); render()
}))
;['#search', '#fltPay', '#fltAll'].forEach((s) => $(s).addEventListener('input', renderList))
$('#btnMore').addEventListener('click', (e) => { e.stopPropagation(); $('#ddMenu').classList.toggle('open') })
document.addEventListener('click', () => $('#ddMenu').classList.remove('open'))

// ---------- export ----------
function buildSheets() {
  const stage = $('#exportStage'); stage.innerHTML = ''
  const list = monthItems(), s = statsFor(list)
  const head = `<div class="xs-head"><img src="/happy/assets/logo.webp" alt=""><h1>Agenda · ${MESES[state.m]} ${state.y}</h1>
    <div class="sum"><div><b>${s.n}</b><span>reservas</span></div><div><b>${clp(s.total)}</b><span>total</span></div><div><b style="color:#4a7a17">${clp(s.pagado)}</b><span>abonado</span></div><div><b style="color:var(--cherry)">${clp(s.pend)}</b><span>pendiente</span></div></div></div>`
  const foot = `<div class="xs-foot"><span>ARVI HAPPY · Abate Molina 866, El Bosque · Metro Observatorio</span><span>Exportado por ${esc(state.user)} · ${new Date().toLocaleString('es-CL')}</span></div>`
  const a = document.createElement('div'); a.className = 'xs'; a.innerHTML = head + '<div class="cal"></div>' + foot
  stage.appendChild(a); renderCal($('.cal', a), state.y, state.m, true)
  const sheets = [a]
  const rows = list.map((r) => { const c = calc(r); return `<tr><td>${fmtDay(r.fecha)}</td><td>${esc(r.horario || BLOQUES[r.bloque] || '')}</td><td><b>${esc(r.nino || '')}</b><br>${esc(r.responsable || '')}</td><td>${esc(r.contacto || '')}</td><td class="num">${clp(c.precio)}</td><td class="num">${clp(c.pagado)}</td><td class="num" style="color:${c.pendiente ? 'var(--cherry)' : '#4a7a17'}"><b>${c.pendiente === 0 ? 'Pagado' : clp(c.pendiente)}</b></td><td>${esc(r.garantia || '')}</td><td>${esc([r.personaje, r.corporeo, r.horaExtra ? 'hora extra' : '', r.estado === 'cancelado' ? 'CANCELADO' : '', r.notas].filter(Boolean).join(' · '))}</td></tr>` })
  for (let i = 0; i < rows.length; i += 14) {
    const b = document.createElement('div'); b.className = 'xs'
    b.innerHTML = head + `<table><thead><tr><th>Fecha</th><th>Horario</th><th>Niño/a · Responsable</th><th>Contacto</th><th class="num">Precio</th><th class="num">Abonado</th><th class="num">Pendiente</th><th>Garantía</th><th>Info extra</th></tr></thead><tbody>${rows.slice(i, i + 14).join('')}</tbody></table>` + foot
    stage.appendChild(b); sheets.push(b)
  }
  return sheets
}
async function snap(el) {
  await document.fonts.ready
  return window.html2canvas(el, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true, logging: false })
}
const fname = (ext) => `Agenda_ArviHappy_${MESES[state.m]}_${state.y}.${ext}`
$('#expJpg').addEventListener('click', async () => {
  toast('Preparando imagen…')
  const [cal] = buildSheets(); const c = await snap(cal)
  const a = document.createElement('a'); a.download = fname('jpg'); a.href = c.toDataURL('image/jpeg', 0.92); a.click()
  $('#exportStage').innerHTML = ''
})
$('#expPdf').addEventListener('click', async () => {
  toast('Preparando PDF…')
  const sheets = buildSheets()
  const { jsPDF } = window.jspdf
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  for (let i = 0; i < sheets.length; i++) {
    const c = await snap(sheets[i])
    const W = 297, H = 210, r = Math.min((W - 10) / c.width, (H - 10) / c.height)
    if (i) pdf.addPage()
    pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', (W - c.width * r) / 2, 5, c.width * r, c.height * r)
  }
  pdf.save(fname('pdf')); $('#exportStage').innerHTML = ''
})

// ---------- imagen de fechas disponibles (sin datos de clientes) ----------
// Mañana = bloque AM (11:00 a 14:00). Tarde = bloques PM / alternativa (16:00 a 20:00), que se solapan.
function slotsTaken(dayISO) {
  let am = false, pm = false
  state.items.filter((r) => r.fecha === dayISO && r.estado !== 'cancelado').forEach((r) => {
    if (r.bloque === 'AM') am = true
    else if (r.bloque === 'PM' || r.bloque === 'ALT') pm = true
    else {
      const h = String(r.horario || '').match(/\d{1,2}/)
      const start = h ? Number(h[0]) : null
      if (start != null && start < 12) am = true
      else if (start != null && start >= 15) pm = true
      else { am = true; pm = true }
    }
  })
  return { am, pm }
}
function buildAvailSheet() {
  const stage = $('#exportStage'); stage.innerHTML = ''
  const y = state.y, m = state.m
  const first = new Date(y, m, 1), last = new Date(y, m + 1, 0)
  const lead = (first.getDay() + 6) % 7
  const cells = Math.ceil((lead + last.getDate()) / 7) * 7
  const t = todayISO()
  let grid = DIAS.map((d, i) => `<div class="dow ${i > 4 ? 'we' : ''}">${d}</div>`).join('')
  let libres = 0
  for (let i = 0; i < cells; i++) {
    const dn = i - lead + 1
    if (dn < 1 || dn > last.getDate()) { grid += '<div class="aday out"></div>'; continue }
    const k = iso(new Date(y, m, dn))
    if (k < t) { grid += `<div class="aday past"><div class="n">${dn}</div></div>`; continue }
    const { am, pm } = slotsTaken(k)
    const cls = am && pm ? 'full' : !am && !pm ? 'free' : 'half'
    if (cls !== 'full') libres++
    const slot = (taken, txt) => `<div class="slot ${taken ? 'no' : 'ok'}">${taken ? '—' : txt}</div>`
    grid += `<div class="aday ${cls}"><div class="n">${dn}</div>${cls === 'full' ? '<div class="slot no">Reservado</div>' : slot(am, '☀️ Mañana') + slot(pm, '🌙 Tarde')}</div>`
  }
  const el = document.createElement('div'); el.className = 'av'
  el.innerHTML = `<div class="av-head"><img src="/happy/assets/logo.webp" alt=""><h1>Fechas <span>disponibles</span></h1><h2>${MESES[m]} ${y}</h2></div>
    <div class="av-card"><div class="cal">${grid}</div>
      <div class="av-legend"><span><i style="border-color:var(--lime);background:#f3fbe9"></i>Disponible</span><span><i style="border-color:var(--sun);background:var(--sun-soft)"></i>Disponible solo un horario</span><span><i style="border-color:#ffd0d6;background:#ffe9ec"></i>Reservado</span></div></div>
    <div class="av-hours">☀️ Mañana: 11:00 a 14:00 &nbsp;·&nbsp; 🌙 Tarde: 17:00 a 20:00 o 16:00 a 19:00</div>
    <div class="av-foot"><div class="av-wa"><span class="ic"><svg width="32" height="32" viewBox="0 0 24 24"><path fill="#fff" d="M6.6 10.8a15.2 15.2 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1L6.6 10.8Z"/></svg></span><div><small>¡Reserva tu fecha por WhatsApp!</small><b>+56 9 8808 2320</b></div></div>
      <div class="av-addr"><b>Abate Molina 866, El Bosque</b><br><span>🚇 Metro Observatorio</span></div></div>`
  stage.appendChild(el)
  return { el, libres }
}
async function exportAvail() {
  toast('Preparando imagen de fechas disponibles…')
  const { el, libres } = buildAvailSheet()
  const c = await window.html2canvas(el, { scale: 1, backgroundColor: null, useCORS: true, logging: false })
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92))
  const name = `ArviHappy_fechas_disponibles_${MESES[state.m]}_${state.y}.jpg`
  $('#exportStage').innerHTML = ''
  const file = new File([blob], name, { type: 'image/jpeg' })
  // En el celular abre el menú de compartir (WhatsApp, etc.); en el computador descarga la imagen.
  if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
    try { await navigator.share({ files: [file], title: 'Fechas disponibles ARVI HAPPY' }); return } catch (e) { /* cancelado: descargar */ }
  }
  const a = document.createElement('a'); a.download = name; a.href = URL.createObjectURL(blob); a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
  toast(`✅ Imagen lista · ${libres} días con horario libre`)
}
$('#btnAvail').addEventListener('click', exportAvail)
$('#expAvail').addEventListener('click', exportAvail)

// ---------- import Excel (formato AGENDA_ARVIHAPPY) ----------
$('#btnImport').addEventListener('click', () => $('#fileImport').click())
$('#fileImport').addEventListener('change', async (e) => {
  const f = e.target.files[0]; e.target.value = ''
  if (!f) return
  try {
    const wb = window.XLSX.read(await f.arrayBuffer(), { type: 'array' })
    const list = parseAgenda(wb)
    if (!list.length) { toast('No encontré reservas en el archivo'); return }
    if (!confirm(`Encontré ${list.length} reservas en "${f.name}". Las que ya existan (misma fecha, responsable y niño) se actualizarán. ¿Importar?`)) return
    await store.saveMany(list); toast(`✅ ${list.length} reservas importadas`)
  } catch (ex) { console.error(ex); toast('No se pudo leer el archivo: ' + ex.message) }
})
const xlDate = (v) => {
  if (typeof v === 'number' && v > 30000 && v < 80000) { const d = new Date(Math.round((v - 25569) * 86400000)); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` }
  return null
}
const slug = (s) => normUser(s || '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)
function parseAgenda(wb) {
  const out = []
  for (const name of wb.SheetNames) {
    const rows = window.XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null })
    const hi = rows.findIndex((r) => r.some((c) => typeof c === 'string' && c.trim().toLowerCase() === 'fecha'))
    if (hi < 0) continue
    const H = rows[hi].map((c) => normUser(String(c ?? '')))
    const col = (...names) => H.findIndex((h) => names.some((n) => h.startsWith(n)))
    const C = { fecha: col('fecha'), resp: col('nombre resp'), nino: col('nombre ni'), abono: col('abono'), fAbono: col('fecha abono'), saldo: H.findIndex((h) => h === 'saldo'), fSaldo: col('fecha saldo'), contacto: col('contacto'), horario: col('horario'), personaje: col('personaje'), estado: col('estado', 'esrtado'), corp: col('corpo') }
    for (let i = hi + 1; i < rows.length; i++) {
      const row = rows[i]; const g = (k) => (C[k] >= 0 ? row[C[k]] : null)
      const fecha = xlDate(g('fecha')); const resp = String(g('resp') ?? '').trim(), nino = String(g('nino') ?? '').trim()
      if (!fecha || (!resp && !nino)) continue
      const extras = row.map((v, j) => (j > C.fecha && !Object.values(C).includes(j) && v != null && String(v).trim() ? String(v).trim() : null)).filter(Boolean)
      const saldoRaw = g('saldo'), estadoRaw = String(g('estado') ?? '').trim(), fSaldoRaw = g('fSaldo')
      const abono = num(g('abono')) || 0
      const saldoNum = num(saldoRaw)
      const conGar = /garant/i.test(String(saldoRaw ?? ''))
      const precio = saldoNum != null ? abono + saldoNum - (conGar ? GARANTIA : 0) : null
      const allTxt = [estadoRaw, String(fSaldoRaw ?? ''), ...extras].join(' ').toLowerCase()
      const pagadoOk = /^ok\b/.test(estadoRaw.toLowerCase()) || /^ok$/i.test(String(fSaldoRaw ?? '').trim()) || /garant[ií]a (ok|pagada)/.test(allTxt)
      const horario = String(g('horario') ?? '').trim()
      const h = horario.toLowerCase()
      const bloque = /am|^0?9|^11/.test(h) ? 'AM' : /16/.test(h) ? 'ALT' : /17|pm/.test(h) ? 'PM' : 'OTRO'
      const notas = [
        typeof saldoRaw === 'string' ? `Saldo en planilla: ${saldoRaw.trim()}` : saldoRaw != null ? `Saldo en planilla: ${clp(saldoRaw)}` : '',
        typeof g('fAbono') === 'string' ? `Abono: ${g('fAbono')}` : '',
        typeof fSaldoRaw === 'string' && !/^ok$/i.test(fSaldoRaw.trim()) ? `Pago saldo: ${fSaldoRaw}` : '',
        estadoRaw && !/^ok\.?$/i.test(estadoRaw) ? estadoRaw : '',
        ...extras,
      ].filter(Boolean).join(' · ')
      const contactoRaw = g('contacto')
      out.push({
        id: `x${fecha}_${slug(resp + '-' + nino) || i}`,
        fecha, bloque, horario: horario || BLOQUES[bloque], tipo: /jard|curso|kinder|escuela|graduac|colegio/i.test(nino + resp) ? 'Convenio / curso / jardín' : 'Cumpleaños',
        responsable: titleCase(resp), nino: titleCase(nino), contacto: contactoRaw == null ? '' : String(contactoRaw).trim(),
        precio, abono, fechaAbono: xlDate(g('fAbono')) || '',
        saldoPagado: pagadoOk && precio != null ? Math.max(0, precio - abono) : 0, fechaSaldo: xlDate(fSaldoRaw) || '',
        garantia: /devoluci/.test(allTxt) ? 'devuelta' : pagadoOk ? 'pagada' : 'pendiente',
        personaje: String(g('personaje') ?? '').replace(/^\*$/, '').replace(/\.$/, '').trim(), corporeo: String(g('corp') ?? '').trim(),
        horaExtra: /hora extra/i.test(allTxt + String(saldoRaw ?? '')),
        estado: fecha < todayISO() ? 'realizado' : 'reservado', notas, createdBy: state.user + ' (importado)',
      })
    }
  }
  return out
}
function titleCase(s) { return s && s === s.toUpperCase() ? s.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase()) : s }

boot().catch((e) => { console.error(e); document.body.insertAdjacentHTML('afterbegin', `<p class="demo">No se pudo iniciar la agenda: ${esc(e.message)}</p>`) })
