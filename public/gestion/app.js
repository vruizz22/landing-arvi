/* ARVI · Gestión — eventos, equipo y cobranza conectados.
   Usa el mismo Firebase y los mismos usuarios que la agenda de ARVI HAPPY (Authentication + Firestore). */
import { firebaseConfig, USERS } from '../agenda-happy-k7m2q9/config.js?v=4';
const FB = 'https://www.gstatic.com/firebasejs/10.12.2/';
const DEMO = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'PEGAR_AQUI';
const PREFIX = 'gestion__', COLL = 'reservas', LS_DEMO = 'arviGestion.demo.v1';
const ROLES = ['Montaje', 'Funcionamiento', 'Desmontaje', 'ARVI Happy', 'Grúa'];
const RCLS = { Montaje: 'r-mont', Funcionamiento: 'r-func', Desmontaje: 'r-desm', 'ARVI Happy': 'r-happy', 'Grúa': 'r-grua' };
const RCOL = { Montaje: '#fde4cf', Funcionamiento: '#d8efc9', Desmontaje: '#e3e3fb', 'ARVI Happy': '#fbd5f3', 'Grúa': '#d5e7fb' };
const GRUPOS = ['Operador', 'Grúa', 'Apoyo externo'];
/* roles y grupos personalizados (Ajustes) — se guardan en la nube y se suman a los de siempre */
const BASE_ROLES = ROLES.slice(), BASE_GRUPOS = GRUPOS.slice(), RPAL = ['#ffe0a3', '#cdeefa', '#f9d0c4', '#e2d6fb', '#d3f0e0', '#f5e1b8'];
const rolesCfg = () => (typeof DB !== 'undefined' && DB.dias.find(d => d.id === 'roles')) || { id: 'roles', roles: [], grupos: [] };
function applyCfg() {
  const rc = rolesCfg(); ROLES.splice(0, ROLES.length, ...BASE_ROLES, ...(rc.roles || []).filter(r => !BASE_ROLES.includes(r)));
  GRUPOS.splice(0, GRUPOS.length, ...BASE_GRUPOS, ...(rc.grupos || []).filter(g => !BASE_GRUPOS.includes(g)));
  ROLES.slice(BASE_ROLES.length).forEach((r, i) => { RCLS[r] = 'r-c' + (i % 6); RCOL[r] = RPAL[i % 6]; });
}
function addRole(n) { n = String(n || '').trim(); if (!n) return ''; const rc = rolesCfg(); if (!ROLES.includes(n)) { upsert('dias', { ...rc, roles: [...(rc.roles || []), n] }); applyCfg(); toast('Rol "' + n + '" agregado'); } return n; }
function addGroup(n) { n = String(n || '').trim(); if (!n) return ''; const rc = rolesCfg(); if (!GRUPOS.includes(n)) { upsert('dias', { ...rc, grupos: [...(rc.grupos || []), n] }); applyCfg(); toast('Grupo "' + n + '" agregado'); } return n; }
// "+ Nuevo rol / persona / grupo" en cualquier lista desplegable
document.addEventListener('change', e => {
  const sel = e.target; if (!(sel instanceof HTMLSelectElement)) return; const v = sel.value;
  if (!['__newrole', '__newwk', '__newgrp'].includes(v)) return;
  const ask = v === '__newrole' ? 'Nombre del nuevo rol (ej: Animador, Bodega, Chofer):' : v === '__newgrp' ? 'Nombre del nuevo grupo:' : 'Nombre completo de la nueva persona:';
  const n = (prompt(ask) || '').trim(); let val = '';
  if (n && v === '__newrole') val = addRole(n);
  if (n && v === '__newgrp') val = addGroup(n);
  if (n && v === '__newwk') { const ex = DB.workers.find(w => norm(w.nombre) === norm(n)); val = ex ? ex.id : upsert('workers', { nombre: n, rut: '', telefono: '', grupo: GRUPOS[0], funcion: '', activo: true, notas: '' }).id; if (!ex) toast(n + ' agregado al equipo · completa su RUT en Equipo'); }
  if (val && ![...sel.options].some(o => o.value === val)) sel.insertAdjacentHTML('afterbegin', `<option value="${esc(val)}">${esc(v === '__newwk' ? n : val)}</option>`);
  sel.value = val || (sel.options[0] ? sel.options[0].value : '');
}, true);
const EST_EV = ['Por confirmar', 'Confirmado', 'Realizado', 'Cancelado'];
const EST_MAN = ['', 'NC', 'NULO', 'SALTO SII'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DOWS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/* ---------- utilidades ---------- */
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = n => '$' + Math.round(Number(n) || 0).toLocaleString('es-CL');
const num = v => { if (typeof v === 'number') return v; const s = String(v ?? '').replace(/[$\s.]/g, '').replace(',', '.'); const n = parseFloat(s); return isNaN(n) ? 0 : n; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const pad = n => String(n).padStart(2, '0');
const iso = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const pd = s => { if (!s) return null; const p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
const today = () => iso(new Date());
const addDays = (s, n) => { const d = pd(s); d.setDate(d.getDate() + n); return iso(d); };
const diffDays = (a, b) => Math.round((pd(a) - pd(b)) / 864e5);
const fdate = s => { if (!s) return '—'; const d = pd(s); return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + d.getFullYear(); };
const fshort = s => { const d = pd(s); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3); };
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const rutKey = s => String(s ?? '').replace(/[^0-9kK]/g, '').toUpperCase();
function lev(a, b) { const m = a.length, n = b.length, d = Array.from({ length: m + 1 }, (_, i) => [i]); for (let j = 1; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
// ARVI Happy es externo: aparece en turnos y pagos, pero no cuenta como evento ni ocupa fechas
const isExt = e => !!(e && (e.externo || /arvi\s*happy/i.test(e.nombre || '')));
function daysBetween(a, b) { const out = []; if (!a) return out; let d = a; const end = b && b >= a ? b : a; let guard = 0; while (d <= end && guard++ < 120) { out.push(d); d = addDays(d, 1); } return out; }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.append(msg); t.style.bottom = (22 + 62 * document.querySelectorAll('.toast:not(.out)').length) + 'px'; document.body.appendChild(t); setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 320); }, 2600); }
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function b64big(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

/* ---------- datos (Firestore en vivo) ---------- */
const COLS = ['workers', 'vehicles', 'clients', 'events', 'shifts', 'invoices', 'dias', 'material'];
const blank = () => ({ workers: [], vehicles: [], clients: [], events: [], shifts: [], invoices: [], dias: [], material: [] });
let DB = blank(), FS = null, db = null, auth = null, authMod = null, USER = '';
const byId = (col, id) => DB[col].find(x => x.id === id);
const clean = o => JSON.parse(JSON.stringify(o));
let queue = [], qTimer = null;
function enqueue(op) { queue.push(op); clearTimeout(qTimer); qTimer = setTimeout(flush, 40); setSync('busy', 'Guardando…'); }
async function flush() {
  const ops = queue; queue = [];
  if (DEMO) { try { localStorage.setItem(LS_DEMO, JSON.stringify({ ...DB, trash: TRASH })); } catch (e) { } setSync('off', 'Modo demo · solo en este navegador'); return; }
  try {
    for (let i = 0; i < ops.length; i += 400) {
      const bt = FS.writeBatch(db);
      for (const o of ops.slice(i, i + 400)) { const ref = FS.doc(db, COLL, PREFIX + o.col + '__' + o.id); bt.set(ref, { ...o.rec, _g: o.col }); }
      await bt.commit();
    }
    setSync('ok', 'Guardado · en vivo');
  } catch (e) { console.warn(e); setSync('bad', 'Error al guardar (' + (e.code || e.message) + ')'); toast('No se pudo guardar: ' + (e.code === 'permission-denied' ? 'faltan permisos en Firebase (reglas)' : e.code || e.message)); }
}
function upsert(col, rec) {
  rec.u = Date.now(); rec.por = USER; if (!rec.id) rec.id = uid();
  const i = DB[col].findIndex(x => x.id === rec.id); if (i >= 0) DB[col][i] = rec; else DB[col].push(rec);
  enqueue({ col, id: rec.id, rec: clean(rec) }); return rec;
}
// Nunca se borra nada de verdad: lo eliminado va a la papelera (Ajustes) y se puede recuperar.
let TRASH = [];
function removeRec(col, id) { const r = byId(col, id); if (!r) return; DB[col] = DB[col].filter(x => x.id !== id); const t = { ...r, borrado: true, borradoEl: Date.now(), borradoPor: USER, u: Date.now() }; TRASH.push({ col, rec: t }); enqueue({ col, id, rec: clean(t) }); }
function restoreRec(col, id) { const t = TRASH.find(x => x.col === col && x.rec.id === id); if (!t) return; TRASH = TRASH.filter(x => x !== t); const r = { ...t.rec }; delete r.borrado; delete r.borradoEl; delete r.borradoPor; upsert(col, r); }
window.restoreRec = (c, i) => { restoreRec(c, i); render(); toast('Recuperado'); };
let rTimer = null; const scheduleRender = () => { clearTimeout(rTimer); rTimer = setTimeout(() => { if (!$('#app').classList.contains('hidden')) render(); }, 250); };
function subscribe() {
  if (DEMO) { try { const d = JSON.parse(localStorage.getItem(LS_DEMO) || '{}'); DB = Object.assign(blank(), d); TRASH = d.trash || []; delete DB.trash; } catch (e) { } setSync('off', 'Modo demo · solo en este navegador'); return; }
  // Los datos viven en la misma base del calendario (colección 'reservas'), con ids gestion__<tipo>__<id>.
  let first = true;
  FS.onSnapshot(FS.collection(db, COLL), { includeMetadataChanges: true }, snap => {
    const nb = blank(), tr = [];
    for (const d of snap.docs) { if (!d.id.startsWith(PREFIX)) continue; const x = d.data(), col = x._g; if (!nb[col]) continue; const rec = { ...x, id: d.id.slice(PREFIX.length + col.length + 2) }; delete rec._g; (rec.borrado ? tr.push({ col, rec }) : nb[col].push(rec)); }
    DB = nb; TRASH = tr;
    if (!queue.length) setSync(snap.metadata.fromCache ? 'busy' : 'ok', snap.metadata.fromCache ? 'Conectando…' : 'En vivo · ' + USER);
    if (first && !snap.metadata.fromCache) { first = false; hideSplash(); return; }
    if (!snap.metadata.hasPendingWrites) scheduleRender();
  }, err => { console.warn(err); setSync('bad', err.code === 'permission-denied' ? 'Sin permisos' : 'Sin conexión'); });
}
function setSync(s, txt) { const d = $('#syncDot'); if (d) { d.className = 'dot ' + s; $('#syncTxt').textContent = txt; } const m = $('#syncM'); if (m) { m.textContent = '● ' + (s === 'ok' ? 'En vivo' : s === 'busy' ? 'Guardando' : s === 'bad' ? 'Error' : 'Demo'); m.className = 'pill ' + (s === 'ok' ? 'p-pagada' : s === 'bad' ? 'p-venc' : 'p-pend'); } }

/* ---------- ingreso (mismos usuarios que la agenda ARVI HAPPY) ---------- */
const prettyUser = k => ({ arviadmin: 'ArviAdmin', coniadmin: 'ConiAdmin', bastianadmin: 'BastiánAdmin' })[k] || k;
const normUser = s => s.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
async function boot() {
  if (DEMO) { const u = sessionStorage.getItem('arviGestion.demoUser'); if (u) enter(u); return; }
  const { initializeApp, getApps } = await import(FB + 'firebase-app.js');
  authMod = await import(FB + 'firebase-auth.js'); FS = await import(FB + 'firebase-firestore.js');
  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  auth = authMod.getAuth(app); db = FS.getFirestore(app);
  authMod.onAuthStateChanged(auth, u => { if (u) enter(prettyUser(Object.keys(USERS).find(k => USERS[k] === u.email) || u.email)); });
}
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); const raw = $('#lgUser').value.trim(), pass = $('#pw').value, err = $('#loginErr'); err.textContent = '';
  let key = normUser(raw); if (raw.includes('@')) key = Object.keys(USERS).find(k => USERS[k] === raw.toLowerCase()) || '';
  const email = raw.includes('@') ? raw.toLowerCase() : USERS[key];
  if (!email) { err.textContent = 'Usuario no encontrado. Escribe ArviAdmin, ConiAdmin o BastiánAdmin.'; return; }
  if (DEMO) { sessionStorage.setItem('arviGestion.demoUser', prettyUser(key)); return enter(prettyUser(key)); }
  err.textContent = ''; $('#lgBtn').classList.add('loading');
  const slow = setTimeout(() => { if (!entered) err.textContent = 'Está tardando… revisa tu conexión y vuelve a intentar.'; }, 15000);
  try {
    try { await BOOT; } catch (x) { BOOT = boot(); await BOOT; }
    const cred = await authMod.signInWithEmailAndPassword(auth, email, pass);
    clearTimeout(slow); err.textContent = ''; $('#lgBtn').classList.remove('loading');
    enter(prettyUser(Object.keys(USERS).find(k => USERS[k] === cred.user.email) || cred.user.email));
  } catch (ex) {
    clearTimeout(slow); console.warn(ex); $('#lgBtn').classList.remove('loading');
    err.textContent = ex.code === 'auth/too-many-requests' ? 'Demasiados intentos, espera un momento.' : ex.code === 'auth/network-request-failed' ? 'Sin conexión a internet.' : ['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(ex.code) ? 'Usuario o contraseña incorrectos' : 'No se pudo entrar (' + (ex.code || ex.message) + ')';
  }
});
let entered = false;
function hideSplash() { const sp = $('#splash'); if (sp.classList.contains('out')) return; sp.classList.add('out'); if (VIEW) render(true); }
function enter(user) {
  USER = user; $('#login').classList.add('hidden'); $('#app').classList.remove('hidden'); $('#who').textContent = user;
  if (entered) return; entered = true;
  if (!DEMO) { $('#splash').classList.remove('out'); setTimeout(hideSplash, 6000); }
  try { go(location.hash.replace('#', '').split('?')[0] || 'inicio'); } catch (e) { console.error(e); $('#view').innerHTML = '<div class="card"><h3>Error al mostrar</h3><p class="muted">' + esc(e.message) + '</p></div>'; }
  try { subscribe(); } catch (e) { console.error(e); setSync('bad', 'Error: ' + e.message); }
}
$('#logout').onclick = async () => { if (DEMO) sessionStorage.removeItem('arviGestion.demoUser'); else await authMod.signOut(auth); location.reload(); };

/* ---------- navegación ---------- */
let VIEW = 'inicio', ST = { month: today().slice(0, 7), evMode: 'lista', evQ: '', evEst: '', invQ: '', invEst: '', invCli: '', invYear: '', eqTab: 'personas' };
$$('.nav[data-v]').forEach(b => b.onclick = () => go(b.dataset.v));
window.go = go;
function go(v) { if (!VIEWS[v]) v = 'inicio'; VIEW = v; history.replaceState(null, '', '#' + v); $$('.nav[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v)); render(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function render(anim) {
  applyCfg(); const v = $('#view'); v.classList.remove('enter'); v.innerHTML = ''; VIEWS[VIEW]();
  if (!anim) { $$('.val[data-n]', v).forEach(x => x.textContent = x.dataset.f === 'm' ? money(+x.dataset.n) : x.dataset.n); return; }
  [...v.children].forEach((c, i) => c.style.setProperty('--i', i));
  $$('.grid > .card, .list > .item', v).forEach((c, i) => { c.classList.add('anim'); c.style.setProperty('--i', i + 1); });
  $$('tbody', v).forEach(tb => [...tb.children].forEach((r, i) => r.style.setProperty('--i', i)));
  void v.offsetWidth; v.classList.add('enter'); countUp(v);
}
function countUp(root) {
  $$('.val[data-n]', root).forEach(x => {
    const n = +x.dataset.n, f = x.dataset.f === 'm' ? money : y => String(y), t0 = performance.now(), D = 900;
    const step = t => { const p = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - p, 3); x.textContent = f(Math.round(n * e)); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ---------- dominio ---------- */
const evName = id => (byId('events', id) || {}).nombre || '—';
const cliName = id => (byId('clients', id) || {}).nombre || '—';
const wName = id => (byId('workers', id) || {}).nombre || '—';
const evDays = e => daysBetween(e.inicio, e.fin);
function invCalc(f) {
  const bruto = num(f.bruto) || Math.round(num(f.neto) * 1.19), neto = num(f.neto) || Math.round(bruto / 1.19), iva = bruto - neto;
  const pagado = (f.abonos || []).reduce((s, a) => s + num(a.monto), 0); const venc = f.venc || (f.emision ? addDays(f.emision, 30) : '');
  let estado, cls, saldo = Math.max(0, bruto - pagado), dias = venc ? diffDays(venc, today()) : null;
  const m = f.estadoManual || '';
  if (m === 'NC') { estado = 'Nota de crédito'; cls = 'p-nc'; saldo = 0; }
  else if (m === 'NULO') { estado = 'Nula'; cls = 'p-nulo'; saldo = 0; }
  else if (m === 'SALTO SII') { estado = 'Salto SII'; cls = 'p-salto'; saldo = 0; }
  else if (m === 'PAGADA' || (bruto > 0 && saldo <= 0)) { estado = 'Pagada'; cls = 'p-pagada'; saldo = 0; }
  else if (dias !== null && dias < 0) { estado = 'Vencida'; cls = 'p-venc'; }
  else if (dias !== null && dias <= 7) { estado = 'Por vencer'; cls = 'p-porv'; }
  else { estado = pagado > 0 ? 'Abonada' : 'Pendiente'; cls = 'p-pend'; }
  const open = ['Vencida', 'Por vencer', 'Pendiente', 'Abonada'].includes(estado);
  const label = pagado > 0 && saldo > 0 && estado !== 'Abonada' && ['Vencida', 'Por vencer'].includes(estado) ? estado + ' · abonada' : estado;
  return { bruto, neto, iva, pagado, saldo, venc, dias, estado, cls, open, label };
}
const evCls = e => ({ 'Confirmado': 'p-conf', 'Por confirmar': 'p-porc', 'Realizado': 'p-real', 'Cancelado': 'p-canc' }[e.estado] || 'p-porc');
function evStats(e) {
  const sh = DB.shifts.filter(s => s.eventId === e.id), costo = sh.reduce((s, x) => s + num(x.pago), 0);
  const inv = DB.invoices.filter(f => (f.eventIds || []).includes(e.id)); let fact = 0, cobrado = 0, saldo = 0;
  for (const f of inv) { const c = invCalc(f); if (['Nota de crédito', 'Nula', 'Salto SII'].includes(c.estado)) continue; fact += c.neto; cobrado += c.bruto - c.saldo; saldo += c.saldo; }
  return { sh, costo, inv, fact, cobrado, saldo, margen: (fact || num(e.monto)) - costo };
}
function sortedWorkers() { return [...DB.workers].sort((a, b) => GRUPOS.indexOf(a.grupo) - GRUPOS.indexOf(b.grupo) || (a.orden ?? 999) - (b.orden ?? 999) || a.nombre.localeCompare(b.nombre)); }
function clientStats(c) {
  const inv = DB.invoices.filter(f => f.clienteId === c.id); let fact = 0, saldo = 0, venc = 0;
  for (const f of inv) { const k = invCalc(f); if (!k.open && k.estado !== 'Pagada') continue; fact += k.bruto; saldo += k.saldo; if (k.estado === 'Vencida') venc += k.saldo; }
  return { inv, fact, saldo, venc, evs: DB.events.filter(e => e.clienteId === c.id) };
}
function ensureClient(nombre, rut) {
  const rk = rutKey(rut), nk = norm(nombre); if (!nk && !rk) return '';
  let c = DB.clients.find(x => (rk && rutKey(x.rut) === rk) || (!rk && norm(x.nombre) === nk));
  if (!c) c = upsert('clients', { nombre: String(nombre || '').trim(), rut: rut || '', contacto: '', telefono: '', email: '', notas: '' });
  return c.id;
}

/* ---------- componentes ---------- */
const I = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  img: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 16l-5-5-9 9"/></svg>',
  xls: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 3h9l4 4v14H6z"/><path d="M9 11l5 6M14 11l-5 6"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg>',
};
function el(html) { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
function head(title, sub, actions = '') { return `<div class="top"><div><h2>${title}</h2>${sub ? `<div class="sub">${sub}</div>` : ''}</div><div class="row">${actions}</div></div>`; }
function opts(list, sel, lab = x => x, val = x => x) { return list.map(x => `<option value="${esc(val(x))}"${String(val(x)) === String(sel ?? '') ? ' selected' : ''}>${esc(lab(x))}</option>`).join(''); }
function modal(html, wide) {
  const m = el(`<div class="modal"><div class="sheet${wide ? ' wide' : ''}">${html}</div></div>`);
  m.addEventListener('mousedown', e => { if (e.target === m) close(); }); const close = () => { if (m.classList.contains('closing')) return; m.classList.add('closing'); setTimeout(() => m.remove(), 200); };
  $('#modalRoot').appendChild(m); $$('[data-close]', m).forEach(b => b.onclick = close); return { m, close };
}
function formData(root) { const o = {}; $$('[name]', root).forEach(i => { o[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); return o; }
const monthLabel = ym => { const [y, m] = ym.split('-'); return MESES[+m - 1][0].toUpperCase() + MESES[+m - 1].slice(1) + ' ' + y; };
const shiftMonth = (ym, d) => { const [y, m] = ym.split('-').map(Number); const dt = new Date(y, m - 1 + d, 1); return dt.getFullYear() + '-' + pad(dt.getMonth() + 1); };

/* ================= VISTAS ================= */
const VIEWS = {};
I.dl = I.dl || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>';
I.doc = I.doc || '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/></svg>';
const KI = {
  cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  money: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/><path d="M6 9.5v.01M18 15.5v.01"/></svg>',
  alert: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 3l9.5 17h-19z"/><path d="M12 10v4M12 17.5v.01"/></svg>',
  team: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><circle cx="17.5" cy="9" r="2.5"/><path d="M16 14.6c2.6.1 4.6 1.7 5.4 4.4"/></svg>' };
VIEWS.inicio = () => {
  const t = today(), ym = t.slice(0, 7), in7 = addDays(t, 7);
  const prox = DB.events.filter(e => e.estado !== 'Cancelado' && !isExt(e) && (e.fin || e.inicio) >= t).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const mes = DB.events.filter(e => e.estado !== 'Cancelado' && !isExt(e) && (e.inicio || '').slice(0, 7) === ym);
  const calcs = DB.invoices.map(f => [f, invCalc(f)]); const abiertas = calcs.filter(([, c]) => c.open);
  const porCobrar = abiertas.reduce((s, [, c]) => s + c.saldo, 0), vencido = abiertas.filter(([, c]) => c.estado === 'Vencida').reduce((s, [, c]) => s + c.saldo, 0);
  const pagoMes = DB.shifts.filter(s => (s.fecha || '').slice(0, 7) === ym).reduce((s, x) => s + num(x.pago), 0);
  const alertas = abiertas.filter(([, c]) => c.estado === 'Vencida' || c.estado === 'Por vencer').sort((a, b) => (a[1].dias ?? 0) - (b[1].dias ?? 0));
  const v = $('#view');
  const nombre = (USER || 'equipo').replace(/admin$/i, '');
  const hora = new Date().getHours(), saludo = hora < 12 ? 'Buenos días' : hora < 20 ? 'Buenas tardes' : 'Buenas noches';
  v.innerHTML = `<div class="hero"><div class="bunting"></div><img class="hz" src="zorro-hola.webp" alt="">
      <h2>${saludo}, <em>${esc(nombre)}</em></h2><div class="sub">${(d => d[0].toUpperCase() + d.slice(1))(new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</div>
      <div class="chipsH"><span><b>${DB.events.filter(e => !isExt(e)).length}</b> eventos</span><span><b>${DB.workers.length}</b> personas</span><span><b>${DB.clients.length}</b> clientes</span><span><b>${DB.invoices.length}</b> facturas</span></div>
      <div class="row"><button class="btn y" id="nEv">${I.plus}Nuevo evento</button><button class="btn ghost" id="nInv">${I.plus}Nueva factura</button></div></div>` +
    `<div class="grid kpis">
      <div class="card kpi"><span class="ico">${KI.cal}</span><div class="lab">Eventos este mes</div><div class="val" data-n="${mes.length}">${mes.length}</div><div class="foot">${prox.filter(e => e.inicio <= in7).length} en los próximos 7 días</div></div>
      <div class="card kpi"><span class="ico">${KI.money}</span><div class="lab">Por cobrar</div><div class="val" data-n="${porCobrar}" data-f="m">${money(porCobrar)}</div><div class="foot">${abiertas.length} facturas abiertas</div></div>
      <div class="card kpi ${vencido ? 'warn' : ''}"><span class="ico">${KI.alert}</span><div class="lab">Vencido</div><div class="val" data-n="${vencido}" data-f="m">${money(vencido)}</div><div class="foot">${abiertas.filter(([, c]) => c.estado === 'Vencida').length} facturas vencidas</div></div>
      <div class="card kpi"><span class="ico">${KI.team}</span><div class="lab">Pago equipo · ${MESES[new Date().getMonth()]}</div><div class="val" data-n="${pagoMes}" data-f="m">${money(pagoMes)}</div><div class="foot">${DB.shifts.filter(s => (s.fecha || '').slice(0, 7) === ym).length} turnos asignados</div></div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><h3>${prox.length ? 'Próximos eventos' : 'Eventos de ' + MESES[new Date().getMonth()]}</h3><div class="list" id="hEv">${(prox.length ? prox : mes.slice().sort((a, b) => b.inicio.localeCompare(a.inicio))).slice(0, 8).map(e => evItem(e)).join('') || '<div class="empty"><img src="zorro.webp" alt="">Aún no hay eventos. Crea uno o importa tu Excel en Ajustes.</div>'}</div></div>
      <div class="card"><h3>Cobranza que requiere atención</h3><div class="list">${alertas.slice(0, 8).map(([f, c]) => `<div class="item" data-inv="${f.id}"><div class="grow"><div class="ell"><b>N° ${esc(f.numero)}</b> · ${esc(cliName(f.clienteId))}</div><div class="muted">${c.estado === 'Vencida' ? 'Venció hace ' + (-c.dias) + ' días' : 'Vence en ' + c.dias + ' días'} · saldo ${money(c.saldo)}</div></div><span class="pill ${c.cls}">${c.label}</span></div>`).join('') || '<div class="empty">Todo al día 🎉</div>'}</div></div>
    </div>`;
  $('#nEv').onclick = () => eventModal(); $('#nInv').onclick = () => invoiceModal();
  bindItems(v);
};
function evItem(e) { const d = pd(e.inicio); const st = evStats(e); return `<div class="item" data-ev="${e.id}"><div class="date"><b>${d.getDate()}</b><small>${MESES[d.getMonth()].slice(0, 3)}</small></div><div class="grow"><div class="ell"><b>${esc(e.nombre)}</b></div><div class="muted ell">${esc(cliName(e.clienteId))}${e.ubicacion ? ' · ' + esc(e.ubicacion) : ''} · ${new Set(st.sh.map(s => s.workerId)).size} personas</div></div><span class="pill ${evCls(e)}">${esc(e.estado)}</span></div>`; }
function bindItems(root) { $$('[data-ev]', root).forEach(x => x.onclick = () => eventModal(byId('events', x.dataset.ev))); $$('[data-inv]', root).forEach(x => x.onclick = () => invoiceModal(byId('invoices', x.dataset.inv))); }

/* ---- Eventos ---- */
VIEWS.eventos = () => {
  const v = $('#view');
  v.innerHTML = head('Eventos', 'Cada evento conecta cliente, equipo, vehículos y facturas', `<button class="btn ghost" id="toDisp">${I.cal || ''}Fechas disponibles</button><button class="btn ghost" id="xEv">${I.xls}Excel</button><button class="btn y" id="nEv">${I.plus}Nuevo evento</button>`) +
    `<div class="tools"><div class="row"><button class="btn sm ${ST.evMode === 'lista' ? '' : 'ghost'}" data-m="lista">Lista</button><button class="btn sm ${ST.evMode === 'cal' ? '' : 'ghost'}" data-m="cal">Calendario</button></div>
     <input class="search" id="q" placeholder="Buscar evento, cliente o lugar" value="${esc(ST.evQ)}"><select id="fe"><option value="">Todos los estados</option>${opts(EST_EV, ST.evEst)}</select></div><div id="evBody"></div>`;
  $('#nEv').onclick = () => eventModal(); $('#xEv').onclick = exportEventsXlsx; $('#toDisp').onclick = () => go('disp');
  $$('[data-m]', v).forEach(b => b.onclick = () => { ST.evMode = b.dataset.m; render(); });
  $('#q').oninput = e => { ST.evQ = e.target.value; body(); }; $('#fe').onchange = e => { ST.evEst = e.target.value; body(); };
  function body() {
    const q = norm(ST.evQ); const list = DB.events.filter(e => (!ST.evEst || e.estado === ST.evEst) && (!q || norm(e.nombre + ' ' + cliName(e.clienteId) + ' ' + (e.ubicacion || '')).includes(q))).sort((a, b) => b.inicio.localeCompare(a.inicio));
    const b = $('#evBody');
    if (ST.evMode === 'cal') return calView(b, list);
    b.innerHTML = `<div class="card" style="padding:0"><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Evento</th><th class="hide-m">Cliente</th><th class="hide-m">Lugar</th><th>Equipo</th><th class="num hide-m">Costo equipo</th><th class="hide-m">Cobranza</th><th>Estado</th></tr></thead><tbody>${list.map(e => { const s = evStats(e); const cob = s.inv.length ? (s.saldo > 0 ? `<span class="pill p-pend">Saldo ${money(s.saldo)}</span>` : '<span class="pill p-pagada">Cobrado</span>') : '<span class="muted">Sin factura</span>'; return `<tr class="click" data-ev="${e.id}"><td>${fshort(e.inicio)}${e.fin && e.fin !== e.inicio ? ' → ' + fshort(e.fin) : ''}</td><td><b>${esc(e.nombre)}</b>${isExt(e) ? ' <span class="pill r-happy">Externo · no ocupa fecha</span>' : ''}</td><td class="hide-m">${esc(cliName(e.clienteId))}</td><td class="hide-m">${esc(e.ubicacion || '')}</td><td>${new Set(s.sh.map(x => x.workerId)).size}</td><td class="num hide-m">${money(s.costo)}</td><td class="hide-m">${cob}</td><td><span class="pill ${evCls(e)}">${esc(e.estado)}</span></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">Aún no hay eventos. Crea el primero o importa tu Excel en Ajustes.</td></tr>'}</tbody></table></div></div>`;
    bindItems(b);
  }
  body();
};
function calView(b, list) {
  const [y, m] = ST.month.split('-').map(Number); const first = new Date(y, m - 1, 1); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  let cells = ''; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const s = iso(d); const evs = list.filter(e => s >= e.inicio && s <= (e.fin || e.inicio));
    cells += `<div class="d ${d.getMonth() !== m - 1 ? 'out' : ''} ${s === today() ? 'today' : ''}" data-day="${s}"><span class="n">${d.getDate()}</span>${evs.map(e => `<div class="ev ${isExt(e) ? 'ext' : ''} ${e.estado === 'Por confirmar' ? 'porc' : e.estado === 'Cancelado' ? 'canc' : e.estado === 'Realizado' ? 'real' : ''}" data-ev="${e.id}">${esc(e.nombre)}</div>`).join('')}</div>`; }
  b.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:10px"><button class="btn sm ghost" id="pm">${I.left}</button><h3 style="margin:0">${monthLabel(ST.month)}</h3><button class="btn sm ghost" id="nm">${I.right}</button></div><div class="cal">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(x => `<div class="dow">${x}</div>`).join('')}${cells}</div></div>`;
  $('#pm').onclick = () => { ST.month = shiftMonth(ST.month, -1); calView(b, list); }; $('#nm').onclick = () => { ST.month = shiftMonth(ST.month, 1); calView(b, list); };
  $$('.ev', b).forEach(x => x.onclick = ev => { ev.stopPropagation(); eventModal(byId('events', x.dataset.ev)); });
  $$('.d', b).forEach(x => x.onclick = () => eventModal(null, { inicio: x.dataset.day, fin: x.dataset.day }));
}

function eventModal(e, preset = {}) {
  const isNew = !e; e = e ? JSON.parse(JSON.stringify(e)) : Object.assign({ id: uid(), nombre: '', clienteId: '', inicio: today(), fin: today(), ubicacion: '', direccion: '', contacto: '', telefonoContacto: '', horarioMontaje: '', horarioFunc: '', ingreso: '', juegos: '', estado: 'Por confirmar', monto: '', vehiculos: [], notas: '' }, preset);
  let shifts = DB.shifts.filter(s => s.eventId === e.id).map(s => ({ ...s }));
  const { m, close } = modal(`<header><h3>${isNew ? 'Nuevo evento' : esc(e.nombre)}</h3><div class="row">${isNew ? '' : `<button class="btn sm ghost" id="pFi">${I.doc}Ficha técnica PDF</button><button class="btn sm ghost" id="jCli">${I.img}JPG cliente</button><button class="btn sm ghost" id="jEq">${I.img}JPG equipo</button><button class="btn sm ghost" id="xls1">${I.xls}Excel</button>`}<button class="btn sm ghost" data-close>Cerrar</button></div></header>
    <div class="form" id="f">
      <label class="f full">Nombre del evento<input name="nombre" value="${esc(e.nombre)}" placeholder="Ej: Feria Mi Barrio Emprende 2026" required></label>
      <label class="f">Cliente<select name="clienteId"><option value="">— Elegir cliente —</option>${opts([...DB.clients].sort((a, b) => a.nombre.localeCompare(b.nombre)), e.clienteId, c => c.nombre, c => c.id)}<option value="__new">+ Nuevo cliente…</option></select></label>
      <label class="f">Estado<select name="estado">${opts(EST_EV, e.estado)}</select></label>
      <label class="check full" style="justify-self:start"><input type="checkbox" id="extChk" ${isExt(e) ? 'checked' : ''}> Externo (ARVI Happy): no cuenta como evento ni ocupa fechas en Disponibilidad</label>
      <label class="f">Desde<input type="date" name="inicio" value="${e.inicio}"></label>
      <label class="f">Hasta<input type="date" name="fin" value="${e.fin || e.inicio}"></label>
      <label class="f">Lugar<input name="ubicacion" value="${esc(e.ubicacion)}" placeholder="Ej: Complejo Deportivo PF Alimentos"></label>
      <label class="f">Dirección<input name="direccion" value="${esc(e.direccion)}" placeholder="Calle, número, comuna"></label>
      <label class="f">Contacto en terreno<input name="contacto" value="${esc(e.contacto)}" placeholder="Nombre y cargo"></label>
      <label class="f">Teléfono contacto<input name="telefonoContacto" value="${esc(e.telefonoContacto)}"></label>
      <label class="f">Horario de montaje<input name="horarioMontaje" value="${esc(e.horarioMontaje)}" placeholder="Ej: sábado desde las 13:00"></label>
      <label class="f">Horario de funcionamiento<input name="horarioFunc" value="${esc(e.horarioFunc)}" placeholder="Ej: 17:00 a 22:00"></label>
      <label class="f full">Ingreso<input name="ingreso" value="${esc(e.ingreso)}" placeholder="Por dónde se entra y a quién avisar"></label>
      <label class="f">Juegos<input name="juegos" value="${esc(e.juegos)}" placeholder="Ej: Sillitas Marinas, Tagadá"></label>
      <label class="f">Monto acordado (neto)<input name="monto" inputmode="numeric" value="${esc(e.monto)}"></label>
      <label class="f full">Notas internas<textarea name="notas">${esc(e.notas)}</textarea></label>
    </div>
    <div class="sec"><span>Vehículos</span></div><div class="chips" id="veh">${DB.vehicles.map(vh => `<label class="check"><input type="checkbox" value="${vh.id}" ${(e.vehiculos || []).includes(vh.id) ? 'checked' : ''}>${esc(vh.patente)}${vh.descripcion ? ' · ' + esc(vh.descripcion) : ''}</label>`).join('') || '<span class="muted">Agrega patentes en Equipo → Vehículos</span>'}</div>
    <div class="sec"><span>Equipo asignado</span><div class="row"><button class="btn sm ghost" id="copyDay">Copiar equipo al resto de los días</button><button class="btn sm" id="addSh">${I.plus}Agregar persona</button></div></div>
    <div class="tablewrap" style="max-height:none"><table class="mini"><thead><tr><th>Día</th><th>Persona</th><th>Rol</th><th class="num">Pago</th><th></th></tr></thead><tbody id="shB"></tbody></table></div>
    <div id="cobr"></div>
    <div class="row" style="justify-content:space-between;margin-top:18px">${isNew ? '<span></span>' : '<button class="btn red" id="del">Eliminar evento</button>'}<button class="btn y" id="save">Guardar evento</button></div>`, true);
  const f = $('#f', m);
  $('[name=clienteId]', f).onchange = ev => { if (ev.target.value === '__new') clientModal(null, c => { ev.target.insertAdjacentHTML('afterbegin', `<option value="${c.id}">${esc(c.nombre)}</option>`); ev.target.value = c.id; }); };
  const days = () => daysBetween($('[name=inicio]', f).value, $('[name=fin]', f).value);
  function drawSh() {
    const ds0 = days(), ds = ds0.length ? daysBetween(addDays(ds0[0], -2), addDays(ds0[ds0.length - 1], 1)) : ds0; const ws = sortedWorkers().filter(w => w.activo !== false);
    shifts.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol));
    $('#shB', m).innerHTML = shifts.map((s, i) => `<tr><td><select data-i="${i}" data-k="fecha">${opts([...new Set([...ds, s.fecha])].filter(Boolean), s.fecha, fshort)}</select></td><td><select data-i="${i}" data-k="workerId"><option value="">—</option>${opts(ws.concat(ws.find(w => w.id === s.workerId) ? [] : DB.workers.filter(w => w.id === s.workerId)), s.workerId, w => w.nombre, w => w.id)}<option value="__newwk">+ Nueva persona…</option></select></td><td><select data-i="${i}" data-k="rol">${opts(ROLES, s.rol)}<option value="__newrole">+ Nuevo rol…</option></select></td><td><input data-i="${i}" data-k="pago" inputmode="numeric" value="${esc(s.pago)}" style="text-align:right"></td><td><button class="x" data-rm="${i}">×</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted" style="padding:14px">Aún no hay personas asignadas</td></tr>';
    $$('[data-k]', m).forEach(x => x.onchange = () => { const sh = shifts[+x.dataset.i]; sh[x.dataset.k] = x.dataset.k === 'pago' ? num(x.value) : x.value; if (x.dataset.k === 'workerId' && !num(sh.pago)) { const wk = byId('workers', sh.workerId); if (wk && num(wk.pagoDia)) { sh.pago = num(wk.pagoDia); const pi = $(`[data-i="${x.dataset.i}"][data-k="pago"]`, m); if (pi) pi.value = sh.pago; } } drawSum(); });
    $$('[data-rm]', m).forEach(x => x.onclick = () => { shifts.splice(+x.dataset.rm, 1); drawSh(); });
    drawSum();
  }
  function drawSum() {
    const costo = shifts.reduce((s, x) => s + num(x.pago), 0); const inv = DB.invoices.filter(fv => (fv.eventIds || []).includes(e.id));
    let fact = 0, saldo = 0; inv.forEach(fv => { const c = invCalc(fv); if (c.open || c.estado === 'Pagada') { fact += c.neto; saldo += c.saldo; } });
    const monto = num($('[name=monto]', f).value);
    $('#cobr', m).innerHTML = `<div class="sum"><div>Personas<b>${new Set(shifts.map(s => s.workerId).filter(Boolean)).size}</b></div><div>Costo equipo<b>${money(costo)}</b></div><div>Monto acordado<b>${money(monto)}</b></div><div>Facturado (neto)<b>${money(fact)}</b></div><div>Saldo por cobrar<b>${money(saldo)}</b></div><div>Margen estimado<b>${money((fact || monto) - costo)}</b></div></div>
      <div class="sec"><span>Facturas vinculadas</span>${isNew ? '' : `<button class="btn sm" id="newInv">${I.plus}Crear factura</button>`}</div>
      <div class="list">${inv.map(fv => { const c = invCalc(fv); return `<div class="item" data-inv="${fv.id}"><div class="grow"><b>N° ${esc(fv.numero)}</b> · ${fdate(fv.emision)} · ${money(c.bruto)}<div class="muted">Saldo ${money(c.saldo)}${c.venc ? ' · vence ' + fdate(c.venc) : ''}</div></div><span class="pill ${c.cls}">${c.label}</span></div>`; }).join('') || `<div class="muted">${isNew ? 'Guarda el evento para vincular facturas.' : 'Sin facturas. Créala aquí o vincúlala desde Cobranza.'}</div>`}</div>`;
    $$('[data-inv]', m).forEach(x => x.onclick = () => invoiceModal(byId('invoices', x.dataset.inv), null, () => drawSum()));
    const ni = $('#newInv', m); if (ni) ni.onclick = () => { saveEv(false); invoiceModal(null, { clienteId: $('[name=clienteId]', f).value, neto: monto || '', eventIds: [e.id], emision: today() }, () => drawSum()); };
  }
  $('[name=inicio]', f).onchange = () => { if ($('[name=fin]', f).value < $('[name=inicio]', f).value) $('[name=fin]', f).value = $('[name=inicio]', f).value; drawSh(); };
  $('[name=fin]', f).onchange = drawSh; $('[name=monto]', f).oninput = drawSum;
  $('#addSh', m).onclick = () => { const ds = days(); const last = shifts[shifts.length - 1]; shifts.push({ id: uid(), eventId: e.id, workerId: '', fecha: last ? last.fecha : ds[0], rol: last ? last.rol : 'Funcionamiento', pago: last ? last.pago : '' }); drawSh(); };
  $('#copyDay', m).onclick = () => { const ds = days(); if (!shifts.length) return toast('Primero asigna personas a un día'); const base = shifts.filter(s => s.fecha === shifts[0].fecha); let n = 0; for (const d of ds) for (const s of base) if (!shifts.some(x => x.fecha === d && x.workerId === s.workerId)) { shifts.push({ ...s, id: uid(), fecha: d, rol: d === ds[0] ? s.rol : 'Funcionamiento' }); n++; } drawSh(); toast(n ? n + ' turnos copiados' : 'Ya estaban todos'); };
  function saveEv(closeAfter = true) {
    const d = formData(f); if (!d.nombre.trim()) { toast('Ponle nombre al evento'); return false; }
    if (d.clienteId === '__new') d.clienteId = '';
    Object.assign(e, d, { monto: num(d.monto) || '', vehiculos: $$('#veh input:checked', m).map(x => x.value), externo: $('#extChk', m).checked });
    upsert('events', e);
    const keep = new Set(shifts.filter(s => s.workerId).map(s => s.id));
    DB.shifts.filter(s => s.eventId === e.id && !keep.has(s.id)).forEach(s => removeRec('shifts', s.id));
    shifts.filter(s => s.workerId).forEach(s => { const o = DB.shifts.find(x => x.id === s.id); if (!o || JSON.stringify({ ...o, u: 0 }) !== JSON.stringify({ ...s, u: 0 })) upsert('shifts', { ...s, eventId: e.id, pago: num(s.pago) }); });
    if (closeAfter) { close(); render(); toast('Evento guardado'); } return true;
  }
  $('#save', m).onclick = () => saveEv(true);
  const del = $('#del', m); if (del) del.onclick = () => { if (!confirm('¿Eliminar este evento y sus turnos? Las facturas se mantienen.')) return; DB.shifts.filter(s => s.eventId === e.id).forEach(s => removeRec('shifts', s.id)); DB.invoices.filter(x => (x.eventIds || []).includes(e.id)).forEach(x => upsert('invoices', { ...x, eventIds: x.eventIds.filter(i => i !== e.id) })); removeRec('events', e.id); close(); render(); };
  if (!isNew) { $('#pFi', m).onclick = () => { if (saveEv(false)) { close(); fichaModal(byId('events', e.id)); } }; $('#jCli', m).onclick = () => { if (saveEv(false)) jpgEventClient(byId('events', e.id)); }; $('#jEq', m).onclick = () => { if (saveEv(false)) jpgEventTeam(byId('events', e.id)); }; $('#xls1', m).onclick = () => { if (saveEv(false)) exportEventXlsx(byId('events', e.id)); }; }
  drawSh();
}

/* ---- Programación (grilla como el Excel) ---- */
VIEWS.prog = () => {
  const v = $('#view'); const [y, mo] = ST.month.split('-').map(Number); const nd = new Date(y, mo, 0).getDate();
  const days = Array.from({ length: nd }, (_, i) => `${ST.month}-${pad(i + 1)}`);
  const sh = DB.shifts.filter(s => (s.fecha || '').slice(0, 7) === ST.month);
  const ws = sortedWorkers().filter(w => w.activo !== false || sh.some(s => s.workerId === w.id));
  v.innerHTML = head('Programación del equipo', 'Quién trabaja cada día, en qué evento, con qué rol y cuánto se le paga', `<button class="btn ghost" id="xP">${I.xls}Excel del mes</button><button class="btn ghost" id="jP">${I.img}JPG liquidación</button>`) +
    `<div class="tools"><button class="btn sm ghost" id="pm">${I.left}</button><b style="font-size:17px;min-width:150px;text-align:center">${monthLabel(ST.month)}</b><button class="btn sm ghost" id="nm">${I.right}</button><div class="legend">${ROLES.map(r => `<span class="pill ${RCLS[r]}">${r}</span>`).join('')}</div></div>
    <div class="sched"><table><thead><tr><th class="name">Trabajador</th>${days.map(d => { const w = pd(d).getDay(); return `<th class="${w === 0 || w === 6 ? 'we' : ''}">${DOWS[w]}<br>${+d.slice(8)}</th>`; }).join('')}<th class="tot">Total mes</th></tr></thead><tbody>
    ${ws.map(w => { const mine = sh.filter(s => s.workerId === w.id); const tot = mine.reduce((s, x) => s + num(x.pago), 0);
      return `<tr><td class="name">${esc(w.nombre)}<small>${esc(w.grupo || '')}</small></td>${days.map(d => `<td class="cell" data-w="${w.id}" data-d="${d}">${mine.filter(s => s.fecha === d).map(s => `<div class="chip ${RCLS[s.rol] || ''}" data-sh="${s.id}">${esc(evName(s.eventId))}<small>${s.rol}${num(s.pago) ? ' · ' + money(s.pago) : ''}</small></div>`).join('')}</td>`).join('')}<td class="tot">${money(tot)}</td></tr>`; }).join('')}
    </tbody><tfoot><tr><td class="name">Total día</td>${days.map(d => { const t = sh.filter(s => s.fecha === d).reduce((s, x) => s + num(x.pago), 0); return `<td class="num">${t ? money(t) : ''}</td>`; }).join('')}<td class="tot">${money(sh.reduce((s, x) => s + num(x.pago), 0))}</td></tr></tfoot></table></div>`;
  $('#pm').onclick = () => { ST.month = shiftMonth(ST.month, -1); render(); }; $('#nm').onclick = () => { ST.month = shiftMonth(ST.month, 1); render(); };
  $('#xP').onclick = exportMonthXlsx; $('#jP').onclick = jpgMonth;
  $$('.chip[data-sh]', v).forEach(c => c.onclick = e => { e.stopPropagation(); shiftModal(byId('shifts', c.dataset.sh)); });
  $$('td.cell', v).forEach(c => c.onclick = () => shiftModal(null, { workerId: c.dataset.w, fecha: c.dataset.d }));
};
function shiftModal(s, preset = {}) {
  const isNew = !s; s = s ? { ...s } : Object.assign({ id: uid(), eventId: '', workerId: '', fecha: today(), rol: 'Funcionamiento', pago: '' }, preset);
  const near = DB.events.filter(e => e.estado !== 'Cancelado').sort((a, b) => { const ia = s.fecha >= a.inicio && s.fecha <= (a.fin || a.inicio), ib = s.fecha >= b.inicio && s.fecha <= (b.fin || b.inicio); return ib - ia || Math.abs(diffDays(a.inicio, s.fecha)) - Math.abs(diffDays(b.inicio, s.fecha)); });
  const lastPay = DB.shifts.filter(x => x.workerId === s.workerId && num(x.pago)).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  if (isNew && lastPay) s.pago = lastPay.pago;
  const { m, close } = modal(`<header><h3>${isNew ? 'Asignar turno' : 'Editar turno'}</h3><button class="btn sm ghost" data-close>Cerrar</button></header>
    <div class="form" id="f"><label class="f">Persona<select name="workerId">${opts(sortedWorkers(), s.workerId, w => w.nombre, w => w.id)}<option value="__newwk">+ Nueva persona…</option></select></label><label class="f">Día<input type="date" name="fecha" value="${s.fecha}"></label>
    <label class="f full">Evento<select name="eventId"><option value="">— Elegir evento —</option>${opts(near, s.eventId, e => e.nombre + ' · ' + fshort(e.inicio), e => e.id)}<option value="__new">+ Crear evento nuevo…</option></select></label>
    <label class="f">Rol<select name="rol">${opts(ROLES, s.rol)}<option value="__newrole">+ Nuevo rol…</option></select></label><label class="f">Pago<input name="pago" inputmode="numeric" value="${esc(s.pago)}"></label></div>
    <div class="row" style="justify-content:space-between;margin-top:16px">${isNew ? '<span></span>' : '<button class="btn red" id="del">Quitar turno</button>'}<button class="btn y" id="save">Guardar</button></div>`);
  $('[name=eventId]', m).onchange = ev => { if (ev.target.value === '__new') { close(); eventModal(null, { inicio: $('[name=fecha]', m).value, fin: $('[name=fecha]', m).value }); } };
  $('#save', m).onclick = () => { const d = formData($('#f', m)); if (!d.eventId || d.eventId === '__new') return toast('Elige un evento'); upsert('shifts', { ...s, ...d, pago: num(d.pago) }); close(); render(); };
  const del = $('#del', m); if (del) del.onclick = () => { removeRec('shifts', s.id); close(); render(); };
}

/* ---- Equipo ---- */
VIEWS.equipo = () => {
  const v = $('#view'); const tab = ST.eqTab;
  v.innerHTML = head('Equipo', 'Personas, RUT, funciones y vehículos', `<button class="btn ghost" id="xE">${I.xls}Excel equipo completo</button><button class="btn ghost" id="jE">${I.img}JPG nómina</button><button class="btn y" id="nW">${I.plus}${tab === 'personas' ? 'Nueva persona' : 'Nuevo vehículo'}</button>`) +
    `<div class="tools"><button class="btn sm ${tab === 'personas' ? '' : 'ghost'}" data-t="personas">Personas (${DB.workers.length})</button><button class="btn sm ${tab === 'veh' ? '' : 'ghost'}" data-t="veh">Vehículos (${DB.vehicles.length})</button></div><div id="eqB"></div>`;
  $$('[data-t]', v).forEach(b => b.onclick = () => { ST.eqTab = b.dataset.t; render(); });
  $('#xE').onclick = exportTeamXlsx; $('#jE').onclick = () => jpgTeamRoster();
  $('#nW').onclick = () => tab === 'personas' ? workerModal() : vehicleModal();
  const ym = today().slice(0, 7);
  if (tab === 'personas') {
    $('#eqB').innerHTML = `<div class="card" style="padding:0"><div class="tablewrap"><table><thead><tr><th>Nombre</th><th>RUT</th><th class="hide-m">Teléfono</th><th>Grupo</th><th class="hide-m">Función</th><th class="hide-m">Perfil</th><th class="num hide-m">Turnos mes</th><th class="num">Pago mes</th></tr></thead><tbody>${sortedWorkers().map(w => { const s = DB.shifts.filter(x => x.workerId === w.id && (x.fecha || '').slice(0, 7) === ym); return `<tr class="click" data-w="${w.id}" style="${w.activo === false ? 'opacity:.5' : ''}"><td><b>${esc(w.nombre)}</b></td><td>${esc(w.rut || '—')}</td><td class="hide-m">${esc(w.telefono || '')}</td><td>${esc(w.grupo || '')}</td><td class="hide-m">${esc(w.funcion || '')}</td><td class="hide-m"><span class="pbar" title="Perfil ${perfilPct(w)}% completo"><i style="width:${perfilPct(w)}%"></i></span> <span class="muted" style="font-size:12px">${perfilPct(w)}%</span></td><td class="num hide-m">${s.length}</td><td class="num">${money(s.reduce((a, x) => a + num(x.pago), 0))}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Sin personas. Agrégalas o importa tu Excel en Ajustes.</td></tr>'}</tbody></table></div></div>`;
    $$('[data-w]', v).forEach(r => r.onclick = () => workerModal(byId('workers', r.dataset.w)));
  } else {
    $('#eqB').innerHTML = `<div class="card" style="padding:0"><table><thead><tr><th>Patente</th><th>Descripción</th><th>Eventos</th></tr></thead><tbody>${DB.vehicles.map(vh => `<tr class="click" data-vh="${vh.id}"><td><b>${esc(vh.patente)}</b></td><td>${esc(vh.descripcion || '')}</td><td>${DB.events.filter(e => (e.vehiculos || []).includes(vh.id)).length}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Sin vehículos</td></tr>'}</tbody></table></div>`;
    $$('[data-vh]', v).forEach(r => r.onclick = () => vehicleModal(byId('vehicles', r.dataset.vh)));
  }
};
/* ================= PERFIL DE PERSONA (se va completando) ================= */
const DOCS_W = ['Copia de cédula de identidad', 'Certificado de antecedentes', 'Contrato o acuerdo de servicios', 'Inducción de seguridad', 'Licencia de conducir', 'Seguro / mutual'];
const PERFIL_KEYS = ['rut', 'telefono', 'email', 'nacimiento', 'direccion', 'comuna', 'emNombre', 'emTelefono', 'banco', 'nCuenta', 'tallaPolera', 'juegosOpera'];
const perfilPct = w => Math.round(100 * (PERFIL_KEYS.filter(k => String(w[k] || '').trim()).length + Math.min(3, (w.docs || []).filter(d => d.ok).length)) / (PERFIL_KEYS.length + 3));
function workerModal(w, tab0) {
  const isNew = !w; w = w ? JSON.parse(JSON.stringify(w)) : { id: uid(), nombre: '', rut: '', telefono: '', grupo: 'Operador', funcion: '', activo: true, notas: '' };
  w.docs = w.docs || []; w.extra = w.extra || []; w.bitacora = w.bitacora || [];
  let tab = tab0 || 'datos';
  const TABS = [['datos', 'Datos'], ['emerg', 'Emergencia y salud'], ['pago', 'Pago'], ['skills', 'Habilidades'], ['docs', 'Documentos'], ['extra', 'Más datos'], ['bit', 'Bitácora'], ['hist', 'Historial']];
  const F = (k, l, ph = '', type = 'text', full = false) => `<label class="f ${full ? 'full' : ''}">${l}<input name="${k}" type="${type}" value="${esc(w[k] || '')}" placeholder="${esc(ph)}"></label>`;
  const S = (k, l, list) => `<label class="f">${l}<select name="${k}">${opts(['', ...list], w[k] || '', x => x || '—')}</select></label>`;
  const { m, close } = modal(`<header><div><h3>${isNew ? 'Nueva persona' : esc(w.nombre)}</h3><div class="muted" id="pPct"></div></div><button class="btn sm ghost" data-close>Cerrar</button></header>
    <div class="tabsW">${TABS.map(([k, l]) => `<button class="tabW" data-tab="${k}">${l}</button>`).join('')}</div><div id="wBody" class="form"></div>
    <div class="row" style="justify-content:space-between;margin-top:16px">${isNew ? '<span></span>' : '<button class="btn red" id="del">Eliminar</button>'}<button class="btn y" id="save">Guardar</button></div>`);
  const body = $('#wBody', m);
  const collect = () => { $$('[name]', body).forEach(i => { w[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); };
  const pct = () => { $('#pPct', m).innerHTML = `Perfil completo al <b>${perfilPct(w)}%</b> <span class="pbar"><i style="width:${perfilPct(w)}%"></i></span>`; };
  function draw() {
    $$('.tabW', m).forEach(b => b.classList.toggle('on', b.dataset.tab === tab)); pct();
    if (tab === 'datos') body.innerHTML = F('nombre', 'Nombre completo', '', 'text', true) + F('rut', 'RUT', '12.345.678-9') + F('telefono', 'Teléfono', '+56 9 …') + F('email', 'Correo', '', 'email') + F('nacimiento', 'Fecha de nacimiento', '', 'date') + F('nacionalidad', 'Nacionalidad', 'Chilena') + F('ingresoArvi', 'Trabaja con ARVI desde', '', 'date') + F('direccion', 'Dirección', '', 'text', true) + F('comuna', 'Comuna') +
      `<label class="f">Grupo<select name="grupo">${opts(GRUPOS, w.grupo)}<option value="__newgrp">+ Nuevo grupo…</option></select></label>` + F('funcion', 'Función habitual', 'Ej: montaje y funcionamiento') + `<label class="check"><input type="checkbox" name="activo" ${w.activo !== false ? 'checked' : ''}>Activo</label>`;
    if (tab === 'emerg') body.innerHTML = F('emNombre', 'Contacto de emergencia') + F('emParentesco', 'Parentesco', 'Ej: madre') + F('emTelefono', 'Teléfono de emergencia') + F('prevision', 'Previsión de salud', 'Fonasa / Isapre') + `<label class="f full">Alergias, condiciones o medicamentos<textarea name="salud">${esc(w.salud || '')}</textarea></label>`;
    if (tab === 'pago') body.innerHTML = F('banco', 'Banco') + S('tipoCuenta', 'Tipo de cuenta', ['Cuenta RUT', 'Cuenta Vista', 'Cuenta Corriente', 'Cuenta de Ahorro']) + F('nCuenta', 'N° de cuenta') + F('pagoDia', 'Pago sugerido por día ($)', 'Ej: 80000', 'number') + S('boleta', 'Forma de pago', ['Boleta de honorarios', 'Transferencia', 'Efectivo', 'Otro']) + `<label class="f full">Notas de pago<textarea name="pagoNotas">${esc(w.pagoNotas || '')}</textarea></label><p class="muted full">El pago sugerido se completa solo al asignar a esta persona en un turno.</p>`;
    if (tab === 'skills') body.innerHTML = `<label class="f full">Juegos que sabe operar<input name="juegosOpera" value="${esc(w.juegosOpera || '')}" placeholder="Ej: Sillas voladoras, Barco, Go kart, Tren"></label>` + S('licencia', 'Licencia de conducir', ['Sin licencia', 'B', 'A2', 'A3', 'A4', 'A5', 'C', 'D']) + S('tallaPolera', 'Talla polera', ['XS', 'S', 'M', 'L', 'XL', 'XXL']) + F('tallaZapato', 'Talla zapato') + `<label class="f full">Cursos y certificaciones<textarea name="cursos" placeholder="Ej: Primeros auxilios (2025), Manejo de extintores">${esc(w.cursos || '')}</textarea></label><label class="f full">Notas generales<textarea name="notas">${esc(w.notas || '')}</textarea></label>`;
    if (tab === 'docs') { const all = [...new Set([...DOCS_W, ...w.docs.map(d => d.tipo)])];
      body.innerHTML = `<div class="full"><table class="mini"><thead><tr><th>Documento</th><th>Entregado</th><th>Vence</th></tr></thead><tbody>${all.map((t, i) => { const d = w.docs.find(x => x.tipo === t) || {}; const venc = d.vence && d.vence < today(); return `<tr><td>${esc(t)}</td><td><input type="checkbox" data-doc="${i}" ${d.ok ? 'checked' : ''}></td><td><input type="date" data-dv="${i}" value="${d.vence || ''}" style="padding:5px 8px;border-radius:8px;border:1.5px solid ${venc ? 'var(--red)' : 'var(--line)'}">${venc ? ' <span class="pill p-venc">Vencido</span>' : ''}</td></tr>`; }).join('')}</tbody></table>
        <div class="row" style="margin-top:10px"><input id="nDoc" placeholder="Otro documento" style="padding:9px 12px;border-radius:11px;border:1.5px solid var(--line)"><button class="btn sm" id="aDoc">${I.plus}Agregar</button></div></div>`;
      const sync = () => { w.docs = all.map((t, i) => ({ tipo: t, ok: $(`[data-doc="${i}"]`, body).checked, vence: $(`[data-dv="${i}"]`, body).value })).filter(d => d.ok || d.vence || !DOCS_W.includes(d.tipo)); pct(); };
      $$('[data-doc],[data-dv]', body).forEach(x => x.onchange = sync);
      $('#aDoc', body).onclick = () => { const t = $('#nDoc', body).value.trim(); if (!t) return; sync(); w.docs.push({ tipo: t, ok: false, vence: '' }); draw(); }; }
    if (tab === 'extra') { body.innerHTML = `<p class="muted full">Agrega cualquier dato que necesiten (ej: patente propia, AFP, horario disponible).</p><div class="full" id="exL">${w.extra.map((x, i) => `<div class="row" style="margin-bottom:8px"><input data-ek="${i}" value="${esc(x.k)}" placeholder="Dato" style="flex:1;padding:9px 12px;border-radius:11px;border:1.5px solid var(--line)"><input data-evv="${i}" value="${esc(x.v)}" placeholder="Valor" style="flex:2;padding:9px 12px;border-radius:11px;border:1.5px solid var(--line)"><button class="btn sm ghost" data-ex="${i}">✕</button></div>`).join('') || ''}</div><div class="full"><button class="btn sm" id="aEx">${I.plus}Agregar dato</button></div>`;
      const sync = () => { w.extra = w.extra.map((x, i) => ({ k: $(`[data-ek="${i}"]`, body).value, v: $(`[data-evv="${i}"]`, body).value })); };
      $$('[data-ek],[data-evv]', body).forEach(x => x.oninput = sync);
      $$('[data-ex]', body).forEach(b => b.onclick = () => { sync(); w.extra.splice(+b.dataset.ex, 1); draw(); });
      $('#aEx', body).onclick = () => { sync(); w.extra.push({ k: '', v: '' }); draw(); $$('[data-ek]', body).pop().focus(); }; }
    if (tab === 'bit') { body.innerHTML = `<div class="full"><textarea id="bTxt" placeholder="Ej: Muy buen desempeño en Ladera, llegó puntual, aprendió a operar el barco…" style="width:100%;min-height:70px"></textarea><div class="row" style="margin:8px 0 14px"><button class="btn sm" id="aBit">${I.plus}Agregar a la bitácora</button></div>
        <div class="list">${w.bitacora.slice().sort((a, b) => b.fecha.localeCompare(a.fecha)).map(b => `<div class="item" style="cursor:default"><div class="date"><b>${+b.fecha.slice(8, 10)}</b><span>${MESES[+b.fecha.slice(5, 7) - 1].slice(0, 3)}</span></div><div><div>${esc(b.texto)}</div><div class="muted" style="font-size:12px">${esc(b.por || '')} · ${fdate(b.fecha)}</div></div></div>`).join('') || '<div class="muted">Aún no hay anotaciones.</div>'}</div></div>`;
      $('#aBit', body).onclick = () => { const t = $('#bTxt', body).value.trim(); if (!t) return; w.bitacora.push({ fecha: today(), texto: t, por: USER }); draw(); }; }
    if (tab === 'hist') { const sh = DB.shifts.filter(s => s.workerId === w.id).sort((a, b) => b.fecha.localeCompare(a.fecha)); const evs = new Set(sh.map(s => s.eventId)); const tot = sh.reduce((a, s) => a + num(s.pago), 0);
      body.innerHTML = `<div class="full grid" style="grid-template-columns:repeat(3,1fr);gap:10px"><div class="card kpi" style="padding:12px 14px"><div class="lab">Eventos</div><div class="val">${evs.size}</div></div><div class="card kpi" style="padding:12px 14px"><div class="lab">Días trabajados</div><div class="val">${new Set(sh.map(s => s.fecha)).size}</div></div><div class="card kpi" style="padding:12px 14px"><div class="lab">Total pagado</div><div class="val" style="font-size:22px">${money(tot)}</div></div></div>
        <div class="full"><table class="mini"><tbody>${sh.map(s => `<tr><td>${fdate(s.fecha)}</td><td>${esc(evName(s.eventId))}</td><td><span class="pill ${RCLS[s.rol] || ''}">${esc(s.rol)}</span></td><td class="num">${money(s.pago)}</td></tr>`).join('') || '<tr><td class="muted">Sin turnos todavía.</td></tr>'}</tbody></table></div>`; }
    $$('input,select,textarea', body).forEach(i => i.addEventListener('change', () => { if (i.name) { w[i.name] = i.type === 'checkbox' ? i.checked : i.value; pct(); } }));
  }
  $$('.tabW', m).forEach(b => b.onclick = () => { collect(); tab = b.dataset.tab; draw(); });
  draw();
  $('#save', m).onclick = () => { collect(); if (!String(w.nombre || '').trim()) { tab = 'datos'; draw(); return toast('Falta el nombre'); } w.nombre = w.nombre.trim(); w.extra = w.extra.filter(x => x.k || x.v); upsert('workers', w); close(); render(); toast('Perfil guardado'); };
  const del = $('#del', m); if (del) del.onclick = () => { if (DB.shifts.some(s => s.workerId === w.id)) { if (!confirm('Esta persona tiene turnos. Mejor márcala como inactiva. ¿Eliminar igual?')) return; } removeRec('workers', w.id); close(); render(); };
}

/* ================= FICHA TÉCNICA (PDF formal) ================= */
let PDFLIB = null;
async function loadPdf() {
  if (PDFLIB) return PDFLIB;
  await new Promise((ok, ko) => { if (window.jspdf) return ok(); const s = document.createElement('script'); s.src = 'pdf/jspdf.umd.min.js'; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  const b64 = async u => { const buf = await (await fetch(u)).arrayBuffer(); let s = ''; const a = new Uint8Array(buf); for (let i = 0; i < a.length; i += 0x8000) s += String.fromCharCode.apply(null, a.subarray(i, i + 0x8000)); return btoa(s); };
  const fonts = await Promise.all(['400Regular', '600SemiBold', '800ExtraBold'].map(w => b64(`pdf/Outfit_${w}.ttf`)));
  await logoP; let logo = null; if (LOGO) { const c = document.createElement('canvas'); c.width = LOGO.width; c.height = LOGO.height; c.getContext('2d').drawImage(LOGO, 0, 0); logo = c.toDataURL('image/png'); }
  PDFLIB = { fonts, logo, ratio: LOGO ? LOGO.height / LOGO.width : .4 }; return PDFLIB;
}
const COND_DEF = 'Los juegos son instalados y operados exclusivamente por personal de ARVI.\nEl cliente asegura un punto eléctrico de 220V, acceso para el vehículo de carga y un espacio despejado para el montaje.\nPor seguridad, ante lluvia o viento fuerte el encargado ARVI puede suspender el funcionamiento de los juegos inflables.\nCualquier cambio de horario o de lugar debe coordinarse con ARVI con anticipación.';
const REQ_DEF = ['Punto eléctrico 220V a menos de 30 m', 'Superficie plana (pasto / cemento)', 'Acceso para camión hasta la zona de montaje', 'Espacio de montaje despejado', 'Baño disponible para el equipo', 'Estacionamiento para vehículos ARVI', 'Cuidado nocturno de los juegos (eventos de más de un día)'];
function parseJuegos(t) {
  return String(t || '').split(/\n|[–-](?=\s*[A-Za-zÁÉÍÓÚÑáéíóúñ(])|,|;|•/).map(x => x.trim()).filter(Boolean).map(x => { const q = x.match(/\bx\s*(\d+)\b/i); return { n: x.replace(/\bx\s*\d+\b/i, '').replace(/\s+/g, ' ').trim(), q: q ? +q[1] : 1 }; }).filter(j => j.n);
}
function fichaDefaults(e) {
  e = e || {}; const c = byId('clients', e.clienteId) || {};
  const ids = [...new Set(DB.shifts.filter(s => s.eventId === e.id).map(s => s.workerId))];
  const montaje = DB.shifts.filter(s => s.eventId === e.id && s.rol === 'Montaje').map(s => s.fecha).sort()[0] || '';
  const desm = DB.shifts.filter(s => s.eventId === e.id && s.rol === 'Desmontaje').map(s => s.fecha).sort().pop() || '';
  const n = DB.events.filter(x => x.ficha && x.ficha.numero).length + 1;
  return {
    numero: `FT-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`, emision: today(), cliente: c.nombre || '', rutCliente: c.rut || '', propuesta: '', evento: e.nombre || '',
    fechaMontaje: montaje, horaMontaje: e.horarioMontaje || '', fechaDesde: e.inicio || '', fechaHasta: e.fin || e.inicio || '', horaFunc: e.horarioFunc || '', fechaDesmontaje: desm, horaDesmontaje: '',
    direccion: [e.ubicacion, e.direccion].filter(Boolean).join(' · '), comuna: '', referencia: e.ingreso || '', contacto: e.contacto || '', telefono: e.telefonoContacto || '', email: c.email || '',
    encargado: '', encargadoTel: '', juegos: parseJuegos(e.juegos).map(j => j.q > 1 ? `${j.n} x${j.q}` : j.n).join('\n'), personajes: '', obs: /importado desde excel/i.test(e.notas || '') ? '' : (e.notas || ''),
    equipo: ids, vehiculos: e.vehiculos || [], blankEq: 2, blankJ: 2, papel: 'letter', cond: COND_DEF, req: REQ_DEF.join('\n'),
    sec: { juegos: true, equipo: true, vehiculos: true, req: true, control: true, obs: true, cond: true, firmas: true }
  };
}
VIEWS.fichas = () => {
  const v = $('#view'); const evs = DB.events.filter(e => !isExt(e)).sort((a, b) => (b.inicio || '').localeCompare(a.inicio || ''));
  v.innerHTML = head('Fichas técnicas', 'PDF con 3 partes: datos del evento, juegos solicitados y personal ARVI con firmas.', `<button class="btn y" id="fBl">${I.plus}Ficha en blanco</button>`) +
    `<div class="card" style="padding:0"><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Evento</th><th class="hide-m">Cliente</th><th>Equipo</th><th>Ficha</th><th></th></tr></thead><tbody>${evs.map(e => `<tr><td>${fdate(e.inicio)}</td><td><b>${esc(e.nombre)}</b></td><td class="hide-m">${esc(cliName(e.clienteId))}</td><td>${new Set(DB.shifts.filter(s => s.eventId === e.id).map(s => s.workerId)).size} personas</td><td>${e.ficha && e.ficha.numero ? `<span class="pill p-pagada">${esc(e.ficha.numero)}</span>` : '<span class="pill p-pend">Sin ficha</span>'}</td><td class="num"><button class="btn sm" data-fi="${e.id}">${I.doc || ''}${e.ficha ? 'Abrir' : 'Crear'} ficha</button></td></tr>`).join('') || '<tr><td colspan="6" class="empty">Aún no hay eventos.</td></tr>'}</tbody></table></div></div>`;
  $('#fBl').onclick = () => fichaModal(null);
  $$('[data-fi]', v).forEach(b => b.onclick = () => fichaModal(byId('events', b.dataset.fi)));
};
function fichaModal(e) {
  const d = Object.assign(fichaDefaults(e), JSON.parse(JSON.stringify((e && e.ficha) || {})));
  const T = (k, l, ph = '', type = 'text', full = false) => `<label class="f ${full ? 'full' : ''}">${l}<input name="${k}" type="${type}" value="${esc(d[k] || '')}" placeholder="${esc(ph)}"></label>`;
  const ws = sortedWorkers().filter(w => w.activo !== false || d.equipo.includes(w.id));
  const { m, close } = modal(`<header><div><h3>Ficha técnica ${esc(d.numero)}</h3><div class="muted">${e ? esc(e.nombre) : 'Ficha en blanco'} · lo que dejes vacío sale con línea para rellenar</div></div><button class="btn sm ghost" data-close>Cerrar</button></header>
  <div class="form" id="ff">
    <div class="sec full">1. Datos generales, fechas y lugar</div>${T('cliente', 'Cliente')}${T('propuesta', 'Propuesta', 'Ej: COT-10673')}${T('fechaMontaje', 'Fecha de montaje', '', 'date')}${T('horaMontaje', 'Horario de montaje', 'Ej: 08:00')}${T('fechaDesde', 'Fecha de funcionamiento (desde)', '', 'date')}${T('fechaHasta', 'Hasta (si es más de un día)', '', 'date')}${T('horaFunc', 'Horario de funcionamiento', 'Ej: 11:00 a 18:00')}${T('direccion', 'Dirección de destino', '', 'text', true)}${T('contacto', 'Contacto en terreno')}${T('telefono', 'Teléfono contacto', '+569 …')}
    <div class="sec full">2. Juegos solicitados</div><label class="f full">Juegos (uno por línea, cantidad con x2, x3…)<textarea name="juegos" style="min-height:110px" placeholder="Sillas voladoras\nBarco\nInflable simple x3">${esc(d.juegos || '')}</textarea></label>${T('personajes', 'Personajes', 'Ej: Kitty y Mickey')}<label class="f">Espacios vacíos para escribir juegos a mano<select name="blankJ">${[0, 1, 2, 3, 4, 6].map(n => `<option value="${n}" ${num(d.blankJ) === n ? 'selected' : ''}>${n ? n + (n === 1 ? ' espacio' : ' espacios') : 'Ninguno'}</option>`).join('')}</select><span class="muted" style="font-size:12px;font-weight:500">Líneas vacías al final de la lista de juegos, por si el cliente pide algo más el mismo día.</span></label>
    <div class="sec full">3. Personal ARVI y firmas <span class="muted" style="font-weight:500">· viene de los turnos del evento</span></div>
    <div class="full chips" id="fEq">${ws.map(w => `<label class="check"><input type="checkbox" value="${w.id}" ${d.equipo.includes(w.id) ? 'checked' : ''}>${esc(w.nombre)}${w.rut ? '' : ' <span class="muted">(sin RUT)</span>'}</label>`).join('')}</div><label class="f">Espacios vacíos para escribir personal a mano<select name="blankEq">${[0, 1, 2, 3, 4, 6].map(n => `<option value="${n}" ${num(d.blankEq) === n ? 'selected' : ''}>${n ? n + (n === 1 ? ' espacio' : ' espacios') : 'Ninguno'}</option>`).join('')}</select><span class="muted" style="font-size:12px;font-weight:500">Líneas vacías al final de la tabla de personal, por si se suma alguien que no está en la lista.</span></label>
    <label class="f">Tamaño de hoja<select name="papel">${opts(['letter', 'a4'], d.papel, x => x === 'letter' ? 'Carta' : 'A4')}</select></label>${T('numero', 'N° de ficha')}
  </div>
  <div class="row" style="justify-content:space-between;margin-top:16px"><span class="muted">${e ? 'Los datos quedan guardados en el evento.' : ''}</span><div class="row">${e ? '<button class="btn ghost" id="fSave">Guardar</button>' : ''}<button class="btn y" id="fPdf">${I.doc}Descargar PDF</button></div></div>`);
  const read = () => { Object.assign(d, formData($('#ff', m))); d.equipo = $$('#fEq input:checked', m).map(x => x.value); d.blankEq = Math.max(0, Math.min(20, num(d.blankEq))); d.blankJ = Math.max(0, Math.min(20, num(d.blankJ))); return d; };
  const save = () => { if (!e) return; read(); const ev = byId('events', e.id); upsert('events', { ...ev, ficha: JSON.parse(JSON.stringify(d)) }); };
  if (e) $('#fSave', m).onclick = () => { save(); toast('Ficha guardada en el evento'); };
  $('#fPdf', m).onclick = async () => { const b = $('#fPdf', m); b.classList.add('loading'); try { read(); save(); await pdfFicha(d); } catch (x) { console.error(x); toast('No se pudo crear el PDF: ' + x.message); } b.classList.remove('loading'); };
}
async function pdfFicha(d) {
  const L = await loadPdf(); const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'pt', format: d.papel === 'a4' ? 'a4' : 'letter' });
  doc.addFileToVFS('O4.ttf', L.fonts[0]); doc.addFont('O4.ttf', 'Outfit', 'normal'); doc.addFileToVFS('O6.ttf', L.fonts[1]); doc.addFont('O6.ttf', 'Outfit', 'semibold'); doc.addFileToVFS('O8.ttf', L.fonts[2]); doc.addFont('O8.ttf', 'Outfit', 'bold');
  const PW = doc.internal.pageSize.getWidth(), PH = doc.internal.pageSize.getHeight(), M = 40, CW = PW - 2 * M, BOT = PH - 58;
  const G9 = [15, 77, 36], G7 = [31, 122, 53], G5 = [58, 168, 72], YY = [255, 198, 26], INK = [22, 38, 27], MU = [107, 124, 112], LN = [205, 214, 204], BGL = [240, 247, 236];
  const font = (st, sz, col = INK) => { doc.setFont('Outfit', st); doc.setFontSize(sz); doc.setTextColor(...col); };
  const star = (x, y, r, col) => { const p = []; for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .45 : r; p.push([x + q * Math.cos(a), y + q * Math.sin(a)]); } doc.setFillColor(...col); doc.lines(p.slice(1).map((pt, i) => [pt[0] - p[i][0], pt[1] - p[i][1]]), p[0][0], p[0][1], [1, 1], 'F', true); };
  const fd = s => s ? (d2 => d2.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))(new Date(s + 'T12:00')) : '';
  let y = 0, secN = 0;
  function header(first) {
    const HB = first ? 104 : 50; doc.setFillColor(...G9); doc.rect(0, 0, PW, HB, 'F'); doc.setFillColor(...YY); doc.rect(0, HB, PW, 4, 'F');
    for (let i = 0; i < 9; i++) star(PW - 30 - i * 47, first ? 20 : 14, 3 + (i % 3), [60, 140, 75]);
    if (first) {
      if (L.logo) { doc.setFillColor(255, 255, 255); const lw = Math.min(130, 64 / L.ratio); doc.roundedRect(M - 8, (HB - lw * L.ratio) / 2 - 8, lw + 16, lw * L.ratio + 16, 8, 8, 'F'); doc.addImage(L.logo, 'PNG', M, (HB - lw * L.ratio) / 2, lw, lw * L.ratio); }
      font('bold', 19, [255, 255, 255]); doc.text('FICHA TÉCNICA DE FUNCIONAMIENTO', PW - M, 50, { align: 'right' });
      font('semibold', 10, [255, 228, 138]); doc.text(`N° ${d.numero || '________'}   ·   Emitida el ${d.emision ? fdate(d.emision) : '____/____/______'}`, PW - M, 70, { align: 'right' });
      y = 130;
    } else { font('bold', 12, [255, 255, 255]); doc.text('FICHA TÉCNICA DE FUNCIONAMIENTO', M, 31); font('semibold', 10, [255, 228, 138]); doc.text(`N° ${d.numero || ''} · ${d.evento || ''}`, PW - M, 31, { align: 'right' }); y = 76; }
  }
  const ensure = h => { if (y + h > BOT) { doc.addPage(); header(false); } };
  function section(t, need = 48) { ensure(need); secN++; doc.setFillColor(...G7); doc.roundedRect(M, y, CW, 22, 4, 4, 'F'); doc.setFillColor(...YY); doc.rect(M, y, 5, 22, 'F'); font('bold', 10.5, [255, 255, 255]); doc.text(`${secN}.  ${t.toUpperCase()}`, M + 14, y + 15); y += 30; }
  // cuadrícula de datos: [etiqueta, valor, ancho(1 o 2)]
  function grid(items) {
    let col = 0, rowH = 0, x0 = M; const cw = CW / 2;
    for (const [lab, val, span = 1] of items) {
      if (col + span > 2) { y += rowH; col = 0; rowH = 0; }
      const w = cw * span, x = x0 + col * cw; font('normal', 10.5); const lines = val ? doc.splitTextToSize(String(val), w - 16) : []; const h = 30 + Math.max(1, lines.length) * 13;
      if (col === 0) ensure(h);
      doc.setDrawColor(...LN); doc.setLineWidth(.6); doc.rect(x, y, w, h);
      font('semibold', 7.5, MU); doc.text(lab.toUpperCase(), x + 8, y + 12);
      if (lines.length) { font('semibold', 10.5, INK); doc.text(lines, x + 8, y + 27); } else { doc.setDrawColor(170, 180, 170); doc.setLineDashPattern([1.5, 2], 0); doc.line(x + 8, y + h - 9, x + w - 10, y + h - 9); doc.setLineDashPattern([], 0); }
      rowH = Math.max(rowH, h); col += span; if (col >= 2) { y += rowH; col = 0; rowH = 0; }
    }
    if (col) y += rowH; y += 14;
  }
  function table(cols, rows, blanks = 0, minH = 24) {
    const tw = cols.reduce((a, c) => a + c.w, 0), ws = cols.map(c => c.w / tw * CW);
    const head = () => { ensure(44); doc.setFillColor(...BGL); doc.rect(M, y, CW, 20, 'F'); doc.setDrawColor(...LN); doc.rect(M, y, CW, 20); let x = M; font('bold', 8, G9); cols.forEach((c, i) => { doc.text(c.h.toUpperCase(), c.a === 'c' ? x + ws[i] / 2 : x + 7, y + 13.5, c.a === 'c' ? { align: 'center' } : {}); x += ws[i]; }); y += 20; };
    head();
    const all = [...rows, ...Array.from({ length: blanks }, () => cols.map(() => ''))];
    all.forEach((r, ri) => {
      font('normal', 9.5); const cells = r.map((v, i) => doc.splitTextToSize(String(v ?? ''), ws[i] - 12)); const h = Math.max(minH, 10 + Math.max(...cells.map(c => c.length)) * 12);
      if (y + h > BOT) { doc.addPage(); header(false); head(); }
      if (ri % 2) { doc.setFillColor(250, 252, 248); doc.rect(M, y, CW, h, 'F'); }
      let x = M; doc.setDrawColor(...LN); doc.setLineWidth(.6);
      cells.forEach((c, i) => { doc.rect(x, y, ws[i], h); const col = cols[i];
        if (col.box) { doc.setDrawColor(...MU); [0, 1].forEach(k => { const bx = x + 8 + k * (ws[i] - 16) / 2; doc.rect(bx, y + h / 2 - 4.5, 9, 9); font('normal', 7.5, MU); doc.text(col.box[k], bx + 13, y + h / 2 + 3); }); doc.setDrawColor(...LN); }
        else if (c.length && c[0]) { font(i === 0 ? 'semibold' : 'normal', 9.5, INK); doc.text(c, col.a === 'c' ? x + ws[i] / 2 : x + 6, y + 15, col.a === 'c' ? { align: 'center' } : {}); }
        x += ws[i]; });
      y += h;
    });
    y += 14;
  }
  function checks(list) { const cw = CW / 2; for (let i = 0; i < list.length; i += 2) { font('normal', 9.5, INK); const pair = list.slice(i, i + 2).map(t => doc.splitTextToSize(t, cw - 26)); const h = Math.max(...pair.map(p => p.length)) * 11.5 + 9; ensure(h); pair.forEach((ls, col) => { const x = M + col * cw; doc.setDrawColor(...G7); doc.setLineWidth(1); doc.rect(x + 2, y, 10, 10); font('normal', 9.5, INK); doc.text(ls, x + 18, y + 8.5); }); y += h; } doc.setLineWidth(.6); y += 6; }
  function lines(n, label) { if (label) { ensure(20); font('semibold', 8, MU); doc.text(label.toUpperCase(), M, y + 8); y += 14; } for (let i = 0; i < n; i++) { ensure(20); doc.setDrawColor(170, 180, 170); doc.line(M, y + 14, M + CW, y + 14); y += 20; } y += 6; }
  function para(t) { font('normal', 9.5, INK); const L2 = String(t).split('\n').filter(Boolean); L2.forEach(p => { const ls = doc.splitTextToSize(p, CW - 16); ensure(ls.length * 12 + 6); font('normal', 9.5, INK); star(M + 4, y + 4, 3.5, YY); doc.text(ls, M + 14, y + 8); y += ls.length * 12 + 6; }); y += 8; }

  header(true);
  const rango = d.fechaDesde ? (d.fechaHasta && d.fechaHasta !== d.fechaDesde ? `Del ${fd(d.fechaDesde)} al ${fd(d.fechaHasta)}` : fd(d.fechaDesde)) : '';
  section('Datos generales, fechas y lugar');
  grid([['Cliente', d.cliente], ['Propuesta', d.propuesta], ['Fecha de montaje', [fd(d.fechaMontaje), d.horaMontaje].filter(Boolean).join(' · ')], ['Fecha de funcionamiento', rango], ['Horario de funcionamiento', d.horaFunc], ['Contacto en terreno', [d.contacto, d.telefono].filter(Boolean).join(' · ')], ['Dirección de destino', d.direccion, 2]]);
  section('Juegos solicitados', 130);
  table([{ h: 'Juego', w: 4.2 }, { h: 'Cant.', w: 0.9, a: 'c' }, { h: 'Observaciones', w: 6.4 }], parseJuegos(d.juegos).map(j => [j.n, String(j.q), '']), d.blankJ, 28);
  grid([['Personajes', d.personajes, 2]]);
  section('Personal ARVI y firmas', 130);
  const rolOf = id => [...new Set(DB.shifts.filter(s => s.workerId === id && d.evento && evName(s.eventId) === d.evento).map(s => s.rol))].join(' y ') || (byId('workers', id) || {}).funcion || 'Operador';
  table([{ h: 'Nombre', w: 4 }, { h: 'C.I. / RUT', w: 2.4 }, { h: 'Función', w: 2.6 }, { h: 'Firma', w: 2.6 }], d.equipo.map(id => byId('workers', id)).filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre)).map(w => [w.nombre, w.rut || '', rolOf(w.id), '']), d.blankEq, 30);
  ensure(120); y += 6;
  ['Firma Ventas ARVI', 'Firma Cliente'].forEach((p, i) => { const w2 = (CW - 30) / 2, x = M + i * (w2 + 30); doc.setDrawColor(...INK); doc.setLineWidth(.8); doc.line(x + 10, y + 50, x + w2 - 10, y + 50); font('bold', 10.5, G9); doc.text(p.toUpperCase(), x + w2 / 2, y + 66, { align: 'center' });
    font('normal', 8.5, MU); ['Nombre', 'RUT', 'Fecha'].forEach((k, j) => { doc.text(k + ':', x + 10, y + 84 + j * 12); doc.setDrawColor(190, 198, 188); doc.setLineWidth(.6); doc.line(x + 46, y + 85 + j * 12, x + w2 - 10, y + 85 + j * 12); }); });
  y += 125;
  // pie en todas las páginas
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFillColor(...G9); doc.rect(0, PH - 34, PW, 34, 'F'); doc.setFillColor(...YY); doc.rect(0, PH - 34, PW, 3, 'F'); star(M + 4, PH - 16, 6, YY);
    font('semibold', 8.5, [255, 255, 255]); doc.text('ARVI · Entretenciones infantiles · arvi.cl', M + 16, PH - 13); doc.text(`Ficha ${d.numero || ''} · Página ${i} de ${n}`, PW - M, PH - 13, { align: 'right' }); }
  doc.save(`Ficha tecnica ${d.numero || ''} ${d.evento || ''}.pdf`.replace(/[\\/:*?"<>|]/g, '').trim());
  toast('PDF descargado');
}
function vehicleModal(vh) {
  const isNew = !vh; vh = vh ? { ...vh } : { id: uid(), patente: '', descripcion: '' };
  const { m, close } = modal(`<header><h3>${isNew ? 'Nuevo vehículo' : esc(vh.patente)}</h3><button class="btn sm ghost" data-close>Cerrar</button></header><div class="form" id="f"><label class="f">Patente<input name="patente" value="${esc(vh.patente)}" placeholder="AB-CD-12"></label><label class="f">Descripción<input name="descripcion" value="${esc(vh.descripcion)}" placeholder="Ej: Camión 3/4"></label></div><div class="row" style="justify-content:space-between;margin-top:16px">${isNew ? '<span></span>' : '<button class="btn red" id="del">Eliminar</button>'}<button class="btn y" id="save">Guardar</button></div>`);
  $('#save', m).onclick = () => { const d = formData($('#f', m)); if (!d.patente.trim()) return toast('Falta la patente'); upsert('vehicles', { ...vh, ...d, patente: d.patente.trim().toUpperCase() }); close(); render(); };
  const del = $('#del', m); if (del) del.onclick = () => { removeRec('vehicles', vh.id); close(); render(); };
}

/* ---- Cobranza ---- */
VIEWS.cobranza = () => {
  const v = $('#view'); const years = [...new Set(DB.invoices.map(f => (f.emision || '').slice(0, 4)).filter(Boolean))].sort().reverse();
  v.innerHTML = head('Cobranza', 'Facturas emitidas con IVA, vencimiento a 30 días, abonos y saldo automáticos', `<button class="btn ghost" id="xC">${I.xls}Excel</button><button class="btn y" id="nI">${I.plus}Nueva factura</button>`) +
    `<div class="grid kpis" id="cK"></div><div class="tools" style="margin-top:14px"><input class="search" id="q" placeholder="Buscar N°, cliente, RUT u observación" value="${esc(ST.invQ)}">
     <select id="fe"><option value="">Todos los estados</option>${opts(['Abiertas', 'Vencida', 'Por vencer', 'Pendiente', 'Abonada', 'Pagada', 'Nota de crédito', 'Nula', 'Salto SII'], ST.invEst)}</select>
     <select id="fc"><option value="">Todos los clientes</option>${opts([...DB.clients].sort((a, b) => a.nombre.localeCompare(b.nombre)), ST.invCli, c => c.nombre, c => c.id)}</select>
     <select id="fy"><option value="">Todos los años</option>${opts(years, ST.invYear)}</select></div><div id="cB"></div>`;
  $('#nI').onclick = () => invoiceModal(); $('#xC').onclick = () => exportInvoicesXlsx(filtered());
  $('#q').oninput = e => { ST.invQ = e.target.value; body(); }; $('#fe').onchange = e => { ST.invEst = e.target.value; body(); }; $('#fc').onchange = e => { ST.invCli = e.target.value; body(); }; $('#fy').onchange = e => { ST.invYear = e.target.value; body(); };
  function filtered() {
    const q = norm(ST.invQ);
    return DB.invoices.map(f => [f, invCalc(f)]).filter(([f, c]) => (!ST.invEst || (ST.invEst === 'Abiertas' ? c.open : c.estado === ST.invEst)) && (!ST.invCli || f.clienteId === ST.invCli) && (!ST.invYear || (f.emision || '').startsWith(ST.invYear)) && (!q || norm(`${f.numero} ${cliName(f.clienteId)} ${(byId('clients', f.clienteId) || {}).rut || ''} ${f.obs || ''}`).includes(q))).sort((a, b) => (num(b[0].numero) - num(a[0].numero)));
  }
  function body() {
    const L = filtered(); const t = k => L.reduce((s, [, c]) => s + c[k], 0);
    const open = L.filter(([, c]) => c.open);
    $('#cK').innerHTML = `<div class="card kpi"><div class="lab">Facturado (bruto)</div><div class="val">${money(L.filter(([, c]) => c.open || c.estado === 'Pagada').reduce((s, [, c]) => s + c.bruto, 0))}</div><div class="foot">${L.length} facturas en la vista</div></div><div class="card kpi"><div class="lab">Por cobrar</div><div class="val">${money(open.reduce((s, [, c]) => s + c.saldo, 0))}</div><div class="foot">${open.length} abiertas</div></div><div class="card kpi warn"><div class="lab">Vencido</div><div class="val">${money(open.filter(([, c]) => c.estado === 'Vencida').reduce((s, [, c]) => s + c.saldo, 0))}</div><div class="foot">${open.filter(([, c]) => c.estado === 'Vencida').length} vencidas</div></div><div class="card kpi"><div class="lab">Abonos registrados</div><div class="val">${money(t('pagado'))}</div><div class="foot">en facturas de la vista</div></div>`;
    $('#cB').innerHTML = `<div class="card" style="padding:0"><div class="tablewrap"><table><thead><tr><th>N°</th><th>Cliente</th><th class="hide-m">Emisión</th><th class="num hide-m">Neto</th><th class="num hide-m">IVA</th><th class="num">Bruto</th><th class="hide-m">Vence</th><th class="num hide-m">Días</th><th>Estado</th><th class="num">Saldo</th><th class="hide-m">Evento</th></tr></thead><tbody>${L.map(([f, c]) => `<tr class="click" data-inv="${f.id}"><td><b>${esc(f.numero)}</b></td><td class="ell" style="max-width:240px">${esc(cliName(f.clienteId))}</td><td class="hide-m">${fdate(f.emision)}</td><td class="num hide-m">${money(c.neto)}</td><td class="num hide-m">${money(c.iva)}</td><td class="num">${money(c.bruto)}</td><td class="hide-m">${fdate(c.venc)}</td><td class="num hide-m">${c.open && c.dias !== null ? c.dias : ''}</td><td><span class="pill ${c.cls}">${c.label}</span></td><td class="num">${c.saldo ? money(c.saldo) : '—'}</td><td class="hide-m ell" style="max-width:160px">${(f.eventIds || []).map(evName).join(', ')}</td></tr>`).join('') || '<tr><td colspan="11" class="empty">Sin facturas</td></tr>'}</tbody>
      <tfoot><tr><td colspan="2">Totales</td><td class="hide-m"></td><td class="num hide-m">${money(t('neto'))}</td><td class="num hide-m">${money(t('iva'))}</td><td class="num">${money(t('bruto'))}</td><td class="hide-m"></td><td class="hide-m"></td><td></td><td class="num">${money(t('saldo'))}</td><td class="hide-m"></td></tr></tfoot></table></div></div>`;
    bindItems($('#cB'));
  }
  body();
};
function invoiceModal(f, preset = {}, after) {
  const isNew = !f; f = f ? JSON.parse(JSON.stringify(f)) : Object.assign({ id: uid(), numero: String((Math.max(0, ...DB.invoices.map(x => num(x.numero))) || 0) + 1), clienteId: '', emision: today(), neto: '', bruto: '', venc: '', estadoManual: '', abonos: [], obs: '', eventIds: [] }, preset);
  if (f.estadoManual === 'PAGADA') { const c0 = invCalc({ ...f, estadoManual: '' }); if (c0.saldo > 0) f.abonos = [...(f.abonos || []), { fecha: f.venc || f.emision || today(), monto: c0.saldo, nota: 'Pago total' }]; f.estadoManual = ''; }
  const { m, close } = modal(`<header><h3>${isNew ? 'Nueva factura' : 'Factura N° ' + esc(f.numero)}</h3><button class="btn sm ghost" data-close>Cerrar</button></header>
    <div class="form" id="f"><label class="f">N° factura<input name="numero" value="${esc(f.numero)}"></label><label class="f">Cliente<select name="clienteId"><option value="">— Elegir cliente —</option>${opts([...DB.clients].sort((a, b) => a.nombre.localeCompare(b.nombre)), f.clienteId, c => c.nombre + (c.rut ? ' · ' + c.rut : ''), c => c.id)}<option value="__new">+ Nuevo cliente…</option></select></label>
    <label class="f">Fecha emisión<input type="date" name="emision" value="${f.emision || ''}"></label><label class="f">Vencimiento <span style="font-weight:500">(vacío = emisión + 30 días)</span><input type="date" name="venc" value="${f.venc || ''}"></label>
    <label class="f">Monto neto<input name="neto" inputmode="numeric" value="${esc(f.neto)}"></label><label class="f">Monto bruto (con IVA)<input name="bruto" inputmode="numeric" value="${esc(f.bruto)}"></label>
    <label class="f">Estado especial<select name="estadoManual">${opts(EST_MAN, f.estadoManual, x => x || 'Automático (se actualiza con los abonos)')}</select></label>
    <label class="f">Eventos vinculados<select name="ev" multiple size="3" style="height:auto">${opts([...DB.events].sort((a, b) => b.inicio.localeCompare(a.inicio)), null, e => e.nombre + ' · ' + fshort(e.inicio), e => e.id)}</select></label>
    <label class="f full">Observaciones<textarea name="obs">${esc(f.obs)}</textarea></label></div>
    <div class="sec"><span>Abonos y pagos</span><button class="btn sm" id="addA">${I.plus}Registrar abono</button></div>
    <table class="mini"><thead><tr><th>Fecha</th><th class="num">Monto</th><th>Nota</th><th></th></tr></thead><tbody id="abB"></tbody></table><div id="calc"></div>
    <div class="row" style="justify-content:space-between;margin-top:16px">${isNew ? '<span></span>' : '<button class="btn red" id="del">Eliminar factura</button>'}<div class="row">${isNew ? '' : `<button class="btn ghost" id="pay">Marcar pagada hoy</button>`}<button class="btn y" id="save">Guardar</button></div></div>`);
  const F = $('#f', m); $$('[name=ev] option', F).forEach(o => o.selected = (f.eventIds || []).includes(o.value));
  $('[name=clienteId]', F).onchange = ev => { if (ev.target.value === '__new') clientModal(null, c => { ev.target.insertAdjacentHTML('afterbegin', `<option value="${c.id}">${esc(c.nombre)}</option>`); ev.target.value = c.id; }); };
  const neto = $('[name=neto]', F), bruto = $('[name=bruto]', F);
  neto.oninput = () => { bruto.value = neto.value ? Math.round(num(neto.value) * 1.19) : ''; calc(); }; bruto.oninput = () => { neto.value = bruto.value ? Math.round(num(bruto.value) / 1.19) : ''; calc(); };
  $$('input,select', F).forEach(x => x.addEventListener('change', calc));
  function drawAb() { $('#abB', m).innerHTML = f.abonos.map((a, i) => `<tr><td><input type="date" data-a="${i}" data-k="fecha" value="${a.fecha || ''}"></td><td><input data-a="${i}" data-k="monto" inputmode="numeric" value="${esc(a.monto)}" style="text-align:right"></td><td><input data-a="${i}" data-k="nota" value="${esc(a.nota || '')}"></td><td><button class="x" data-rm="${i}">×</button></td></tr>`).join('') || '<tr><td colspan="4" class="muted" style="padding:10px">Sin abonos registrados</td></tr>';
    $$('[data-a]', m).forEach(x => x.onchange = () => { f.abonos[+x.dataset.a][x.dataset.k] = x.dataset.k === 'monto' ? num(x.value) : x.value; calc(); }); $$('[data-rm]', m).forEach(x => x.onclick = () => { f.abonos.splice(+x.dataset.rm, 1); drawAb(); calc(); }); }
  function cur() { const d = formData(F); return { ...f, ...d, neto: num(d.neto), bruto: num(d.bruto), eventIds: $$('[name=ev] option:checked', F).map(o => o.value) }; }
  function calc() { const c = invCalc(cur()); $('#calc', m).innerHTML = `<div class="sum"><div>Neto<b>${money(c.neto)}</b></div><div>IVA 19%<b>${money(c.iva)}</b></div><div>Bruto<b>${money(c.bruto)}</b></div><div>Pagado<b>${money(c.pagado)}</b></div><div>Saldo<b>${money(c.saldo)}</b></div><div>Vence<b>${fdate(c.venc)}${c.open && c.dias !== null ? ` (${c.dias} días)` : ''}</b></div><div>Estado<b><span class="pill ${c.cls}">${c.label}</span></b></div></div>`; }
  $('#addA', m).onclick = () => { const c = invCalc(cur()); f.abonos.push({ fecha: today(), monto: c.saldo || '', nota: '' }); drawAb(); calc(); };
  function save() { const d = cur(); delete d.ev; if (!String(d.numero).trim()) return toast('Falta el N° de factura'); if (!d.clienteId || d.clienteId === '__new') return toast('Elige el cliente'); if (!d.neto && !d.bruto) return toast('Ingresa el monto'); upsert('invoices', d); close(); if (after) after(); else render(); toast('Factura guardada'); }
  $('#save', m).onclick = save;
  const pay = $('#pay', m); if (pay) pay.onclick = () => { const c = invCalc(cur()); if (c.saldo > 0) f.abonos.push({ fecha: today(), monto: c.saldo, nota: 'Pago total' }); drawAb(); calc(); save(); };
  const del = $('#del', m); if (del) del.onclick = () => { if (!confirm('¿Eliminar la factura N° ' + f.numero + '?')) return; removeRec('invoices', f.id); close(); if (after) after(); else render(); };
  drawAb(); calc();
}

/* ---- Clientes ---- */
VIEWS.clientes = () => {
  const v = $('#view'); const L = DB.clients.map(c => [c, clientStats(c)]).sort((a, b) => b[1].saldo - a[1].saldo || a[0].nombre.localeCompare(b[0].nombre));
  v.innerHTML = head('Clientes', 'Estado de cuenta, facturas y eventos de cada cliente', `<button class="btn y" id="nC">${I.plus}Nuevo cliente</button>`) +
    `<div class="tools"><input class="search" id="q" placeholder="Buscar cliente o RUT"></div><div class="card" style="padding:0"><div class="tablewrap"><table><thead><tr><th>Cliente</th><th class="hide-m">RUT</th><th class="num hide-m">Eventos</th><th class="num hide-m">Facturas</th><th class="num hide-m">Facturado</th><th class="num">Saldo</th><th class="num hide-m">Vencido</th></tr></thead><tbody id="cl">${L.map(([c, s]) => `<tr class="click" data-c="${c.id}" data-q="${esc(norm(c.nombre + ' ' + c.rut))}"><td><b>${esc(c.nombre)}</b></td><td class="hide-m">${esc(c.rut || '')}</td><td class="num hide-m">${s.evs.length}</td><td class="num hide-m">${s.inv.length}</td><td class="num hide-m">${money(s.fact)}</td><td class="num">${s.saldo ? money(s.saldo) : '—'}</td><td class="num hide-m" style="color:var(--red)">${s.venc ? money(s.venc) : ''}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">Sin clientes</td></tr>'}</tbody></table></div></div>`;
  $('#nC').onclick = () => clientModal(null, () => render());
  $('#q').oninput = e => { const q = norm(e.target.value); $$('#cl tr[data-q]').forEach(r => r.style.display = r.dataset.q.includes(q) ? '' : 'none'); };
  $$('[data-c]', v).forEach(r => r.onclick = () => clientModal(byId('clients', r.dataset.c), () => render()));
};
function clientModal(c, after) {
  const isNew = !c; c = c ? { ...c } : { id: uid(), nombre: '', rut: '', contacto: '', telefono: '', email: '', notas: '' };
  const s = isNew ? null : clientStats(c);
  const { m, close } = modal(`<header><h3>${isNew ? 'Nuevo cliente' : esc(c.nombre)}</h3><div class="row">${isNew ? '' : `<button class="btn sm ghost" id="jC">${I.img}JPG estado de cuenta</button><button class="btn sm ghost" id="xC">${I.xls}Excel</button>`}<button class="btn sm ghost" data-close>Cerrar</button></div></header>
    <div class="form" id="f"><label class="f full">Razón social<input name="nombre" value="${esc(c.nombre)}"></label><label class="f">RUT<input name="rut" value="${esc(c.rut)}"></label><label class="f">Contacto<input name="contacto" value="${esc(c.contacto)}"></label><label class="f">Teléfono<input name="telefono" value="${esc(c.telefono)}"></label><label class="f">Email<input name="email" value="${esc(c.email)}"></label><label class="f full">Notas<textarea name="notas">${esc(c.notas)}</textarea></label></div>
    ${s ? `<div class="sum"><div>Facturado<b>${money(s.fact)}</b></div><div>Saldo<b>${money(s.saldo)}</b></div><div>Vencido<b style="color:var(--red)">${money(s.venc)}</b></div><div>Eventos<b>${s.evs.length}</b></div></div>
    <div class="sec">Facturas</div><div class="tablewrap" style="max-height:300px"><table class="mini"><thead><tr><th>N°</th><th>Emisión</th><th class="num">Bruto</th><th>Vence</th><th>Estado</th><th class="num">Saldo</th></tr></thead><tbody>${s.inv.sort((a, b) => num(b.numero) - num(a.numero)).map(f => { const k = invCalc(f); return `<tr class="click" data-inv="${f.id}"><td>${esc(f.numero)}</td><td>${fdate(f.emision)}</td><td class="num">${money(k.bruto)}</td><td>${fdate(k.venc)}</td><td><span class="pill ${k.cls}">${k.label}</span></td><td class="num">${k.saldo ? money(k.saldo) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Sin facturas</td></tr>'}</tbody></table></div>
    <div class="sec">Eventos</div><div class="list">${s.evs.sort((a, b) => b.inicio.localeCompare(a.inicio)).map(evItem).join('') || '<div class="muted">Sin eventos</div>'}</div>` : ''}
    <div class="row" style="justify-content:space-between;margin-top:16px">${isNew ? '<span></span>' : '<button class="btn red" id="del">Eliminar cliente</button>'}<button class="btn y" id="save">Guardar</button></div>`, !isNew);
  bindItems(m);
  $('#save', m).onclick = () => { const d = formData($('#f', m)); if (!d.nombre.trim()) return toast('Falta la razón social'); const r = upsert('clients', { ...c, ...d, nombre: d.nombre.trim() }); close(); if (after) after(r); };
  const del = $('#del', m); if (del) del.onclick = () => { if (s.inv.length || s.evs.length) return toast('Tiene facturas o eventos asociados: no se puede eliminar'); removeRec('clients', c.id); close(); if (after) after(); };
  if (!isNew) { $('#jC', m).onclick = () => jpgStatement(c); $('#xC', m).onclick = () => exportInvoicesXlsx(s.inv.map(f => [f, invCalc(f)]), 'Estado de cuenta ' + c.nombre); }
}

/* ---- Ajustes ---- */
VIEWS.ajustes = () => {
  const v = $('#view');
  v.innerHTML = head('Ajustes', 'Importación desde Excel y respaldos') + `
  <div class="grid two">
    <div class="card"><h3>Importar desde Excel</h3><p class="muted">Carga tus planillas actuales. Puedes repetir la importación: no duplica personas, clientes, turnos ni facturas.</p>
      <div class="sec">Programación de eventos (eventos_arvi_juegos.xlsx)</div><div class="row"><select id="imM">${opts(MESES.map((x, i) => i), new Date().getMonth(), i => MESES[i])}</select><input id="imY" type="number" value="${new Date().getFullYear()}" style="width:90px;padding:9px;border-radius:10px;border:1.5px solid var(--line)"><label class="btn ghost">Elegir archivo<input type="file" id="fEv" accept=".xlsx,.xls" hidden></label></div>
      <div class="sec">Cobranza (COBRANZA_2026_ARVI.xlsx)</div><label class="btn ghost">Elegir archivo<input type="file" id="fCo" accept=".xlsx,.xls" hidden></label>
      <div id="imR" class="muted" style="margin-top:10px"></div></div>
    <div class="card"><h3>Conexión y respaldo</h3><p class="muted">${DEMO ? 'Modo demo: los datos quedan solo en este navegador.' : 'Datos en vivo en Firebase (mismo proyecto y usuarios que la agenda ARVI HAPPY). Sesión: <b>' + esc(USER) + '</b>.'}</p>
      <div class="row"><button class="btn ghost" id="bx">${I.xls}Excel completo</button><button class="btn ghost" id="bj">Respaldo (.json)</button><label class="btn ghost">Restaurar respaldo<input type="file" id="br" accept=".json" hidden></label></div>
      <p class="muted" style="margin-top:12px">${DB.events.length} eventos · ${DB.shifts.length} turnos · ${DB.workers.length} personas · ${DB.clients.length} clientes · ${DB.invoices.length} facturas</p></div>
  </div>
  <div class="card" style="margin-top:16px"><h3>Roles y grupos del equipo</h3><p class="muted">Agrega los roles que usen en los turnos (ej: Animador, Chofer, Bodega) y grupos para ordenar al equipo. Los de siempre no se pueden quitar.</p>
    <div class="grid two"><div><div class="sec">Roles en turnos</div><div class="chips">${ROLES.map(r => `<span class="pill ${RCLS[r] || ''}">${esc(r)}${BASE_ROLES.includes(r) ? '' : ` <a href="#" data-rmr="${esc(r)}" style="color:inherit;text-decoration:none">✕</a>`}</span>`).join('')}</div><div class="row" style="margin-top:10px"><input id="nr" placeholder="Nuevo rol" style="padding:9px 12px;border-radius:11px;border:1.5px solid var(--line)"><button class="btn sm" id="nrB">${I.plus}Agregar</button></div></div>
    <div><div class="sec">Grupos</div><div class="chips">${GRUPOS.map(g => `<span class="pill p-real">${esc(g)}${BASE_GRUPOS.includes(g) ? '' : ` <a href="#" data-rmg="${esc(g)}" style="color:inherit;text-decoration:none">✕</a>`}</span>`).join('')}</div><div class="row" style="margin-top:10px"><input id="ng" placeholder="Nuevo grupo" style="padding:9px 12px;border-radius:11px;border:1.5px solid var(--line)"><button class="btn sm" id="ngB">${I.plus}Agregar</button></div></div></div></div>
  <div class="card" style="margin-top:16px"><h3>Papelera</h3><p class="muted">Nada se borra de forma definitiva. Lo que eliminas queda aquí y puedes recuperarlo cuando quieras.</p>
  ${TRASH.length ? `<table class="tbl"><thead><tr><th>Tipo</th><th>Registro</th><th>Eliminado</th><th></th></tr></thead><tbody>${TRASH.slice().sort((a, b) => b.rec.borradoEl - a.rec.borradoEl).map(t => `<tr><td>${({ workers: 'Persona', vehicles: 'Vehículo', clients: 'Cliente', events: 'Evento', shifts: 'Turno', invoices: 'Factura', dias: 'Fecha', material: 'Material' })[t.col]}</td><td>${esc(t.rec.titulo || t.rec.nombre || t.rec.name || t.rec.patente || (t.rec.numero ? 'Factura N° ' + t.rec.numero : '') || t.rec.fecha || t.rec.id)}</td><td class="muted">${new Date(t.rec.borradoEl).toLocaleString('es-CL')} · ${esc(t.rec.borradoPor || '')}</td><td><button class="btn ghost" onclick="restoreRec('${t.col}','${t.rec.id}')">Recuperar</button></td></tr>`).join('')}</tbody></table>` : '<p class="muted">La papelera está vacía.</p>'}</div>`;
  $('#fEv').onchange = async e => { const file = e.target.files[0]; if (!file) return; const wb = XLSX.read(await file.arrayBuffer(), { cellStyles: true, cellDates: true }); $('#imR').innerHTML = importEventos(wb, +$('#imY').value, +$('#imM').value + 1); e.target.value = ''; };
  $('#fCo').onchange = async e => { const file = e.target.files[0]; if (!file) return; const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true }); $('#imR').innerHTML = importCobranza(wb); e.target.value = ''; };
  $('#bx').onclick = exportAllXlsx;
  $('#nrB').onclick = () => { if (addRole($('#nr').value)) render(); }; $('#ngB').onclick = () => { if (addGroup($('#ng').value)) render(); };
  $$('[data-rmr]').forEach(a => a.onclick = ev => { ev.preventDefault(); const r = a.dataset.rmr; if (DB.shifts.some(x => x.rol === r) && !confirm('Hay turnos con el rol "' + r + '". Esos turnos lo conservan, pero ya no aparecerá en la lista. ¿Quitar?')) return; const rc = rolesCfg(); upsert('dias', { ...rc, roles: (rc.roles || []).filter(x => x !== r) }); render(); });
  $$('[data-rmg]').forEach(a => a.onclick = ev => { ev.preventDefault(); const g = a.dataset.rmg; const rc = rolesCfg(); upsert('dias', { ...rc, grupos: (rc.grupos || []).filter(x => x !== g) }); render(); });
  $('#bj').onclick = () => download(new Blob([JSON.stringify(DB)], { type: 'application/json' }), `respaldo-gestion-arvi-${today()}.json`);
  $('#br').onchange = async e => { try { const d = JSON.parse(await e.target.files[0].text()); if (!confirm('Se agregarán los registros del respaldo (los que ya existen se reemplazan). ¿Continuar?')) return; for (const c of COLS) for (const r of (d[c] || [])) upsert(c, r); render(); toast('Respaldo restaurado'); } catch (x) { toast('Respaldo inválido'); } };
};


/* ================= DISPONIBILIDAD (para clientes) =================
   Se calcula en vivo desde Eventos (sin contar cancelados). Se puede ajustar día a día.
   La imagen que se exporta no muestra clientes, lugares ni montos: solo si la fecha está libre o tomada. */
const DST = { libre: ['Disponible', '#e9f7df', '#3aa848'], pocos: ['Últimos cupos', '#fff4c9', '#e0a400'], tomado: ['Reservado', '#fde3e1', '#d6453c'] };
const dispCfg = () => DB.dias.find(d => d.id === 'cfg') || { id: 'cfg', cap: 1 };
function dayStatus(s) {
  const cap = Math.max(1, num(dispCfg().cap) || 1), ov = DB.dias.find(d => d.id === 'd' + s);
  const evs = DB.events.filter(e => e.estado !== 'Cancelado' && !isExt(e) && s >= e.inicio && s <= (e.fin || e.inicio));
  let st = !evs.length ? 'libre' : evs.length >= cap ? 'tomado' : 'pocos';
  if (ov && DST[ov.estado]) st = ov.estado;
  return { st, evs, ov: ov && DST[ov.estado] ? ov.estado : '', cap };
}
function monthDays(ym) { const [y, m] = ym.split('-').map(Number); const first = new Date(y, m - 1, 1), n = new Date(y, m, 0).getDate(); return { y, m, lead: (first.getDay() + 6) % 7, n }; }
ST.dispN = ST.dispN || 1;
VIEWS.disp = () => {
  const v = $('#view'), cfg = dispCfg();
  v.innerHTML = head('Disponibilidad', 'Fechas libres y tomadas según los eventos. La imagen para clientes no muestra ningún detalle.', `<select id="dN" style="padding:9px 12px;border-radius:11px;border:1.5px solid var(--line);font-weight:600"><option value="1">1 mes</option><option value="2">2 meses</option><option value="3">3 meses</option></select><button class="btn y" id="dJ">${I.img || ''}Exportar JPG para clientes</button>`) +
    `<div class="tools"><div class="row"><button class="btn sm ghost" id="pm">${I.left}</button><b style="min-width:150px;text-align:center;font-size:17px;color:var(--g900)">${monthLabel(ST.month)}</b><button class="btn sm ghost" id="nm">${I.right}</button></div>
     <label class="row muted" style="gap:8px">Eventos simultáneos por día <input id="cap" type="number" min="1" max="9" value="${num(cfg.cap) || 1}" style="width:70px"></label>
     <div class="legend">${Object.entries(DST).map(([k, [l, bg, bd]]) => `<span class="pill" style="background:${bg};color:#16261b;border:1.5px solid ${bd}">${l}</span>`).join('')}</div></div>
    <div class="grid" id="dSum" style="grid-template-columns:repeat(3,1fr);margin-bottom:14px"></div><div class="card" id="dCal"></div>
    <p class="muted" style="margin-top:10px">Toca un día para ver sus eventos, crear uno nuevo o cambiar a mano cómo aparece (por ejemplo, bloquear una fecha). Cualquier evento nuevo, editado o cancelado actualiza la disponibilidad al instante.</p>`;
  $('#dN').value = String(ST.dispN); $('#dN').onchange = e => ST.dispN = +e.target.value;
  $('#pm').onclick = () => { ST.month = shiftMonth(ST.month, -1); render(true); }; $('#nm').onclick = () => { ST.month = shiftMonth(ST.month, 1); render(true); };
  $('#cap').onchange = e => { upsert('dias', { ...dispCfg(), cap: Math.max(1, num(e.target.value) || 1) }); render(); };
  $('#dJ').onclick = () => jpgDisp(ST.month, ST.dispN);
  const { y, m, lead, n } = monthDays(ST.month), t = today(); let cells = '', cnt = { libre: 0, pocos: 0, tomado: 0 };
  for (let i = 0; i < lead; i++) cells += '<div></div>';
  for (let d = 1; d <= n; d++) {
    const s = `${y}-${pad(m)}-${pad(d)}`, ds = dayStatus(s), past = s < t; if (!past) cnt[ds.st]++;
    const [lab, bg, bd] = DST[ds.st];
    cells += `<div class="dd ${past ? 'past' : ''}" data-day="${s}" style="background:${bg};border-color:${bd}"><div class="row" style="justify-content:space-between"><b>${d}</b>${ds.ov ? '<span title="Ajustado a mano">✋</span>' : ''}</div><div class="st" style="color:${bd}">${lab}</div>${ds.evs.slice(0, 2).map(e => `<div class="mini-ev">${esc(e.nombre)}</div>`).join('')}${ds.evs.length > 2 ? `<div class="mini-ev">+${ds.evs.length - 2} más</div>` : ''}${DB.events.some(e => isExt(e) && s >= e.inicio && s <= (e.fin || e.inicio)) ? '<div class="mini-ev" style="color:#93297c">ARVI Happy (externo)</div>' : ''}</div>`;
  }
  $('#dCal').innerHTML = `<div class="dcal">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(x => `<div class="dow">${x}</div>`).join('')}${cells}</div>`;
  $('#dSum').innerHTML = Object.entries(DST).map(([k, [l, , bd]]) => `<div class="card kpi" style="padding:14px 16px"><div class="lab">${l}</div><div class="val" style="color:${bd}">${cnt[k]}</div><div class="foot">días desde hoy</div></div>`).join('');
  $$('.dd', v).forEach(x => x.onclick = () => dayModal(x.dataset.day));
};
function dayModal(s) {
  const ds = dayStatus(s);
  const { m, close } = modal(`<header><h3>${(d => d[0].toUpperCase() + d.slice(1))(pd(s).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</h3><button class="btn sm ghost" data-close>Cerrar</button></header>
    <div class="sec">Eventos de este día</div><div class="list">${ds.evs.map(e => evItem(e)).join('') || '<div class="muted">No hay eventos este día.</div>'}</div>${(x => x.length ? `<div class="muted" style="margin-top:8px">ARVI Happy (externo) este día: no ocupa la fecha.</div>` : '')(DB.events.filter(e => isExt(e) && s >= e.inicio && s <= (e.fin || e.inicio)))}
    <div class="sec">Cómo aparece para clientes</div>
    <div class="chips">${[['', 'Automático (según eventos)'], ['libre', 'Disponible'], ['pocos', 'Últimos cupos'], ['tomado', 'Reservado / bloqueado']].map(([k, l]) => `<label class="check"><input type="radio" name="ov" value="${k}" ${ds.ov === k ? 'checked' : ''}>${l}</label>`).join('')}</div>
    <p class="muted">Ahora se ve como: <b>${DST[ds.st][0]}</b>${ds.ov ? ' (ajustado a mano)' : ''}.</p>
    <div class="row" style="justify-content:space-between;margin-top:14px"><button class="btn ghost" id="dNew">${I.plus}Crear evento este día</button><button class="btn y" id="dOk">Guardar</button></div>`);
  bindItems(m);
  $('#dNew', m).onclick = () => { close(); eventModal(null, { inicio: s, fin: s }); };
  $('#dOk', m).onclick = () => { const k = ($('[name=ov]:checked', m) || {}).value || ''; const ex = DB.dias.find(d => d.id === 'd' + s);
    if (k) upsert('dias', { id: 'd' + s, fecha: s, estado: k }); else if (ex) { DB.dias = DB.dias.filter(d => d !== ex); upsert('dias', { ...ex, estado: '' }); }
    close(); render(); toast('Disponibilidad actualizada'); };
}
async function jpgDisp(ym, nMonths) {
  await logoP; try { await document.fonts.load('800 20px Outfit'); } catch (e) { }
  const months = Array.from({ length: nMonths }, (_, i) => shiftMonth(ym, i)), W = 1080, P = 48, LW = 280, LH = LOGO ? LW * LOGO.height / LOGO.width : 0, HH = 66 + LH + 26 + 110, t = today();
  const F = (w, s) => `${w} ${s}px Outfit, system-ui, sans-serif`, gw = W - P * 2, cw = gw / 7, ch = 112;
  const blockH = mm => { const { lead, n } = monthDays(mm); return 90 + 46 + Math.ceil((lead + n) / 7) * (ch + 8) + 30; };
  const H = HH + months.reduce((a, mm) => a + blockH(mm), 0) + 110 + 120;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const g = cv.getContext('2d');
  const rr = (x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  const star = (x, y, r, col) => { g.fillStyle = col; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .45 : r; g.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)); } g.closePath(); g.fill(); };
  g.fillStyle = '#fffaf0'; g.fillRect(0, 0, W, H);
  // encabezado
  let gr = g.createLinearGradient(0, 0, W, HH); gr.addColorStop(0, '#1f7a35'); gr.addColorStop(1, '#0f4d24'); g.fillStyle = gr; g.fillRect(0, 0, W, HH);
  for (let i = 0; i < 30; i++) star((i * 197) % W, 60 + (i * 83) % (HH - 60), 5 + (i % 4) * 4, 'rgba(255,228,138,.16)');
  const flags = ['#ffc61a', '#9bd34a', '#fffaf0']; for (let x = 0, i = 0; x < W; x += 54, i++) { g.fillStyle = flags[i % 3]; g.beginPath(); g.moveTo(x + 4, 0); g.lineTo(x + 27, 46); g.lineTo(x + 50, 0); g.fill(); }
  if (LOGO) { const lw = LW, lh = LH; g.fillStyle = '#fff'; rr(W / 2 - lw / 2 - 22, 66, lw + 44, lh + 26, 26); g.fill(); g.drawImage(LOGO, W / 2 - lw / 2, 79, lw, lh); }
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = F(800, 58); g.fillText('Fechas disponibles', W / 2, HH - 40);
  g.fillStyle = '#ffc61a'; g.fillRect(0, HH - 12, W, 12);
  let y = HH + 30;
  for (const mm of months) {
    const { y: yy, m, lead, n } = monthDays(mm);
    g.fillStyle = '#0f4d24'; g.font = F(800, 46); g.fillText(MESES[m - 1][0].toUpperCase() + MESES[m - 1].slice(1) + ' ' + yy, W / 2, y + 52); y += 90;
    ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].forEach((d, i) => { g.fillStyle = i > 4 ? '#1f7a35' : '#6b7c70'; g.font = F(700, 22); g.fillText(d.toUpperCase(), P + cw * i + cw / 2, y + 28); }); y += 46;
    for (let d = 1; d <= n; d++) {
      const idx = lead + d - 1, x = P + (idx % 7) * cw + 4, yy2 = y + Math.floor(idx / 7) * (ch + 8), s = `${yy}-${pad(m)}-${pad(d)}`, past = s < t, st = past ? 'past' : dayStatus(s).st;
      const sty = { libre: ['#ffffff', '#3aa848', '#0f4d24', 'Disponible'], pocos: ['#fff4c9', '#ffc61a', '#7a5a00', 'Últimos cupos'], tomado: ['#e9ece6', '#c9d0c5', '#9aa39a', 'Reservado'], past: ['#f3f3ef', '#e6e6e0', '#c4c7c0', ''] }[st];
      g.fillStyle = sty[0]; rr(x, yy2, cw - 8, ch, 16); g.fill(); g.lineWidth = st === 'libre' ? 4 : 2.5; g.strokeStyle = sty[1]; rr(x, yy2, cw - 8, ch, 16); g.stroke();
      g.fillStyle = sty[2]; g.font = F(800, 36); g.fillText(String(d), x + (cw - 8) / 2, yy2 + 50);
      if (st === 'tomado') { g.strokeStyle = '#c4cbc0'; g.lineWidth = 3; g.beginPath(); g.moveTo(x + 22, yy2 + 38); g.lineTo(x + cw - 30, yy2 + 38); g.stroke(); }
      if (sty[3]) { g.font = F(700, 15.5); g.fillStyle = sty[2]; g.fillText(sty[3].toUpperCase(), x + (cw - 8) / 2, yy2 + 86); }
      if (st === 'libre') star(x + cw - 26, yy2 + 20, 9, '#ffc61a');
    }
    y += Math.ceil((lead + n) / 7) * (ch + 8) + 30;
  }
  // leyenda
  const leg = [['#ffffff', '#3aa848', 'Disponible'], ['#fff4c9', '#ffc61a', 'Últimos cupos'], ['#e9ece6', '#c9d0c5', 'Reservado']]; g.font = F(700, 24);
  const lw2 = leg.map(l => 44 + g.measureText(l[2]).width + 40), tot = lw2.reduce((a, b) => a + b, 0); let lx = W / 2 - tot / 2;
  g.textAlign = 'left'; leg.forEach((l, i) => { g.fillStyle = l[0]; rr(lx, y + 18, 32, 32, 9); g.fill(); g.lineWidth = 3; g.strokeStyle = l[1]; rr(lx, y + 18, 32, 32, 9); g.stroke(); g.fillStyle = '#16261b'; g.font = F(700, 24); g.fillText(l[2], lx + 44, y + 43); lx += lw2[i]; });
  y += 110;
  // pie
  g.fillStyle = '#0f4d24'; g.fillRect(0, H - 120, W, 120); g.fillStyle = '#ffc61a'; g.fillRect(0, H - 120, W, 8);
  g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = F(800, 34); g.fillText('¡Reserva tu fecha!', W / 2, H - 62); g.fillStyle = '#ffe48a'; g.font = F(600, 22); g.fillText('arvi.cl · No aceptes imitaciones', W / 2, H - 26); g.textAlign = 'left';
  const name = `ARVI_fechas_disponibles_${months.map(monthLabel).join('_').replace(/ /g, '')}.jpg`;
  cv.toBlob(async b => {
    const file = new File([b], name, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] }) && /Android|iPhone|iPad/i.test(navigator.userAgent)) { try { await navigator.share({ files: [file], title: 'Fechas disponibles ARVI' }); return; } catch (e) { } }
    download(b, name); toast('Imagen de fechas disponibles lista');
  }, 'image/jpeg', 0.93);
}


/* ================= ARCHIVOS IMPORTANTES (descargas) ================= */
const ARCH_DIR = 'archivos-x9t4/';
const ARCHIVOS = [
  { g: 'ARVI Juegos', f: 'ARVI-Catalogo-2026.pdf', t: 'Catálogo 2026', d: 'Todos los juegos con fotos, capacidad, montaje y requisitos (37 páginas).', mb: 4.1, tag: 'Más nuevo' },
  { g: 'ARVI Juegos', f: 'ARVI-Propuesta-de-Valor-2026.pdf', t: 'Propuesta de valor y diferenciadores', d: 'Por qué elegir ARVI: experiencia, fabricación propia y sustentabilidad.', mb: 7.9 },
  { g: 'ARVI Juegos', f: 'ARVI-Colegios-Privados-y-Productoras-2026.pdf', t: 'Colegios privados y productoras', d: 'Propuesta para eventos escolares y productoras.', mb: 14.9 },
  { g: 'ARVI Juegos', f: 'ARVI-Sustentable-2026.pdf', t: 'ARVI Sustentable 2026', d: 'Proyectos y juegos sustentables (energía humana).', mb: 4.2 },
  { g: 'Para clientes', f: 'ARVI-Datos-de-Montaje.pdf', t: 'Datos de montaje (formulario)', d: 'Planilla para que el cliente complete los datos del evento.', mb: 0.3 },
  { g: 'Para clientes', f: 'ARVI-Datos-para-tu-evento.jpg', t: 'Datos para tu evento (imagen)', d: 'Imagen para enviar por WhatsApp con los 7 datos que necesitamos.', mb: 0.2 },
  { g: 'ARVI Happy', f: 'ARVI-Happy-Informacion-Salon-2026.pdf', t: 'Información del salón 2026', d: 'Guía completa del salón: capacidad, horarios, paquetes y reglas.', mb: 7.5 },
  { g: 'ARVI Happy', f: 'ARVI-Happy-Convenios-Cumpleanos-2026.pdf', t: 'Convenios de cumpleaños 2026', d: 'Beneficio para funcionarios municipales.', mb: 5.0 },
  { g: 'ARVI Happy', f: 'ARVI-Happy-Datos-de-Facturacion.pdf', t: 'Datos de facturación', d: 'Razón social, RUT, giro y dirección para boletas y facturas.', mb: 0.3 },
];
VIEWS.archivos = () => {
  const v = $('#view'), q = (ST.archQ || '').toLowerCase();
  const list = ARCHIVOS.filter(a => !q || (a.t + ' ' + a.d + ' ' + a.g).toLowerCase().includes(q));
  const groups = [...new Set(list.map(a => a.g))];
  v.innerHTML = head('Archivos importantes', 'Documentos listos para descargar o enviar a clientes.', `<input id="aq" placeholder="Buscar archivo…" value="${esc(ST.archQ || '')}" style="padding:10px 14px;border-radius:12px;border:1.5px solid var(--line);min-width:220px">`) +
    groups.map(g => `<div class="sec" style="margin-top:6px">${esc(g)}</div><div class="arch-grid">${list.filter(a => a.g === g).map(a => {
      const url = ARCH_DIR + a.f, ext = a.f.split('.').pop().toUpperCase(), th = ARCH_DIR + a.f.replace(/\.(pdf|jpg)$/, '-min.jpg');
      return `<div class="card arch"><div class="arch-th"><img src="${th}" alt="" loading="lazy"><span class="arch-ext">${ext}</span>${a.tag ? `<span class="arch-tag">${esc(a.tag)}</span>` : ''}</div>
        <div class="arch-b"><b>${esc(a.t)}</b><p class="muted">${esc(a.d)}</p><div class="muted" style="font-size:12px">${ext} · ${a.mb.toFixed(1).replace('.', ',')} MB</div>
        <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><a class="btn y sm" href="${url}" download="${a.f}">${I.dl || '⬇'} Descargar</a><a class="btn ghost sm" href="${url}" target="_blank" rel="noopener">Abrir</a><button class="btn ghost sm" data-share="${a.f}">Compartir</button></div></div></div>`; }).join('')}</div>`).join('') +
    (list.length ? '' : '<div class="card empty">No hay archivos que coincidan.</div>');
  $('#aq').oninput = e => { ST.archQ = e.target.value; const p = e.target.selectionStart; render(); const n = $('#aq'); n.focus(); n.setSelectionRange(p, p); };
  $$('[data-share]', v).forEach(b => b.onclick = async () => {
    const a = ARCHIVOS.find(x => x.f === b.dataset.share), url = new URL(ARCH_DIR + a.f, location.href).href;
    try {
      if (navigator.share && /Android|iPhone|iPad/i.test(navigator.userAgent)) {
        const blob = await (await fetch(url)).blob(); const file = new File([blob], a.f, { type: blob.type });
        if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: a.t }); return; }
      }
      await navigator.clipboard.writeText(url); toast('Enlace copiado: pégalo en WhatsApp o correo');
    } catch (e) { if (e.name !== 'AbortError') toast('No se pudo compartir'); }
  });
};


/* ================= CATÁLOGO (armar PDF con fichas seleccionadas) ================= */
const CAT_PDF = ARCH_DIR + 'ARVI-Catalogo-2026.pdf';
const CAT_PAGES = [
  [1, 'Portada', 'Inicio y contacto'], [2, 'Somos ARVI', 'Inicio y contacto'], [3, 'Nuestra misión', 'Inicio y contacto'], [4, 'Seguridad certificada', 'Inicio y contacto'], [5, 'Índice: encuentra tu juego', 'Inicio y contacto'],
  [6, 'Montaña Rusa Dragón', 'Juegos mecánicos'], [7, 'Tagada Samba', 'Juegos mecánicos'], [8, 'Rueda Chicago', 'Juegos mecánicos'], [9, 'Barco Pirata', 'Juegos mecánicos'],
  [10, 'Alfombra Mágica', 'Juegos mecánicos'], [11, 'Globos Samba', 'Juegos mecánicos'], [12, 'Sillitas Voladoras', 'Juegos mecánicos'], [13, 'Carrusel Mecánico', 'Juegos mecánicos'],
  [15, 'Cine 9D', 'Juegos mecánicos'], [16, 'Tren de Fantasía', 'Juegos mecánicos'], [18, 'Reloj Derribador', 'Juegos mecánicos'], [19, 'Pista Go Kart', 'Juegos mecánicos'],
  [20, 'Martillo Mecánico', 'Juegos mecánicos'], [21, 'Muro Inflable', 'Juegos mecánicos'], [22, 'Gladiadores', 'Juegos mecánicos'], [23, 'Inflables', 'Juegos mecánicos'], [24, 'Toro Mecánico', 'Juegos mecánicos'],
  [27, 'Acuáticos', 'Juegos acuáticos'], [28, 'Piscinas Recreativas', 'Juegos acuáticos'], [29, 'Lanchitas a Manivela', 'Juegos acuáticos'],
  [30, 'Giroscopio Manual', 'Juegos sustentables'], [31, 'Sillitas Voladoras Sustentables', 'Juegos sustentables'], [32, 'Carrusel Sustentable', 'Juegos sustentables'], [33, 'Muro ECO', 'Juegos sustentables'], [34, 'Próximamente (en fabricación)', 'Juegos sustentables'],
  [14, 'Carrusel Inclusivo', 'Juegos inclusivos'], [35, 'Paneles Deportivos Inclusivos', 'Juegos inclusivos'],
  [17, 'Stand Feria Americana', 'Complementarios'], [25, 'Zona de Circo', 'Complementarios'], [26, 'Complementarios decorativos', 'Complementarios'], [36, 'Generadores', 'Complementarios'],
  [37, 'Contáctanos (cierre)', 'Inicio y contacto'],
].map(([n, t, g]) => ({ n, t, g }));
const CAT_GROUPS = ['Inicio y contacto', 'Juegos mecánicos', 'Juegos acuáticos', 'Juegos sustentables', 'Juegos inclusivos', 'Complementarios'];
function catSel() { try { const v = JSON.parse(localStorage.getItem('arvi_cat_sel') || 'null'); if (Array.isArray(v)) return new Set(v); } catch (e) { } return new Set(CAT_PAGES.map(p => p.n)); }
function catSave(sel) { try { localStorage.setItem('arvi_cat_sel', JSON.stringify([...sel])); } catch (e) { } }
let CAT_BYTES = null;
function loadScript(src) { return new Promise((ok, ko) => { if ([...document.scripts].some(s => s.src.endsWith(src))) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); }); }
VIEWS.catalogo = () => {
  const v = $('#view'); ST.catSel = ST.catSel || catSel(); const sel = ST.catSel;
  if (!$('#cat-css')) document.head.insertAdjacentHTML('beforeend', `<style id="cat-css">
    .cat-bar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:10px;align-items:center;padding:12px 14px;margin-bottom:14px;border-radius:16px;background:var(--g900,#0f4d24);color:#fff;box-shadow:0 10px 24px rgba(0,0,0,.18)}
    .cat-bar .cnt{font-weight:800;margin-right:auto}.cat-bar .cnt b{color:#ffc61a;font-size:20px}
    .cat-bar input{padding:9px 12px;border-radius:10px;border:0;min-width:200px;font:inherit}
    .cat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px;margin-bottom:14px}
    .cat-it{position:relative;border-radius:16px;overflow:hidden;background:#fff;border:3px solid transparent;cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.08);transition:transform .2s,border-color .2s,opacity .2s}
    .cat-it:hover{transform:translateY(-3px)}
    .cat-it img{display:block;width:100%;aspect-ratio:660/372;object-fit:cover;background:#eef4ea}
    .cat-it .nm{display:flex;align-items:center;gap:10px;padding:10px 12px;font-weight:700}
    .cat-it .ck{flex:none;width:26px;height:26px;border-radius:8px;border:2.5px solid #9bb5a2;display:grid;place-items:center;color:#fff;font-weight:900}
    .cat-it.on{border-color:#3aa848}.cat-it.on .ck{background:#3aa848;border-color:#3aa848}
    .cat-it:not(.on){opacity:.55}.cat-it:not(.on) img{filter:grayscale(.6)}
    .cat-it .pg{position:absolute;top:8px;left:8px;background:rgba(15,77,36,.9);color:#ffc61a;font-weight:800;font-size:12px;padding:3px 8px;border-radius:8px}
    .cat-sec{display:flex;align-items:center;gap:10px;margin:18px 0 10px}.cat-sec h3{margin:0;font-size:18px}
    .cat-b1,.cat-b2{font:inherit;font-weight:800;font-size:14px;padding:9px 14px;border-radius:10px;cursor:pointer;border:2px solid #3aa848}
    .cat-b1{background:#3aa848;color:#fff}.cat-b2{background:transparent;color:#fff;border-color:rgba(255,255,255,.55)}
    @media(max-width:700px){.cat-bar{top:0;gap:8px;padding:10px}.cat-bar .cnt{width:100%}.cat-bar input{min-width:0;flex:1 1 100%}.cat-b1,.cat-b2{flex:1}#cat-exp{flex:1 1 100%}}
  </style>`);
  const n = sel.size;
  v.innerHTML = head('Catálogo', 'Marca las fichas que quieres y descarga un PDF solo con esas. Mismas fotos y datos del catálogo 2026.') +
    `<div class="cat-bar"><div class="cnt"><b>${n}</b> de ${CAT_PAGES.length} páginas marcadas</div>
      <button class="cat-b1" id="cat-all">✔ Seleccionar todo</button><button class="cat-b2" id="cat-none">✖ Desmarcar todo</button>
      <input id="cat-name" placeholder="Nombre del PDF (opcional)" value="${esc(ST.catName || '')}">
      <button class="btn y" id="cat-exp" ${n ? '' : 'disabled'}>⬇ Exportar PDF</button></div>` +
    CAT_GROUPS.map(g => {
      const items = CAT_PAGES.filter(p => p.g === g); const allOn = items.every(p => sel.has(p.n));
      return `<div class="cat-sec"><h3>${esc(g)}</h3><button class="btn ghost sm" data-grp="${esc(g)}">${allOn ? 'Quitar este grupo' : 'Marcar este grupo'}</button></div>
      <div class="cat-grid">${items.map(p => `<div class="cat-it ${sel.has(p.n) ? 'on' : ''}" data-pg="${p.n}" title="Clic para marcar o desmarcar">
        <span class="pg">Pág. ${p.n}</span><img src="${ARCH_DIR}cat/p-${String(p.n).padStart(2, '0')}.jpg" alt="" loading="lazy">
        <div class="nm"><span class="ck">${sel.has(p.n) ? '✓' : ''}</span>${esc(p.t)}</div></div>`).join('')}</div>`;
    }).join('') +
    `<p class="muted" style="margin-top:8px">Las páginas salen en el mismo orden del catálogo. Lo que marques queda guardado para la próxima vez.</p>`;
  const upd = () => { catSave(sel); const y = window.scrollY; render(); window.scrollTo(0, y); };
  $$('.cat-it', v).forEach(el => el.onclick = () => { const k = +el.dataset.pg; sel.has(k) ? sel.delete(k) : sel.add(k); upd(); });
  $$('[data-grp]', v).forEach(b => b.onclick = () => { const it = CAT_PAGES.filter(p => p.g === b.dataset.grp); const allOn = it.every(p => sel.has(p.n)); it.forEach(p => allOn ? sel.delete(p.n) : sel.add(p.n)); upd(); });
  $('#cat-all').onclick = () => { CAT_PAGES.forEach(p => sel.add(p.n)); upd(); };
  $('#cat-none').onclick = () => { sel.clear(); upd(); };
  $('#cat-name').oninput = e => { ST.catName = e.target.value; };
  $('#cat-exp').onclick = async () => {
    const pages = [...sel].sort((a, b) => a - b); if (!pages.length) return toast('Marca al menos una página');
    const btn = $('#cat-exp'); btn.disabled = true; btn.textContent = 'Armando PDF…';
    try {
      await loadScript('pdf/pdf-lib.min.js');
      if (!CAT_BYTES) CAT_BYTES = await (await fetch(CAT_PDF)).arrayBuffer();
      const src = await PDFLib.PDFDocument.load(CAT_BYTES), out = await PDFLib.PDFDocument.create();
      (await out.copyPages(src, pages.map(p => p - 1))).forEach(pg => out.addPage(pg));
      out.setTitle('ARVI · Catálogo 2026'); out.setAuthor('ARVI.cl');
      const bytes = await out.save();
      let name = (ST.catName || '').trim().replace(/[\\/:*?"<>|]+/g, '') || (pages.length === CAT_PAGES.length ? 'ARVI Catálogo 2026' : 'ARVI Catálogo 2026 - ' + (pages.length <= 3 ? pages.map(n => CAT_PAGES.find(p => p.n === n).t).join(', ') : pages.length + ' páginas'));
      download(new Blob([bytes], { type: 'application/pdf' }), name.slice(0, 120) + '.pdf');
      toast(`PDF listo: ${pages.length} página${pages.length > 1 ? 's' : ''}`);
    } catch (e) { console.error(e); toast('No se pudo armar el PDF. Revisa tu conexión e intenta de nuevo.'); }
    btn.disabled = false; btn.textContent = '⬇ Exportar PDF';
  };
};


/* ================= MATERIAL DE REDES (subida directa a Firebase Storage) ================= */
const MAT_CATS = [
  { k: 'stories', t: 'Stories', ic: '📱' }, { k: 'posts', t: 'Posts', ic: '🖼️' }, { k: 'reels', t: 'Reels', ic: '🎬' },
  { k: 'horizontal', t: 'Videos horizontales', ic: '🖥️' }, { k: 'linkedin', t: 'LinkedIn', ic: '💼' }, { k: 'otros', t: 'Otros', ic: '📦' },
];
const MAT_ACC = { arvi: '@arvi.cl', happy: '@arvihappy', ambas: 'Ambas' };
let STG = null;
async function storage() {
  if (STG) return STG;
  const mod = await import(FB + 'firebase-storage.js'); const { getApps } = await import(FB + 'firebase-app.js');
  STG = { mod, st: mod.getStorage(getApps()[0]) }; return STG;
}
const fmtMB = b => b > 1e6 ? (b / 1e6).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(b / 1e3)) + ' KB';
function matUpload(files, cat, acc, titulo) {
  if (DEMO) return toast('En modo demo no se pueden subir archivos');
  const box = $('#mat-prog'); let done = 0;
  [...files].forEach(async f => {
    const id = uid(), row = document.createElement('div'); row.className = 'mat-pr'; row.innerHTML = `<span>${esc(f.name)}</span><i><b style="width:0%"></b></i><em>0%</em>`; box.appendChild(row);
    try {
      const { mod, st } = await storage(); const safe = f.name.replace(/[^\w.\-]+/g, '_');
      const ref = mod.ref(st, `material/${cat}/${id}_${safe}`);
      const task = mod.uploadBytesResumable(ref, f, { contentType: f.type || 'application/octet-stream', contentDisposition: `attachment; filename="${safe}"` });
      task.on('state_changed', s => { const p = Math.round(s.bytesTransferred / s.totalBytes * 100); row.querySelector('b').style.width = p + '%'; row.querySelector('em').textContent = p + '%'; });
      await task; const url = await mod.getDownloadURL(ref);
      upsert('material', { id, cat, acc, titulo: titulo || f.name.replace(/\.[^.]+$/, ''), nombre: f.name, tipo: f.type.startsWith('video') ? 'video' : f.type.startsWith('image') ? 'imagen' : 'archivo', mime: f.type, size: f.size, path: ref.fullPath, url, subido: Date.now(), subidoPor: USER });
      row.querySelector('em').textContent = '✓'; row.classList.add('ok');
    } catch (e) {
      console.warn(e); row.classList.add('bad');
      row.querySelector('em').textContent = /bucket|not-found|404|unknown/i.test((e.code || '') + e.message) ? 'Falta activar Storage' : e.code === 'storage/unauthorized' ? 'Sin permiso (reglas)' : 'Error';
    }
    if (++done === files.length) { setTimeout(() => render(), 600); }
  });
}
VIEWS.redes = () => {
  const v = $('#view'), cat = ST.matCat || 'todo', acc = ST.matAcc || 'todas', q = (ST.matQ || '').toLowerCase();
  if (!$('#mat-css')) document.head.insertAdjacentHTML('beforeend', `<style id="mat-css">
    .mat-up{background:#fff;border-radius:16px;padding:16px;box-shadow:0 6px 18px rgba(0,0,0,.06);margin-bottom:16px}
    .mat-drop{display:block!important;width:100%;box-sizing:border-box;border:2.5px dashed #9bc7a2;border-radius:14px;padding:22px;text-align:center;cursor:pointer;background:#f6fbf4;transition:.2s}
    .mat-drop.hov{background:#e6f5e2;border-color:#3aa848}.mat-drop b{display:block;font-size:17px;margin-bottom:4px}.mat-drop span{display:block}
    .mat-opts{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}.mat-opts select,.mat-opts input{padding:10px 12px;border-radius:10px;border:1.5px solid var(--line);font:inherit;flex:1;min-width:150px}
    .mat-pr{display:flex;align-items:center;gap:10px;font-size:13px;margin-top:8px}.mat-pr span{flex:0 1 40%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mat-pr i{flex:1;height:8px;border-radius:8px;background:#e8eee6;overflow:hidden}.mat-pr b{display:block;height:100%;background:#3aa848;transition:width .2s}.mat-pr em{font-style:normal;font-weight:800;min-width:40px;text-align:right}.mat-pr.bad em{color:#d33}.mat-pr.bad b{background:#d33}
    .mat-chips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}.mat-chips button{font:inherit;font-weight:700;font-size:13px;padding:8px 13px;border-radius:999px;border:1.5px solid var(--line);background:#fff;cursor:pointer}.mat-chips button.on{background:var(--g900,#0f4d24);color:#ffc61a;border-color:var(--g900,#0f4d24)}
    .mat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:12px}
    .mat-it{background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 6px 18px rgba(0,0,0,.08);display:flex;flex-direction:column}
    .mat-th{position:relative;aspect-ratio:1;background:#0f4d24;display:grid;place-items:center}.mat-th img,.mat-th video{width:100%;height:100%;object-fit:contain;background:#0f4d24}
    .mat-th .tg{position:absolute;top:8px;left:8px;background:rgba(255,198,26,.95);color:#0f4d24;font-size:11px;font-weight:800;padding:3px 8px;border-radius:8px}
    .mat-b{padding:10px;display:flex;flex-direction:column;gap:6px;flex:1}.mat-b b{font-size:14px;line-height:1.25}.mat-b small{color:var(--mute);font-size:11.5px}
    .mat-b .row{display:flex;gap:6px;margin-top:auto}
    @media(max-width:700px){.mat-grid{grid-template-columns:1fr 1fr;gap:8px}}
  </style>`);
  const all = (DB.material || []).slice().sort((x, y) => (y.subido || 0) - (x.subido || 0));
  const list = all.filter(m => (cat === 'todo' || m.cat === cat) && (acc === 'todas' || m.acc === acc || m.acc === 'ambas') && (!q || (m.titulo + ' ' + m.nombre).toLowerCase().includes(q)));
  const cnt = k => all.filter(m => m.cat === k).length;
  v.innerHTML = head('Material de redes', 'Sube aquí stories, posts, reels, LinkedIn y más. Queda guardado y cualquiera del equipo lo puede descargar.') +
    `<div class="mat-up"><label class="mat-drop" id="mat-drop"><input type="file" id="mat-file" multiple accept="image/*,video/*,application/pdf" hidden>
       <b>⬆ Arrastra tus archivos aquí o haz clic para elegirlos</b><span class="muted">Fotos, videos o PDF · puedes subir varios a la vez</span></label>
     <div class="mat-opts"><select id="mat-ucat">${MAT_CATS.map(c => `<option value="${c.k}" ${c.k === (ST.matUCat || (cat !== 'todo' ? cat : 'stories')) ? 'selected' : ''}>${c.ic} ${c.t}</option>`).join('')}</select>
       <select id="mat-uacc">${Object.entries(MAT_ACC).map(([k, t]) => `<option value="${k}" ${k === (ST.matUAcc || 'arvi') ? 'selected' : ''}>${t}</option>`).join('')}</select>
       <input id="mat-utit" placeholder="Nombre (opcional)"></div><div id="mat-prog"></div></div>` +
    `<div class="mat-chips"><button data-mc="todo" class="${cat === 'todo' ? 'on' : ''}">Todo (${all.length})</button>${MAT_CATS.map(c => `<button data-mc="${c.k}" class="${cat === c.k ? 'on' : ''}">${c.ic} ${c.t} (${cnt(c.k)})</button>`).join('')}</div>
     <div class="mat-chips"><button data-ma="todas" class="${acc === 'todas' ? 'on' : ''}">Todas las cuentas</button><button data-ma="arvi" class="${acc === 'arvi' ? 'on' : ''}">@arvi.cl</button><button data-ma="happy" class="${acc === 'happy' ? 'on' : ''}">@arvihappy</button>
       <input id="mat-q" placeholder="Buscar…" value="${esc(ST.matQ || '')}" style="margin-left:auto;padding:8px 12px;border-radius:10px;border:1.5px solid var(--line);font:inherit;min-width:180px"></div>` +
    (list.length ? `<div class="mat-grid">${list.map(m => {
      const c = MAT_CATS.find(x => x.k === m.cat) || { t: m.cat, ic: '' };
      const th = m.tipo === 'imagen' ? `<img src="${esc(m.url)}" loading="lazy" alt="">` : m.tipo === 'video' ? `<video src="${esc(m.url)}#t=0.5" preload="metadata" muted playsinline></video>` : `<span style="font-size:42px">📄</span>`;
      return `<div class="mat-it"><div class="mat-th">${th}<span class="tg">${c.ic} ${esc(c.t)}</span></div><div class="mat-b"><b>${esc(m.titulo)}</b>
        <small>${MAT_ACC[m.acc] || ''} · ${fmtMB(m.size || 0)} · ${new Date(m.subido).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}${m.subidoPor ? ' · ' + esc(m.subidoPor) : ''}</small>
        <div class="row"><a class="btn y sm" href="${esc(m.url)}" target="_blank" rel="noopener" style="flex:1;justify-content:center">⬇ Descargar</a><button class="btn ghost sm" data-mdel="${m.id}" title="Quitar (queda en la papelera)">🗑</button></div></div></div>`;
    }).join('')}</div>` : `<div class="card empty">${all.length ? 'No hay material con ese filtro.' : 'Todavía no hay material. ¡Sube el primero arriba!'}</div>`);
  const fi = $('#mat-file'), dz = $('#mat-drop');
  const go = fs => { if (!fs.length) return; ST.matUCat = $('#mat-ucat').value; ST.matUAcc = $('#mat-uacc').value; matUpload(fs, ST.matUCat, ST.matUAcc, $('#mat-utit').value.trim()); };
  fi.onchange = () => go(fi.files);
  dz.ondragover = e => { e.preventDefault(); dz.classList.add('hov'); }; dz.ondragleave = () => dz.classList.remove('hov');
  dz.ondrop = e => { e.preventDefault(); dz.classList.remove('hov'); go(e.dataTransfer.files); };
  $$('[data-mc]', v).forEach(b => b.onclick = () => { ST.matCat = b.dataset.mc; render(); });
  $$('[data-ma]', v).forEach(b => b.onclick = () => { ST.matAcc = b.dataset.ma; render(); });
  $('#mat-q').oninput = e => { ST.matQ = e.target.value; const p = e.target.selectionStart; render(); const n = $('#mat-q'); n.focus(); n.setSelectionRange(p, p); };
  $$('[data-mdel]', v).forEach(b => b.onclick = () => { if (!confirm('¿Quitar este archivo de la lista? Queda en la papelera (Ajustes) y se puede recuperar.')) return; removeRec('material', b.dataset.mdel); render(); toast('Movido a la papelera'); });
};

/* ---------- importadores ---------- */
function matchWorker(name) { const n = norm(name); if (!n) return null; let best = null, bd = 99; for (const w of DB.workers) { const d = lev(norm(w.nombre), n); if (d < bd) { bd = d; best = w; } } return bd <= Math.max(1, Math.floor(n.length / 8)) ? best : null; }
function importEventos(wb, year, month) {
  const ws = wb.Sheets[wb.SheetNames[0]]; const ref = XLSX.utils.decode_range(ws['!ref']); const cell = (r, c) => ws[XLSX.utils.encode_cell({ r, c })];
  let dayRow = -1, dayCol = {}; for (let r = 0; r <= Math.min(ref.e.r, 6); r++) { let cnt = 0; for (let c = 1; c <= ref.e.c; c++) { const v = cell(r, c); if (v && typeof v.v === 'number' && v.v >= 1 && v.v <= 31 && Number.isInteger(v.v)) cnt++; } if (cnt >= 10) { dayRow = r; break; } }
  if (dayRow < 0) return 'No encontré la fila de días (1 a 31).';
  for (let c = 1; c <= ref.e.c; c++) { const v = cell(dayRow, c); if (v && typeof v.v === 'number' && v.v >= 1 && v.v <= 31) dayCol[c] = v.v; }
  const ym = year + '-' + pad(month); let nW = 0, nE = 0, nS = 0, order = 0; const evMap = {}, evDays = {};
  for (let r = dayRow + 1; r <= ref.e.r; r++) {
    const nc = cell(r, 0); if (!nc || typeof nc.v !== 'string' || !nc.v.trim()) continue; const nombre = nc.v.trim().replace(/\s+/g, ' ');
    const fg = nc.s && nc.s.fgColor; const grupo = /GRUA/i.test(nombre) || (fg && fg.theme === 4 && fg.tint < 0) ? 'Grúa' : (!fg || fg.theme === 0 || !nc.s.patternType) ? 'Apoyo externo' : 'Operador';
    let w = matchWorker(nombre); if (!w) { w = upsert('workers', { nombre, rut: '', telefono: '', grupo, funcion: '', activo: true, notas: '', orden: order }); nW++; } else if (w.orden === undefined) upsert('workers', { ...w, orden: order });
    order++;
    for (const [c, day] of Object.entries(dayCol)) {
      const v = cell(r, +c); if (!v || typeof v.v !== 'string' || !v.v.trim()) continue;
      const fecha = ym + '-' + pad(day); if (day > new Date(year, month, 0).getDate()) continue;
      const evn = v.v.trim().replace(/\s+/g, ' '); const pv = cell(r + 1, +c); const pago = pv && typeof pv.v === 'number' ? pv.v : 0;
      const f2 = v.s && v.s.fgColor; const rgb = (f2 && f2.rgb || '').toUpperCase();
      const rol = /ARVI ?HAPPY/i.test(evn) || rgb === 'F7ABEC' ? 'ARVI Happy' : f2 && f2.theme === 5 ? 'Montaje' : f2 && f2.theme === 7 ? 'Montaje' : grupo === 'Grúa' ? 'Grúa' : 'Funcionamiento';
      const ext = rol === 'ARVI Happy', key = ext ? 'ARVI HAPPY' : norm(evn); let e = evMap[key] || DB.events.find(x => (ext ? isExt(x) : norm(x.nombre) === key) && x.inicio.slice(0, 7) === ym);
      if (!e) { e = upsert('events', { externo: ext, nombre: ext ? 'ARVI Happy' : evn.replace(/\b\w+/g, s => s[0] + s.slice(1).toLowerCase()), clienteId: '', inicio: fecha, fin: fecha, ubicacion: '', direccion: '', contacto: '', telefonoContacto: '', horarioMontaje: '', horarioFunc: '', ingreso: '', juegos: '', estado: fecha < today() ? 'Realizado' : 'Confirmado', monto: '', vehiculos: [], notas: 'Importado desde Excel' }); nE++; }
      evMap[key] = e; (evDays[key] = evDays[key] || { f: [], all: [] }).all.push(fecha); if (rol === 'Funcionamiento' || ext) evDays[key].f.push(fecha);
      if (!DB.shifts.some(s => s.eventId === e.id && s.workerId === w.id && s.fecha === fecha)) { upsert('shifts', { eventId: e.id, workerId: w.id, fecha, rol, pago }); nS++; }
    }
  }
  // fechas del evento = días de funcionamiento (no los días de montaje/grúa de cada persona)
  for (const [k, e] of Object.entries(evMap)) { const L = (evDays[k].f.length ? evDays[k].f : evDays[k].all).sort(); upsert('events', { ...e, inicio: L[0], fin: L[L.length - 1], externo: isExt(e) }); }
  ST.month = ym; return `Listo: ${nW} personas nuevas, ${nE} eventos y ${nS} turnos de ${monthLabel(ym)}. <a href="#prog" onclick="go('prog');return false">Ver programación</a>`;
}

/* abonos escritos en "Observaciones" del Excel → abonos reales (el estado se calcula solo) */
function parseAbonos(obs, emision, venc, bruto, paid) {
  const out = []; const base = emision || today(), y0 = +base.slice(0, 4), m0 = +base.slice(5, 7);
  const segs = String(obs || '').toUpperCase().split(/(?=ABONO|SALDO|PAGO TOTAL|PAGADO|PAGO\b)/).map(x => x.trim()).filter(Boolean);
  for (const sg of segs) {
    const kw = (sg.match(/^(ABONO|SALDO|PAGO TOTAL|PAGADO|PAGO)/) || [])[1]; if (!kw) continue;
    const dm = sg.match(/(\d{1,2})[\/-](\d{1,2})(?:[\/-](\d{2,4}))?/); let fecha = '';
    if (dm) { const mm = +dm[2], yy = dm[3] ? (dm[3].length === 2 ? 2000 + +dm[3] : +dm[3]) : (mm < m0 - 6 ? y0 + 1 : y0); if (mm >= 1 && mm <= 12) fecha = `${yy}-${pad(mm)}-${pad(+dm[1])}`; }
    const am = sg.replace(/\s+/g, ' ').match(/\$ ?(\d[\d.,]*)/); let monto = 0;
    if (am) { let t = am[1]; while (/[.,]\d{3}(\D|$)/.test(t)) t = t.replace(/[.,](\d{3})(\D|$)/, '$1$2'); monto = parseInt(t.replace(/\D.*$/, ''), 10) || 0; }
    if (!paid && (!monto || (kw === 'SALDO' && !fecha))) continue;   // "SALDO $X" sin fecha = lo que falta, no un pago
    out.push({ fecha, monto, nota: kw === 'ABONO' ? 'Abono' : kw === 'SALDO' ? 'Pago saldo' : 'Pago total', imp: 1 });
  }
  if (paid) {
    const zeros = out.filter(a => !a.monto); zeros.forEach(a => out.splice(out.indexOf(a), 1));
    const known = out.reduce((s, a) => s + a.monto, 0), rest = Math.max(0, bruto - known), lastF = [...out, ...zeros].map(a => a.fecha).filter(Boolean).pop();
    if (rest > 0) out.push({ fecha: (zeros.length ? zeros[zeros.length - 1].fecha : '') || lastF || venc || emision || today(), monto: rest, nota: out.length ? 'Pago saldo' : 'Pago total', imp: 1 });
  }
  out.forEach(a => { if (!a.fecha) a.fecha = emision || today(); });
  return out;
}
function xDate(v) { if (v == null || v === '') return ''; if (v instanceof Date) return iso(new Date(v.getTime() + 12 * 36e5)); if (typeof v === 'number') { const d = new Date(Math.round((v - 25569) * 864e5)); return iso(new Date(d.getTime() + 12 * 36e5)); } const s = String(v).trim(); let m = s.match(/(\d{1,2})\D+(\d{1,2})\D+(\d{4})/); if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`; m = s.match(/(\d{4})-(\d{2})-(\d{2})/); return m ? m[0] : ''; }
function importCobranza(wb) {
  let nI = 0, nU = 0, nW = 0, nV = 0;
  for (const name of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
    // facturas
    const hr = rows.findIndex(r => r && r.some(x => /N.?\s*FACTURA/i.test(String(x || ''))));
    if (hr >= 0 && rows[hr].some(x => /CLIENTE/i.test(String(x || '')))) {
      const H = rows[hr].map(x => norm(x)); const ix = k => H.findIndex(h => h.includes(k));
      const cN = ix('FACTURA'), cR = ix('RUT'), cC = ix('CLIENTE'), cE = ix('EMISION'), cNe = ix('NETO'), cB = ix('BRUTO'), cV = ix('VENCIMIENTO'), cS = ix('ESTADO'), cO = ix('OBSERVACION');
      for (const r of rows.slice(hr + 1)) {
        if (!r || r[cN] == null || r[cN] === '') continue; const numero = String(r[cN]).trim(); const cli = r[cC]; if (!cli && !r[cR]) continue;
        const clienteId = ensureClient(cli, r[cR] || ''); let neto = num(r[cNe]), bruto = num(r[cB]); if (!neto && bruto) neto = Math.round(bruto / 1.19); if (!bruto && neto) bruto = Math.round(neto * 1.19);
        const est = norm(r[cS]); let obs = r[cO]; obs = obs instanceof Date ? 'Pago ' + fdate(xDate(obs)) : (typeof obs === 'number' && obs > 40000 && obs < 60000 ? 'Pago ' + fdate(xDate(obs)) : String(obs ?? '').trim());
        let estadoManual = est.startsWith('PAGAD') ? 'PAGADA' : est === 'NC' ? 'NC' : est.startsWith('NUL') ? 'NULO' : est.includes('SALTO') ? 'SALTO SII' : '';
        if (!estadoManual && /PAGO TOTAL|PAGAD|^PAGO \d/i.test(obs)) estadoManual = 'PAGADA';
        const emision = xDate(r[cE]); const vv = xDate(r[cV]); const venc = vv && vv > '1901' ? vv : '';
        const ex = DB.invoices.find(x => String(x.numero) === numero);
        const paid = estadoManual === 'PAGADA', special = paid ? '' : estadoManual;
        const imp = special ? [] : parseAbonos(obs, emision, venc, bruto, paid);
        const keepSpecial = ex && ['NC', 'NULO', 'SALTO SII'].includes(ex.estadoManual) && !estadoManual ? ex.estadoManual : '';
        const rec = { ...(ex || { id: uid(), abonos: [], eventIds: [] }), numero, clienteId, emision, neto, bruto, venc, estadoManual: special || keepSpecial, obs: obs || (ex ? ex.obs : '') };
        if (imp.length || !ex) rec.abonos = [...((ex && ex.abonos) || []).filter(a => !a.imp), ...imp];   // otra hoja sin datos de pago no borra lo ya leído
        upsert('invoices', rec); ex ? nU++ : nI++;
      }
      continue;
    }
    // operadores y patentes
    const ho = rows.findIndex(r => r && r.some(x => /OPERADOR/i.test(String(x || ''))));
    if (ho >= 0) {
      const H = rows[ho].map(x => norm(x)); const cNm = H.findIndex(h => h.includes('OPERADOR')), cR = H.findIndex(h => h === 'RUT'), cF = H.findIndex(h => h.includes('FUNCION'));
      for (const r of rows.slice(ho + 1)) { if (!r || !r[cNm]) break; const nombre = String(r[cNm]).trim(); let w = matchWorker(nombre); const data = { rut: r[cR] || '', funcion: r[cF] ? String(r[cF]) : '' }; if (w) upsert('workers', { ...w, rut: w.rut || data.rut, funcion: w.funcion || data.funcion }); else { upsert('workers', { nombre, ...data, telefono: '', grupo: 'Operador', activo: true, notas: '' }); nW++; } }
    }
    const hp = rows.findIndex(r => r && r.some(x => /PATENTE/i.test(String(x || ''))));
    if (hp >= 0) { const c = rows[hp].findIndex(x => /PATENTE/i.test(String(x || ''))); for (const r of rows.slice(hp + 1)) { if (!r || !r[c]) break; const p = String(r[c]).trim().toUpperCase(); if (!DB.vehicles.some(v => v.patente === p)) { upsert('vehicles', { patente: p, descripcion: 'Camión' }); nV++; } } }
  }
  return `Listo: ${nI} facturas nuevas, ${nU} actualizadas, ${nW} personas y ${nV} vehículos agregados. <a href="#cobranza" onclick="go('cobranza');return false">Ver cobranza</a>`;
}

/* ---------- exportaciones Excel ---------- */
function download(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }
function saveWb(sheets, name) { const wb = XLSX.utils.book_new(); for (const [n, aoa, widths] of sheets) { const ws = XLSX.utils.aoa_to_sheet(aoa); if (widths) ws['!cols'] = widths.map(w => ({ wch: w })); XLSX.utils.book_append_sheet(wb, ws, n.slice(0, 31)); } XLSX.writeFile(wb, name.replace(/[\\/:*?"<>|]/g, '') + '.xlsx'); }
const dX = s => s ? pd(s) : '';
function invRows(L) { return [['N° FACTURA', 'RUT', 'NOMBRE CLIENTE', 'F. EMISIÓN', 'MONTO NETO', 'IVA', 'BRUTO', 'VENCIMIENTO', 'ESTADO', 'DÍAS RESTANTES', 'PAGADO', 'SALDO', 'EVENTOS', 'OBSERVACIONES'], ...L.map(([f, c]) => { const cl = byId('clients', f.clienteId) || {}; return [num(f.numero) || f.numero, cl.rut || '', cl.nombre || '', dX(f.emision), c.neto, c.iva, c.bruto, dX(c.venc), c.estado.toUpperCase(), c.open ? c.dias : '', c.pagado, c.saldo, (f.eventIds || []).map(evName).join(', '), [f.obs, ...(f.abonos || []).map(a => `Abono ${fdate(a.fecha)} ${money(a.monto)}${a.nota ? ' ' + a.nota : ''}`)].filter(Boolean).join(' · ')]; })]; }
function exportInvoicesXlsx(L, name = 'Cobranza ARVI') { saveWb([['Facturas', invRows(L), [10, 14, 38, 12, 13, 12, 13, 12, 14, 9, 13, 13, 24, 50]]], name + ' ' + today()); }
function evRows() { return [['EVENTO', 'CLIENTE', 'DESDE', 'HASTA', 'ESTADO', 'LUGAR', 'DIRECCIÓN', 'CONTACTO', 'TELÉFONO', 'MONTAJE', 'FUNCIONAMIENTO', 'INGRESO', 'JUEGOS', 'MONTO ACORDADO', 'PERSONAS', 'COSTO EQUIPO', 'FACTURADO NETO', 'SALDO POR COBRAR', 'VEHÍCULOS', 'NOTAS'], ...[...DB.events].sort((a, b) => a.inicio.localeCompare(b.inicio)).map(e => { const s = evStats(e); return [e.nombre, cliName(e.clienteId), dX(e.inicio), dX(e.fin), e.estado, e.ubicacion, e.direccion, e.contacto, e.telefonoContacto, e.horarioMontaje, e.horarioFunc, e.ingreso, e.juegos, num(e.monto), new Set(s.sh.map(x => x.workerId)).size, s.costo, s.fact, s.saldo, (e.vehiculos || []).map(v => (byId('vehicles', v) || {}).patente).join(', '), e.notas]; })]; }
function exportEventsXlsx() { saveWb([['Eventos', evRows(), [28, 30, 11, 11, 13, 24, 28, 22, 14, 18, 18, 30, 22, 14, 9, 13, 14, 14, 16, 30]]], 'Eventos ARVI ' + today()); }
function exportEventXlsx(e) {
  const s = evStats(e); const info = [['EVENTO', e.nombre], ['CLIENTE', cliName(e.clienteId)], ['FECHAS', fdate(e.inicio) + (e.fin && e.fin !== e.inicio ? ' al ' + fdate(e.fin) : '')], ['LUGAR', e.ubicacion], ['DIRECCIÓN', e.direccion], ['CONTACTO EN TERRENO', `${e.contacto || ''} ${e.telefonoContacto || ''}`], ['HORARIO DE MONTAJE', e.horarioMontaje], ['HORARIO DE FUNCIONAMIENTO', e.horarioFunc], ['INGRESO', e.ingreso], ['JUEGOS', e.juegos], ['VEHÍCULOS', (e.vehiculos || []).map(v => (byId('vehicles', v) || {}).patente).join(', ')], [], ['DÍA', 'NOMBRE', 'RUT', 'ROL', 'PAGO']];
  s.sh.sort((a, b) => a.fecha.localeCompare(b.fecha)).forEach(x => { const w = byId('workers', x.workerId) || {}; info.push([dX(x.fecha), w.nombre, w.rut, x.rol, num(x.pago)]); }); info.push([], ['', '', '', 'TOTAL EQUIPO', s.costo]);
  saveWb([['Evento', info, [26, 34, 16, 18, 12]]], 'Evento ' + e.nombre);
}
function monthGrid() {
  const [y, mo] = ST.month.split('-').map(Number); const nd = new Date(y, mo, 0).getDate(); const days = Array.from({ length: nd }, (_, i) => `${ST.month}-${pad(i + 1)}`);
  const sh = DB.shifts.filter(s => (s.fecha || '').slice(0, 7) === ST.month); const ws = sortedWorkers().filter(w => w.activo !== false || sh.some(s => s.workerId === w.id));
  const aoa = [['TRABAJADOR', 'GRUPO', ...days.map(d => +d.slice(8)), 'TOTAL']];
  for (const w of ws) { const mine = sh.filter(s => s.workerId === w.id); aoa.push([w.nombre, w.grupo, ...days.map(d => mine.filter(s => s.fecha === d).map(s => `${evName(s.eventId)} (${s.rol})`).join(' / ')), '']); aoa.push(['', 'pago', ...days.map(d => mine.filter(s => s.fecha === d).reduce((a, s) => a + num(s.pago), 0) || ''), mine.reduce((a, s) => a + num(s.pago), 0)]); }
  return { aoa, ws, sh };
}
function exportMonthXlsx() {
  const { aoa, ws, sh } = monthGrid();
  const liq = [['TRABAJADOR', 'RUT', 'GRUPO', 'TURNOS', 'TOTAL A PAGAR'], ...ws.map(w => { const m = sh.filter(s => s.workerId === w.id); return [w.nombre, w.rut, w.grupo, m.length, m.reduce((a, s) => a + num(s.pago), 0)]; }).filter(r => r[3])];
  const det = [['FECHA', 'TRABAJADOR', 'RUT', 'EVENTO', 'ROL', 'PAGO'], ...sh.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(s => { const w = byId('workers', s.workerId) || {}; return [dX(s.fecha), w.nombre, w.rut, evName(s.eventId), s.rol, num(s.pago)]; })];
  saveWb([['Programación', aoa, [26, 12, ...Array(31).fill(16), 12]], ['Liquidación', liq, [28, 14, 14, 9, 14]], ['Detalle', det, [11, 26, 14, 28, 15, 11]]], 'Programación ' + monthLabel(ST.month));
}
function exportTeamXlsx() {
  const p = [['NOMBRE', 'RUT', 'TELÉFONO', 'GRUPO', 'FUNCIÓN', 'ACTIVO', 'TURNOS TOTALES', 'PAGADO TOTAL', 'NOTAS'], ...sortedWorkers().map(w => { const s = DB.shifts.filter(x => x.workerId === w.id); return [w.nombre, w.rut, w.telefono, w.grupo, w.funcion, w.activo !== false ? 'Sí' : 'No', s.length, s.reduce((a, x) => a + num(x.pago), 0), w.notas]; })];
  const v = [['PATENTE', 'DESCRIPCIÓN'], ...DB.vehicles.map(x => [x.patente, x.descripcion])];
  const t = [['FECHA', 'TRABAJADOR', 'RUT', 'EVENTO', 'CLIENTE', 'ROL', 'PAGO'], ...[...DB.shifts].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(s => { const w = byId('workers', s.workerId) || {}; const e = byId('events', s.eventId) || {}; return [dX(s.fecha), w.nombre, w.rut, e.nombre, cliName(e.clienteId), s.rol, num(s.pago)]; })];
  saveWb([['Personas', p, [28, 14, 14, 14, 26, 8, 10, 14, 30]], ['Vehículos', v, [14, 26]], ['Turnos', t, [11, 26, 14, 28, 30, 15, 11]]], 'Equipo ARVI ' + today());
}
function exportAllXlsx() {
  const cli = [['CLIENTE', 'RUT', 'CONTACTO', 'TELÉFONO', 'EMAIL', 'FACTURADO', 'SALDO', 'VENCIDO'], ...DB.clients.map(c => { const s = clientStats(c); return [c.nombre, c.rut, c.contacto, c.telefono, c.email, s.fact, s.saldo, s.venc]; })];
  const t = [['FECHA', 'TRABAJADOR', 'RUT', 'EVENTO', 'ROL', 'PAGO'], ...[...DB.shifts].sort((a, b) => a.fecha.localeCompare(b.fecha)).map(s => { const w = byId('workers', s.workerId) || {}; return [dX(s.fecha), w.nombre, w.rut, evName(s.eventId), s.rol, num(s.pago)]; })];
  const p = [['NOMBRE', 'RUT', 'TELÉFONO', 'GRUPO', 'FUNCIÓN', 'ACTIVO'], ...sortedWorkers().map(w => [w.nombre, w.rut, w.telefono, w.grupo, w.funcion, w.activo !== false ? 'Sí' : 'No'])];
  saveWb([['Eventos', evRows()], ['Turnos', t], ['Equipo', p], ['Vehículos', [['PATENTE', 'DESCRIPCIÓN'], ...DB.vehicles.map(x => [x.patente, x.descripcion])]], ['Cobranza', invRows(DB.invoices.map(f => [f, invCalc(f)]).sort((a, b) => num(a[0].numero) - num(b[0].numero)))], ['Clientes', cli]], 'Gestión ARVI completo ' + today());
}

/* ---------- exportaciones JPG (marca ARVI) ---------- */
let LOGO = null; const logoP = new Promise(r => { const im = new Image(); im.onload = () => { LOGO = im; r(); }; im.onerror = r; im.src = 'logo.png'; });
async function jpgDoc(doc, filename) {
  await logoP; try { await document.fonts.load('700 20px Outfit'); } catch (e) { }
  const W = 1240, P = 56, F = (w, s) => `${w} ${s}px Outfit, system-ui, sans-serif`;
  const cv = document.createElement('canvas'), g = cv.getContext('2d');
  function wrap(t, font, maxw) { g.font = font; const out = []; for (const para of String(t ?? '').split('\n')) { let line = ''; for (const w of para.split(' ')) { const tst = line ? line + ' ' + w : w; if (g.measureText(tst).width > maxw && line) { out.push(line); line = w; } else line = tst; } out.push(line); } return out; }
  function fit(t, font, maxw) { g.font = font; t = String(t ?? ''); if (g.measureText(t).width <= maxw) return t; while (t.length > 1 && g.measureText(t + '…').width > maxw) t = t.slice(0, -1); return t + '…'; }
  function draw(paint) {
    let y = 0; const HH = 250;
    if (paint) { const gr = g.createLinearGradient(0, 0, W, HH); gr.addColorStop(0, '#1f7a35'); gr.addColorStop(1, '#0f4d24'); g.fillStyle = gr; g.fillRect(0, 0, W, HH);
      g.fillStyle = 'rgba(255,228,138,.14)'; for (let i = 0; i < 26; i++) { const sx = (i * 197) % W, sy = (i * 83) % HH, r = 6 + (i % 4) * 4; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, rr = k % 2 ? r * .45 : r; g.lineTo(sx + rr * Math.cos(a), sy + rr * Math.sin(a)); } g.fill(); }
      g.fillStyle = '#ffc61a'; g.fillRect(0, HH - 10, W, 10);
      if (LOGO) { const lw = 230, lh = lw * LOGO.height / LOGO.width; g.fillStyle = '#fff'; rr(W - P - lw - 30, 40, lw + 30, lh + 24, 22); g.fill(); g.drawImage(LOGO, W - P - lw - 15, 52, lw, lh); }
      g.fillStyle = '#ffe48a'; g.font = F(700, 24); g.fillText(String(doc.kicker || '').toUpperCase(), P, 78);
      g.fillStyle = '#fff'; const tl = wrap(doc.title, F(800, 50), W - P * 2 - 300); tl.slice(0, 2).forEach((l, i) => { g.font = F(800, 50); g.fillText(l, P, 140 + i * 56); });
      if (doc.sub) { g.fillStyle = '#d9ecd9'; g.font = F(500, 24); g.fillText(fit(doc.sub, F(500, 24), W - P * 2 - 300), P, tl.length > 1 ? 222 : 182); } }
    y = HH + 34;
    if (doc.info && doc.info.length) {
      const colW = (W - P * 2 - 20) / 2; let col = 0, rowH = 0, x0 = P; const cells = doc.info.filter(r => r[1]);
      for (let i = 0; i < cells.length; i++) {
        const [lab, val, full] = cells[i]; const w = full ? W - P * 2 : colW; if (full && col) { y += rowH + 14; col = 0; rowH = 0; }
        const lines = wrap(val, F(600, 25), w - 36); const h = 52 + lines.length * 32;
        const x = full ? P : (col ? P + colW + 20 : P);
        if (paint) { g.fillStyle = '#fffaf0'; rr(x, y, w, h, 18); g.fill(); g.fillStyle = '#ffc61a'; rr(x, y, 8, h, 4); g.fill(); g.fillStyle = '#6b7c70'; g.font = F(700, 17); g.fillText(lab.toUpperCase(), x + 24, y + 30); g.fillStyle = '#16261b'; lines.forEach((l, k) => { g.font = F(600, 25); g.fillText(l, x + 24, y + 64 + k * 32); }); }
        rowH = Math.max(rowH, h);
        if (full || col) { y += rowH + 14; col = 0; rowH = 0; } else col = 1;
      }
      if (col) y += rowH + 14; y += 10;
    }
    for (const sec of doc.sections || []) {
      if (paint) { g.fillStyle = '#0f4d24'; g.font = F(800, 30); g.fillText(sec.title, P, y + 30); if (sec.note) { g.fillStyle = '#6b7c70'; g.font = F(500, 20); g.fillText(sec.note, P + g.measureText(sec.title).width + 16 + 0, y + 30); } }
      y += 50; const tw = W - P * 2, tot = sec.cols.reduce((s, c) => s + c.w, 0);
      const xs = []; let acc = P; for (const c of sec.cols) { xs.push(acc); acc += c.w / tot * tw; }
      if (paint) { g.fillStyle = '#1f7a35'; rr(P, y, tw, 48, 14); g.fill(); g.fillStyle = '#fff'; g.font = F(700, 19); sec.cols.forEach((c, i) => { const cw = c.w / tot * tw; g.textAlign = c.a === 'r' ? 'right' : 'left'; g.fillText(c.h.toUpperCase(), c.a === 'r' ? xs[i] + cw - 16 : xs[i] + 16, y + 31); }); g.textAlign = 'left'; }
      y += 48;
      sec.rows.forEach((r, ri) => {
        const rh = 50; if (paint) { if (r.group) { g.fillStyle = '#ffe48a'; g.fillRect(P, y, tw, rh); g.fillStyle = '#0f4d24'; g.font = F(800, 21); g.fillText(r.group, P + 16, y + 33); } else { g.fillStyle = ri % 2 ? '#f6faf3' : '#fff'; g.fillRect(P, y, tw, rh); g.fillStyle = '#e3eadf'; g.fillRect(P, y + rh - 1, tw, 1);
          sec.cols.forEach((c, i) => { const cw = c.w / tot * tw; const v = r[i]; if (v && typeof v === 'object' && v.pill) { g.font = F(700, 18); const tw2 = g.measureText(v.pill).width + 24; g.fillStyle = v.bg || '#d8efc9'; rr(xs[i] + 12, y + 11, tw2, 28, 14); g.fill(); g.fillStyle = '#16261b'; g.fillText(v.pill, xs[i] + 24, y + 31); return; } g.fillStyle = '#16261b'; g.font = F(i === 0 ? 700 : 500, 21); g.textAlign = c.a === 'r' ? 'right' : 'left'; g.fillText(fit(v, g.font, cw - 30), c.a === 'r' ? xs[i] + cw - 16 : xs[i] + 16, y + 32); g.textAlign = 'left'; }); } }
        y += rh;
      });
      if (sec.total) { if (paint) { g.fillStyle = '#fffbea'; rr(P, y, tw, 54, 12); g.fill(); g.fillStyle = '#0f4d24'; g.font = F(800, 23); g.fillText(sec.total[0], P + 16, y + 35); g.textAlign = 'right'; g.fillText(sec.total[1], P + tw - 16, y + 35); g.textAlign = 'left'; } y += 54; }
      if (!sec.rows.length) { if (paint) { g.fillStyle = '#6b7c70'; g.font = F(500, 21); g.fillText('Sin registros', P + 16, y + 34); } y += 50; }
      y += 30;
    }
    if (doc.note) { const ls = wrap(doc.note, F(500, 21), W - P * 2); if (paint) { g.fillStyle = '#6b7c70'; ls.forEach((l, i) => { g.font = F(500, 21); g.fillText(l, P, y + 22 + i * 28); }); } y += ls.length * 28 + 20; }
    y += 20; if (paint) { g.fillStyle = '#0f4d24'; g.fillRect(0, y, W, 86); g.fillStyle = '#ffc61a'; g.font = F(800, 24); g.fillText('arvi.cl', P, y + 52); g.fillStyle = '#d9ecd9'; g.font = F(500, 19); g.textAlign = 'right'; g.fillText('Generado el ' + new Date().toLocaleDateString('es-CL') + ' · No aceptes imitaciones', W - P, y + 51); g.textAlign = 'left'; }
    return y + 86;
  }
  function rr(x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  cv.width = W; cv.height = 2000; const H = draw(false); cv.width = W; cv.height = Math.ceil(H); g.fillStyle = '#fff'; g.fillRect(0, 0, W, cv.height); draw(true);
  cv.toBlob(b => download(b, filename.replace(/[\\/:*?"<>|]/g, '') + '.jpg'), 'image/jpeg', 0.93);
}
const rangeTxt = e => fdate(e.inicio) + (e.fin && e.fin !== e.inicio ? ' al ' + fdate(e.fin) : '');
function teamByDay(e, withPay) {
  const sh = DB.shifts.filter(s => s.eventId === e.id).sort((a, b) => a.fecha.localeCompare(b.fecha) || ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol)); const rows = []; let last = '';
  for (const s of sh) { if (s.fecha !== last) { const d = pd(s.fecha); rows.push({ group: DOWS[d.getDay()] + ' ' + fdate(s.fecha) }); last = s.fecha; } const w = byId('workers', s.workerId) || {}; rows.push(withPay ? [w.nombre, w.rut || '—', w.telefono || '—', { pill: s.rol, bg: RCOL[s.rol] }, money(s.pago)] : [w.nombre, w.rut || '—', { pill: s.rol, bg: RCOL[s.rol] }]); }
  return { rows, sh };
}
function jpgEventClient(e) {
  const ids = [...new Set(DB.shifts.filter(s => s.eventId === e.id).map(s => s.workerId))]; const ws = ids.map(id => byId('workers', id)).filter(Boolean).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const roles = id => [...new Set(DB.shifts.filter(s => s.eventId === e.id && s.workerId === id).map(s => s.rol))].join(' y ');
  jpgDoc({ kicker: 'Nómina de equipo ARVI', title: e.nombre, sub: cliName(e.clienteId) !== '—' ? cliName(e.clienteId) : '', info: [['Fechas', rangeTxt(e)], ['Juegos', e.juegos], ['Lugar', [e.ubicacion, e.direccion].filter(Boolean).join(' · '), true], ['Horario de montaje', e.horarioMontaje], ['Horario de funcionamiento', e.horarioFunc]],
    sections: [{ title: 'Personal que asistirá', note: ids.length + ' personas', cols: [{ h: 'Nombre', w: 5 }, { h: 'RUT', w: 2.6 }, { h: 'Función', w: 3.2 }], rows: ws.map(w => [w.nombre, w.rut || '—', roles(w.id)]) },
      { title: 'Vehículos', cols: [{ h: 'Patente', w: 3 }, { h: 'Descripción', w: 6 }], rows: (e.vehiculos || []).map(v => byId('vehicles', v)).filter(Boolean).map(v => [v.patente, v.descripcion || '']) }],
    note: 'Todo el personal cuenta con seguro vigente. Ante cualquier consulta escríbenos a info@arvi.cl.' }, 'Equipo ARVI · ' + e.nombre);
}
function jpgEventTeam(e) {
  const { rows, sh } = teamByDay(e, true);
  jpgDoc({ kicker: 'Ficha de evento · uso interno', title: e.nombre, sub: [cliName(e.clienteId), rangeTxt(e)].filter(x => x && x !== '—').join(' · '),
    info: [['Lugar', e.ubicacion], ['Dirección', e.direccion], ['Contacto en terreno', [e.contacto, e.telefonoContacto].filter(Boolean).join(' · ')], ['Juegos', e.juegos], ['Horario de montaje', e.horarioMontaje], ['Horario de funcionamiento', e.horarioFunc], ['Ingreso', e.ingreso, true], ['Vehículos', (e.vehiculos || []).map(v => (byId('vehicles', v) || {}).patente).join(', ')], ['Notas', e.notas, true]],
    sections: [{ title: 'Equipo por día', cols: [{ h: 'Nombre', w: 4.2 }, { h: 'RUT', w: 2.3 }, { h: 'Teléfono', w: 2.3 }, { h: 'Rol', w: 2.6 }, { h: 'Pago', w: 1.8, a: 'r' }], rows, total: ['Total equipo', money(sh.reduce((s, x) => s + num(x.pago), 0))] }] }, 'Ficha equipo · ' + e.nombre);
}
function jpgTeamRoster() {
  const ws = sortedWorkers().filter(w => w.activo !== false);
  jpgDoc({ kicker: 'Nómina de equipo', title: 'Equipo ARVI', sub: ws.length + ' personas activas · ' + DB.vehicles.length + ' vehículos',
    sections: [{ title: 'Personas', cols: [{ h: 'Nombre', w: 4.5 }, { h: 'RUT', w: 2.4 }, { h: 'Grupo', w: 2 }, { h: 'Función', w: 3.4 }], rows: ws.map(w => [w.nombre, w.rut || '—', w.grupo || '', w.funcion || '']) }, { title: 'Vehículos', cols: [{ h: 'Patente', w: 3 }, { h: 'Descripción', w: 6 }], rows: DB.vehicles.map(v => [v.patente, v.descripcion || '']) }] }, 'Nómina equipo ARVI ' + today());
}
function jpgMonth() {
  const sh = DB.shifts.filter(s => (s.fecha || '').slice(0, 7) === ST.month); const ws = sortedWorkers().map(w => [w, sh.filter(s => s.workerId === w.id)]).filter(([, m]) => m.length);
  jpgDoc({ kicker: 'Liquidación del equipo', title: monthLabel(ST.month), sub: sh.length + ' turnos · ' + ws.length + ' personas',
    sections: [{ title: 'Resumen por persona', cols: [{ h: 'Nombre', w: 4.2 }, { h: 'RUT', w: 2.4 }, { h: 'Turnos', w: 1.4, a: 'r' }, { h: 'Eventos', w: 4 }, { h: 'Total', w: 2, a: 'r' }], rows: ws.map(([w, m]) => [w.nombre, w.rut || '—', String(m.length), [...new Set(m.map(s => evName(s.eventId)))].join(', '), money(m.reduce((a, s) => a + num(s.pago), 0))]), total: ['Total a pagar', money(sh.reduce((a, s) => a + num(s.pago), 0))] }] }, 'Liquidación ' + monthLabel(ST.month));
}
function jpgStatement(c) {
  const L = DB.invoices.filter(f => f.clienteId === c.id).map(f => [f, invCalc(f)]).filter(([, k]) => k.open || k.estado === 'Pagada').sort((a, b) => num(a[0].numero) - num(b[0].numero));
  const open = L.filter(([, k]) => k.open); const saldo = open.reduce((s, [, k]) => s + k.saldo, 0);
  jpgDoc({ kicker: 'Estado de cuenta', title: c.nombre, sub: (c.rut ? 'RUT ' + c.rut + ' · ' : '') + 'al ' + fdate(today()), info: [['Saldo pendiente', money(saldo)], ['Facturas pendientes', String(open.length)]],
    sections: [{ title: 'Facturas pendientes', cols: [{ h: 'N°', w: 1.3 }, { h: 'Emisión', w: 2 }, { h: 'Vencimiento', w: 2.2 }, { h: 'Total', w: 2.2, a: 'r' }, { h: 'Abonado', w: 2.1, a: 'r' }, { h: 'Saldo', w: 2.2, a: 'r' }, { h: 'Estado', w: 2.2 }], rows: open.map(([f, k]) => [f.numero, fdate(f.emision), fdate(k.venc), money(k.bruto), money(k.pagado), money(k.saldo), { pill: k.estado, bg: k.estado === 'Vencida' ? '#fde0de' : k.estado === 'Por vencer' ? '#ffe7c7' : '#fff3c4' }]), total: ['Total pendiente', money(saldo)] }],
    note: 'Para pagos o consultas escríbenos a info@arvi.cl. Si ya realizaste el pago, por favor envíanos el comprobante.' }, 'Estado de cuenta · ' + c.nombre);
}

let BOOT = boot().catch(e => { console.warn(e); $('#loginErr').textContent = 'No se pudo cargar el acceso (' + (e.message || e) + '). Recarga la página.'; throw e; });
