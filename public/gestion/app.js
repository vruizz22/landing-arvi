/* ARVI · Gestión — eventos, equipo y cobranza conectados.
   Datos cifrados (AES-GCM, clave derivada con PBKDF2) en caché local y en un repositorio privado de GitHub. */
'use strict';
const VER = { salt: 'xQRhS8DVoQs/cFIrBQEu+w==', hash: 'a60dd5004d7290bf744f1ad51be063e04bd7ed3f2bcb22c9ab6d3265cf08b9d2', iter: 310000 };
const ITER = 310000, LS_CACHE = 'arviGestion.cache.v1', LS_CONN = 'arviGestion.conn.v1', SS_PW = 'arviGestion.s';
const ROLES = ['Montaje', 'Funcionamiento', 'Desmontaje', 'ARVI Happy', 'Grúa'];
const RCLS = { Montaje: 'r-mont', Funcionamiento: 'r-func', Desmontaje: 'r-desm', 'ARVI Happy': 'r-happy', 'Grúa': 'r-grua' };
const RCOL = { Montaje: '#fde4cf', Funcionamiento: '#d8efc9', Desmontaje: '#e3e3fb', 'ARVI Happy': '#fbd5f3', 'Grúa': '#d5e7fb' };
const GRUPOS = ['Operador', 'Grúa', 'Apoyo externo'];
const EST_EV = ['Por confirmar', 'Confirmado', 'Realizado', 'Cancelado'];
const EST_MAN = ['', 'PAGADA', 'NC', 'NULO', 'SALTO SII'];
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
function daysBetween(a, b) { const out = []; if (!a) return out; let d = a; const end = b && b >= a ? b : a; let guard = 0; while (d <= end && guard++ < 120) { out.push(d); d = addDays(d, 1); } return out; }
function toast(msg) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); }
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function b64big(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }

/* ---------- cifrado ---------- */
const keyCache = new Map();
async function deriveKey(pw, saltB64, iter = ITER) {
  const k = pw + '|' + saltB64 + '|' + iter; if (keyCache.has(k)) return keyCache.get(k);
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey', 'deriveBits']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: unb64(saltB64), iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  keyCache.set(k, key); return key;
}
async function checkPw(pw) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unb64(VER.salt), iterations: VER.iter, hash: 'SHA-256' }, base, 256);
  const h = await crypto.subtle.digest('SHA-256', bits); return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, '0')).join('') === VER.hash;
}
let SALT = null;
async function encrypt(obj, pw) {
  SALT = SALT || b64(crypto.getRandomValues(new Uint8Array(16)));
  const key = await deriveKey(pw, SALT); const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(obj)));
  return { v: 1, alg: 'AES-GCM/PBKDF2-SHA256', iter: ITER, salt: SALT, iv: b64(iv), ct: b64big(new Uint8Array(ct)) };
}
async function decrypt(p, pw) {
  const key = await deriveKey(pw, p.salt, p.iter || ITER);
  const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(p.iv) }, key, unb64(p.ct));
  SALT = SALT || p.salt; return JSON.parse(new TextDecoder().decode(pt));
}

/* ---------- datos ---------- */
const COLS = ['workers', 'vehicles', 'clients', 'events', 'shifts', 'invoices'];
const blank = () => ({ v: 1, workers: [], vehicles: [], clients: [], events: [], shifts: [], invoices: [], del: {}, meta: { created: Date.now() } });
let DB = blank(), PW = '', CONN = null, dirty = false, pushTimer = null, remoteSha = null, syncState = 'off';
const byId = (col, id) => DB[col].find(x => x.id === id);
function upsert(col, rec) { rec.u = Date.now(); if (!rec.id) rec.id = uid(); const i = DB[col].findIndex(x => x.id === rec.id); if (i >= 0) DB[col][i] = rec; else DB[col].push(rec); persist(); return rec; }
function removeRec(col, id) { DB[col] = DB[col].filter(x => x.id !== id); DB.del[id] = Date.now(); persist(); }
function merge(a, b) {
  const out = blank(); out.meta = Object.assign({}, b.meta, a.meta); out.del = Object.assign({}, b.del || {});
  for (const [k, v] of Object.entries(a.del || {})) out.del[k] = Math.max(out.del[k] || 0, v);
  for (const c of COLS) {
    const m = new Map(); for (const r of (b[c] || [])) m.set(r.id, r);
    for (const r of (a[c] || [])) { const o = m.get(r.id); if (!o || (r.u || 0) >= (o.u || 0)) m.set(r.id, r); }
    out[c] = [...m.values()].filter(r => !(out.del[r.id] && out.del[r.id] >= (r.u || 0)));
  }
  return out;
}
async function persist() {
  dirty = true;
  try { localStorage.setItem(LS_CACHE, JSON.stringify(await encrypt(DB, PW))); } catch (e) { console.warn(e); }
  if (CONN) { clearTimeout(pushTimer); pushTimer = setTimeout(push, 1500); setSync('busy', 'Guardando…'); }
  else setSync('off', 'Solo en este equipo');
}

/* ---------- GitHub (repositorio privado) ---------- */
function ghUrl() { return `https://api.github.com/repos/${CONN.owner}/${CONN.repo}/contents/${CONN.path || 'datos/gestion.enc.json'}`; }
async function ghGet() {
  const r = await fetch(ghUrl() + '?ref=' + encodeURIComponent(CONN.branch || 'main') + '&t=' + Date.now(), { headers: { Authorization: 'Bearer ' + CONN.token, Accept: 'application/vnd.github+json' }, cache: 'no-store' });
  if (r.status === 404) return null; if (!r.ok) throw new Error('GitHub ' + r.status);
  const j = await r.json(); let content = j.content;
  if (!content && j.download_url) content = null;
  if (!content) { const raw = await fetch(j.git_url, { headers: { Authorization: 'Bearer ' + CONN.token, Accept: 'application/vnd.github.raw+json' } }); return { sha: j.sha, payload: JSON.parse(await raw.text()) }; }
  const txt = new TextDecoder().decode(unb64(content.replace(/\n/g, ''))); return { sha: j.sha, payload: JSON.parse(txt) };
}
async function ghPut(payload, sha) {
  const body = { message: 'Gestión ARVI · ' + new Date().toLocaleString('es-CL'), content: b64big(new TextEncoder().encode(JSON.stringify(payload))), branch: CONN.branch || 'main' };
  if (sha) body.sha = sha;
  const r = await fetch(ghUrl(), { method: 'PUT', headers: { Authorization: 'Bearer ' + CONN.token, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) return { conflict: true }; if (!r.ok) throw new Error('GitHub ' + r.status);
  const j = await r.json(); return { sha: j.content.sha };
}
let pushing = false;
async function push() {
  if (!CONN || pushing) return; pushing = true; setSync('busy', 'Guardando…');
  try {
    for (let k = 0; k < 4; k++) {
      const res = await ghPut(await encrypt(DB, PW), remoteSha);
      if (!res.conflict) { remoteSha = res.sha; dirty = false; setSync('ok', 'Guardado en la nube'); break; }
      const rem = await ghGet(); if (rem) { DB = merge(DB, await decrypt(rem.payload, PW)); remoteSha = rem.sha; }
    }
  } catch (e) { console.warn(e); setSync('bad', 'Error al guardar · reintento'); setTimeout(push, 15000); }
  pushing = false;
}
async function pull(silent) {
  if (!CONN) return;
  try {
    setSync('busy', 'Sincronizando…'); const rem = await ghGet();
    if (!rem) { remoteSha = null; await push(); return; }
    const remote = await decrypt(rem.payload, PW); remoteSha = rem.sha;
    const before = JSON.stringify(DB); DB = merge(DB, remote);
    try { localStorage.setItem(LS_CACHE, JSON.stringify(await encrypt(DB, PW))); } catch (e) { }
    if (JSON.stringify(DB) !== JSON.stringify(remote)) await push(); else setSync('ok', 'Al día · ' + new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }));
    if (!silent && before !== JSON.stringify(DB)) render();
  } catch (e) { console.warn(e); setSync('bad', e.message.includes('401') ? 'Llave de conexión inválida' : 'Sin conexión a la nube'); }
}
function setSync(s, txt) { syncState = s; const d = $('#syncDot'); if (d) { d.className = 'dot ' + s; $('#syncTxt').textContent = txt; } const m = $('#syncM'); if (m) { m.textContent = '● ' + (s === 'ok' ? 'Nube' : s === 'busy' ? 'Guardando' : s === 'bad' ? 'Error' : 'Local'); m.className = 'pill ' + (s === 'ok' ? 'p-pagada' : s === 'bad' ? 'p-venc' : 'p-pend'); } }
async function saveConn(c) { CONN = c; localStorage.setItem(LS_CONN, JSON.stringify(await encrypt(c, PW))); }

/* ---------- login ---------- */
$('#loginForm').addEventListener('submit', async e => {
  e.preventDefault(); const pw = $('#pw').value; $('#loginErr').textContent = 'Verificando…';
  if (!(await checkPw(pw))) { $('#loginErr').textContent = 'Clave incorrecta'; return; }
  await start(pw);
});
async function start(pw) {
  PW = pw; sessionStorage.setItem(SS_PW, pw);
  try { const c = localStorage.getItem(LS_CACHE); if (c) DB = Object.assign(blank(), await decrypt(JSON.parse(c), PW)); } catch (e) { console.warn('cache', e); }
  try { const c = localStorage.getItem(LS_CONN); if (c) CONN = await decrypt(JSON.parse(c), PW); } catch (e) { }
  const hk = new URLSearchParams(location.hash.slice(1)).get('k');
  if (hk) { try { const c = await decrypt(JSON.parse(atob(decodeURIComponent(hk))), PW); await saveConn(c); history.replaceState(null, '', location.pathname); toast('Conexión a la nube activada en este equipo'); } catch (e) { toast('El enlace de acceso no es válido'); } }
  $('#login').classList.add('hidden'); $('#app').classList.remove('hidden');
  setSync(CONN ? 'busy' : 'off', CONN ? 'Conectando…' : 'Solo en este equipo');
  go(location.hash.replace('#', '').split('?')[0] || 'inicio');
  if (CONN) { await pull(); setInterval(() => { if (!dirty && !pushing) pull(); }, 60000); }
}
$('#logout').onclick = () => { sessionStorage.removeItem(SS_PW); location.reload(); };
(async () => { const s = sessionStorage.getItem(SS_PW); if (s && await checkPw(s)) start(s); })();

/* ---------- navegación ---------- */
let VIEW = 'inicio', ST = { month: today().slice(0, 7), evMode: 'lista', evQ: '', evEst: '', invQ: '', invEst: '', invCli: '', invYear: '', eqTab: 'personas' };
$$('.nav[data-v]').forEach(b => b.onclick = () => go(b.dataset.v));
function go(v) { if (!VIEWS[v]) v = 'inicio'; VIEW = v; history.replaceState(null, '', '#' + v); $$('.nav[data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === v)); render(); window.scrollTo(0, 0); }
function render() { $('#view').innerHTML = ''; VIEWS[VIEW](); }

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
  return { bruto, neto, iva, pagado, saldo, venc, dias, estado, cls, open };
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
  m.addEventListener('mousedown', e => { if (e.target === m) close(); }); const close = () => m.remove();
  $('#modalRoot').appendChild(m); $$('[data-close]', m).forEach(b => b.onclick = close); return { m, close };
}
function formData(root) { const o = {}; $$('[name]', root).forEach(i => { o[i.name] = i.type === 'checkbox' ? i.checked : i.value; }); return o; }
const monthLabel = ym => { const [y, m] = ym.split('-'); return MESES[+m - 1][0].toUpperCase() + MESES[+m - 1].slice(1) + ' ' + y; };
const shiftMonth = (ym, d) => { const [y, m] = ym.split('-').map(Number); const dt = new Date(y, m - 1 + d, 1); return dt.getFullYear() + '-' + pad(dt.getMonth() + 1); };

/* ================= VISTAS ================= */
const VIEWS = {};
VIEWS.inicio = () => {
  const t = today(), ym = t.slice(0, 7), in7 = addDays(t, 7);
  const prox = DB.events.filter(e => e.estado !== 'Cancelado' && (e.fin || e.inicio) >= t).sort((a, b) => a.inicio.localeCompare(b.inicio));
  const mes = DB.events.filter(e => e.estado !== 'Cancelado' && (e.inicio || '').slice(0, 7) === ym);
  const calcs = DB.invoices.map(f => [f, invCalc(f)]); const abiertas = calcs.filter(([, c]) => c.open);
  const porCobrar = abiertas.reduce((s, [, c]) => s + c.saldo, 0), vencido = abiertas.filter(([, c]) => c.estado === 'Vencida').reduce((s, [, c]) => s + c.saldo, 0);
  const pagoMes = DB.shifts.filter(s => (s.fecha || '').slice(0, 7) === ym).reduce((s, x) => s + num(x.pago), 0);
  const alertas = abiertas.filter(([, c]) => c.estado === 'Vencida' || c.estado === 'Por vencer').sort((a, b) => (a[1].dias ?? 0) - (b[1].dias ?? 0));
  const v = $('#view');
  v.innerHTML = head('Hola equipo ARVI', new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }), `<button class="btn y" id="nEv">${I.plus}Nuevo evento</button><button class="btn" id="nInv">${I.plus}Nueva factura</button>`) +
    `<div class="grid kpis">
      <div class="card kpi"><div class="lab">Eventos este mes</div><div class="val">${mes.length}</div><div class="foot">${prox.filter(e => e.inicio <= in7).length} en los próximos 7 días</div></div>
      <div class="card kpi"><div class="lab">Por cobrar</div><div class="val">${money(porCobrar)}</div><div class="foot">${abiertas.length} facturas abiertas</div></div>
      <div class="card kpi ${vencido ? 'warn' : ''}"><div class="lab">Vencido</div><div class="val">${money(vencido)}</div><div class="foot">${abiertas.filter(([, c]) => c.estado === 'Vencida').length} facturas vencidas</div></div>
      <div class="card kpi"><div class="lab">Pago equipo · ${MESES[new Date().getMonth()]}</div><div class="val">${money(pagoMes)}</div><div class="foot">${DB.shifts.filter(s => (s.fecha || '').slice(0, 7) === ym).length} turnos asignados</div></div>
    </div>
    <div class="grid two" style="margin-top:14px">
      <div class="card"><h3>Próximos eventos</h3><div class="list" id="hEv">${prox.slice(0, 8).map(e => evItem(e)).join('') || '<div class="empty">No hay eventos próximos</div>'}</div></div>
      <div class="card"><h3>Cobranza que requiere atención</h3><div class="list">${alertas.slice(0, 8).map(([f, c]) => `<div class="item" data-inv="${f.id}"><div class="grow"><div class="ell"><b>N° ${esc(f.numero)}</b> · ${esc(cliName(f.clienteId))}</div><div class="muted">${c.estado === 'Vencida' ? 'Venció hace ' + (-c.dias) + ' días' : 'Vence en ' + c.dias + ' días'} · saldo ${money(c.saldo)}</div></div><span class="pill ${c.cls}">${c.estado}</span></div>`).join('') || '<div class="empty">Todo al día 🎉</div>'}</div></div>
    </div>`;
  $('#nEv').onclick = () => eventModal(); $('#nInv').onclick = () => invoiceModal();
  bindItems(v);
};
function evItem(e) { const d = pd(e.inicio); const st = evStats(e); return `<div class="item" data-ev="${e.id}"><div class="date"><b>${d.getDate()}</b><small>${MESES[d.getMonth()].slice(0, 3)}</small></div><div class="grow"><div class="ell"><b>${esc(e.nombre)}</b></div><div class="muted ell">${esc(cliName(e.clienteId))}${e.ubicacion ? ' · ' + esc(e.ubicacion) : ''} · ${new Set(st.sh.map(s => s.workerId)).size} personas</div></div><span class="pill ${evCls(e)}">${esc(e.estado)}</span></div>`; }
function bindItems(root) { $$('[data-ev]', root).forEach(x => x.onclick = () => eventModal(byId('events', x.dataset.ev))); $$('[data-inv]', root).forEach(x => x.onclick = () => invoiceModal(byId('invoices', x.dataset.inv))); }

/* ---- Eventos ---- */
VIEWS.eventos = () => {
  const v = $('#view');
  v.innerHTML = head('Eventos', 'Cada evento conecta cliente, equipo, vehículos y facturas', `<button class="btn ghost" id="xEv">${I.xls}Excel</button><button class="btn y" id="nEv">${I.plus}Nuevo evento</button>`) +
    `<div class="tools"><div class="row"><button class="btn sm ${ST.evMode === 'lista' ? '' : 'ghost'}" data-m="lista">Lista</button><button class="btn sm ${ST.evMode === 'cal' ? '' : 'ghost'}" data-m="cal">Calendario</button></div>
     <input class="search" id="q" placeholder="Buscar evento, cliente o lugar" value="${esc(ST.evQ)}"><select id="fe"><option value="">Todos los estados</option>${opts(EST_EV, ST.evEst)}</select></div><div id="evBody"></div>`;
  $('#nEv').onclick = () => eventModal(); $('#xEv').onclick = exportEventsXlsx;
  $$('[data-m]', v).forEach(b => b.onclick = () => { ST.evMode = b.dataset.m; render(); });
  $('#q').oninput = e => { ST.evQ = e.target.value; body(); }; $('#fe').onchange = e => { ST.evEst = e.target.value; body(); };
  function body() {
    const q = norm(ST.evQ); const list = DB.events.filter(e => (!ST.evEst || e.estado === ST.evEst) && (!q || norm(e.nombre + ' ' + cliName(e.clienteId) + ' ' + (e.ubicacion || '')).includes(q))).sort((a, b) => b.inicio.localeCompare(a.inicio));
    const b = $('#evBody');
    if (ST.evMode === 'cal') return calView(b, list);
    b.innerHTML = `<div class="card" style="padding:0"><div class="tablewrap"><table><thead><tr><th>Fecha</th><th>Evento</th><th class="hide-m">Cliente</th><th class="hide-m">Lugar</th><th>Equipo</th><th class="num hide-m">Costo equipo</th><th class="hide-m">Cobranza</th><th>Estado</th></tr></thead><tbody>${list.map(e => { const s = evStats(e); const cob = s.inv.length ? (s.saldo > 0 ? `<span class="pill p-pend">Saldo ${money(s.saldo)}</span>` : '<span class="pill p-pagada">Cobrado</span>') : '<span class="muted">Sin factura</span>'; return `<tr class="click" data-ev="${e.id}"><td>${fshort(e.inicio)}${e.fin && e.fin !== e.inicio ? ' → ' + fshort(e.fin) : ''}</td><td><b>${esc(e.nombre)}</b></td><td class="hide-m">${esc(cliName(e.clienteId))}</td><td class="hide-m">${esc(e.ubicacion || '')}</td><td>${new Set(s.sh.map(x => x.workerId)).size}</td><td class="num hide-m">${money(s.costo)}</td><td class="hide-m">${cob}</td><td><span class="pill ${evCls(e)}">${esc(e.estado)}</span></td></tr>`; }).join('') || '<tr><td colspan="8" class="empty">Aún no hay eventos. Crea el primero o importa tu Excel en Ajustes.</td></tr>'}</tbody></table></div></div>`;
    bindItems(b);
  }
  body();
};
function calView(b, list) {
  const [y, m] = ST.month.split('-').map(Number); const first = new Date(y, m - 1, 1); const start = new Date(first); start.setDate(1 - ((first.getDay() + 6) % 7));
  let cells = ''; for (let i = 0; i < 42; i++) { const d = new Date(start); d.setDate(start.getDate() + i); const s = iso(d); const evs = list.filter(e => s >= e.inicio && s <= (e.fin || e.inicio));
    cells += `<div class="d ${d.getMonth() !== m - 1 ? 'out' : ''} ${s === today() ? 'today' : ''}" data-day="${s}"><span class="n">${d.getDate()}</span>${evs.map(e => `<div class="ev ${e.estado === 'Por confirmar' ? 'porc' : e.estado === 'Cancelado' ? 'canc' : e.estado === 'Realizado' ? 'real' : ''}" data-ev="${e.id}">${esc(e.nombre)}</div>`).join('')}</div>`; }
  b.innerHTML = `<div class="card"><div class="row" style="justify-content:space-between;margin-bottom:10px"><button class="btn sm ghost" id="pm">${I.left}</button><h3 style="margin:0">${monthLabel(ST.month)}</h3><button class="btn sm ghost" id="nm">${I.right}</button></div><div class="cal">${['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(x => `<div class="dow">${x}</div>`).join('')}${cells}</div></div>`;
  $('#pm').onclick = () => { ST.month = shiftMonth(ST.month, -1); calView(b, list); }; $('#nm').onclick = () => { ST.month = shiftMonth(ST.month, 1); calView(b, list); };
  $$('.ev', b).forEach(x => x.onclick = ev => { ev.stopPropagation(); eventModal(byId('events', x.dataset.ev)); });
  $$('.d', b).forEach(x => x.onclick = () => eventModal(null, { inicio: x.dataset.day, fin: x.dataset.day }));
}

function eventModal(e, preset = {}) {
  const isNew = !e; e = e ? JSON.parse(JSON.stringify(e)) : Object.assign({ id: uid(), nombre: '', clienteId: '', inicio: today(), fin: today(), ubicacion: '', direccion: '', contacto: '', telefonoContacto: '', horarioMontaje: '', horarioFunc: '', ingreso: '', juegos: '', estado: 'Por confirmar', monto: '', vehiculos: [], notas: '' }, preset);
  let shifts = DB.shifts.filter(s => s.eventId === e.id).map(s => ({ ...s }));
  const { m, close } = modal(`<header><h3>${isNew ? 'Nuevo evento' : esc(e.nombre)}</h3><div class="row">${isNew ? '' : `<button class="btn sm ghost" id="jCli">${I.img}JPG cliente</button><button class="btn sm ghost" id="jEq">${I.img}JPG equipo</button><button class="btn sm ghost" id="xls1">${I.xls}Excel</button>`}<button class="btn sm ghost" data-close>Cerrar</button></div></header>
    <div class="form" id="f">
      <label class="f full">Nombre del evento<input name="nombre" value="${esc(e.nombre)}" placeholder="Ej: Feria Mi Barrio Emprende 2026" required></label>
      <label class="f">Cliente<select name="clienteId"><option value="">— Elegir cliente —</option>${opts([...DB.clients].sort((a, b) => a.nombre.localeCompare(b.nombre)), e.clienteId, c => c.nombre, c => c.id)}<option value="__new">+ Nuevo cliente…</option></select></label>
      <label class="f">Estado<select name="estado">${opts(EST_EV, e.estado)}</select></label>
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
    const ds = days(); const ws = sortedWorkers().filter(w => w.activo !== false);
    shifts.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || '') || ROLES.indexOf(a.rol) - ROLES.indexOf(b.rol));
    $('#shB', m).innerHTML = shifts.map((s, i) => `<tr><td><select data-i="${i}" data-k="fecha">${opts([...new Set([...ds, s.fecha])].filter(Boolean), s.fecha, fshort)}</select></td><td><select data-i="${i}" data-k="workerId"><option value="">—</option>${opts(ws.concat(ws.find(w => w.id === s.workerId) ? [] : DB.workers.filter(w => w.id === s.workerId)), s.workerId, w => w.nombre, w => w.id)}</select></td><td><select data-i="${i}" data-k="rol">${opts(ROLES, s.rol)}</select></td><td><input data-i="${i}" data-k="pago" inputmode="numeric" value="${esc(s.pago)}" style="text-align:right"></td><td><button class="x" data-rm="${i}">×</button></td></tr>`).join('') || '<tr><td colspan="5" class="muted" style="padding:14px">Aún no hay personas asignadas</td></tr>';
    $$('[data-k]', m).forEach(x => x.onchange = () => { shifts[+x.dataset.i][x.dataset.k] = x.dataset.k === 'pago' ? num(x.value) : x.value; drawSum(); });
    $$('[data-rm]', m).forEach(x => x.onclick = () => { shifts.splice(+x.dataset.rm, 1); drawSh(); });
    drawSum();
  }
  function drawSum() {
    const costo = shifts.reduce((s, x) => s + num(x.pago), 0); const inv = DB.invoices.filter(fv => (fv.eventIds || []).includes(e.id));
    let fact = 0, saldo = 0; inv.forEach(fv => { const c = invCalc(fv); if (c.open || c.estado === 'Pagada') { fact += c.neto; saldo += c.saldo; } });
    const monto = num($('[name=monto]', f).value);
    $('#cobr', m).innerHTML = `<div class="sum"><div>Personas<b>${new Set(shifts.map(s => s.workerId).filter(Boolean)).size}</b></div><div>Costo equipo<b>${money(costo)}</b></div><div>Monto acordado<b>${money(monto)}</b></div><div>Facturado (neto)<b>${money(fact)}</b></div><div>Saldo por cobrar<b>${money(saldo)}</b></div><div>Margen estimado<b>${money((fact || monto) - costo)}</b></div></div>
      <div class="sec"><span>Facturas vinculadas</span>${isNew ? '' : `<button class="btn sm" id="newInv">${I.plus}Crear factura</button>`}</div>
      <div class="list">${inv.map(fv => { const c = invCalc(fv); return `<div class="item" data-inv="${fv.id}"><div class="grow"><b>N° ${esc(fv.numero)}</b> · ${fdate(fv.emision)} · ${money(c.bruto)}<div class="muted">Saldo ${money(c.saldo)}${c.venc ? ' · vence ' + fdate(c.venc) : ''}</div></div><span class="pill ${c.cls}">${c.estado}</span></div>`; }).join('') || `<div class="muted">${isNew ? 'Guarda el evento para vincular facturas.' : 'Sin facturas. Créala aquí o vincúlala desde Cobranza.'}</div>`}</div>`;
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
    Object.assign(e, d, { monto: num(d.monto) || '', vehiculos: $$('#veh input:checked', m).map(x => x.value) });
    upsert('events', e);
    const keep = new Set(shifts.filter(s => s.workerId).map(s => s.id));
    DB.shifts.filter(s => s.eventId === e.id && !keep.has(s.id)).forEach(s => removeRec('shifts', s.id));
    shifts.filter(s => s.workerId).forEach(s => { const o = DB.shifts.find(x => x.id === s.id); if (!o || JSON.stringify({ ...o, u: 0 }) !== JSON.stringify({ ...s, u: 0 })) upsert('shifts', { ...s, eventId: e.id, pago: num(s.pago) }); });
    if (closeAfter) { close(); render(); toast('Evento guardado'); } return true;
  }
  $('#save', m).onclick = () => saveEv(true);
  const del = $('#del', m); if (del) del.onclick = () => { if (!confirm('¿Eliminar este evento y sus turnos? Las facturas se mantienen.')) return; DB.shifts.filter(s => s.eventId === e.id).forEach(s => removeRec('shifts', s.id)); DB.invoices.filter(x => (x.eventIds || []).includes(e.id)).forEach(x => upsert('invoices', { ...x, eventIds: x.eventIds.filter(i => i !== e.id) })); removeRec('events', e.id); close(); render(); };
  if (!isNew) { $('#jCli', m).onclick = () => { if (saveEv(false)) jpgEventClient(byId('events', e.id)); }; $('#jEq', m).onclick = () => { if (saveEv(false)) jpgEventTeam(byId('events', e.id)); }; $('#xls1', m).onclick = () => { if (saveEv(false)) exportEventXlsx(byId('events', e.id)); }; }
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
    <div class="form" id="f"><label class="f">Persona<select name="workerId">${opts(sortedWorkers(), s.workerId, w => w.nombre, w => w.id)}</select></label><label class="f">Día<input type="date" name="fecha" value="${s.fecha}"></label>
    <label class="f full">Evento<select name="eventId"><option value="">— Elegir evento —</option>${opts(near, s.eventId, e => e.nombre + ' · ' + fshort(e.inicio), e => e.id)}<option value="__new">+ Crear evento nuevo…</option></select></label>
    <label class="f">Rol<select name="rol">${opts(ROLES, s.rol)}</select></label><label class="f">Pago<input name="pago" inputmode="numeric" value="${esc(s.pago)}"></label></div>
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
    $('#eqB').innerHTML = `<div class="card" style="padding:0"><div class="tablewrap"><table><thead><tr><th>Nombre</th><th>RUT</th><th class="hide-m">Teléfono</th><th>Grupo</th><th class="hide-m">Función</th><th class="num hide-m">Turnos mes</th><th class="num">Pago mes</th></tr></thead><tbody>${sortedWorkers().map(w => { const s = DB.shifts.filter(x => x.workerId === w.id && (x.fecha || '').slice(0, 7) === ym); return `<tr class="click" data-w="${w.id}" style="${w.activo === false ? 'opacity:.5' : ''}"><td><b>${esc(w.nombre)}</b></td><td>${esc(w.rut || '—')}</td><td class="hide-m">${esc(w.telefono || '')}</td><td>${esc(w.grupo || '')}</td><td class="hide-m">${esc(w.funcion || '')}</td><td class="num hide-m">${s.length}</td><td class="num">${money(s.reduce((a, x) => a + num(x.pago), 0))}</td></tr>`; }).join('') || '<tr><td colspan="7" class="empty">Sin personas. Agrégalas o importa tu Excel en Ajustes.</td></tr>'}</tbody></table></div></div>`;
    $$('[data-w]', v).forEach(r => r.onclick = () => workerModal(byId('workers', r.dataset.w)));
  } else {
    $('#eqB').innerHTML = `<div class="card" style="padding:0"><table><thead><tr><th>Patente</th><th>Descripción</th><th>Eventos</th></tr></thead><tbody>${DB.vehicles.map(vh => `<tr class="click" data-vh="${vh.id}"><td><b>${esc(vh.patente)}</b></td><td>${esc(vh.descripcion || '')}</td><td>${DB.events.filter(e => (e.vehiculos || []).includes(vh.id)).length}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">Sin vehículos</td></tr>'}</tbody></table></div>`;
    $$('[data-vh]', v).forEach(r => r.onclick = () => vehicleModal(byId('vehicles', r.dataset.vh)));
  }
};
function workerModal(w) {
  const isNew = !w; w = w ? { ...w } : { id: uid(), nombre: '', rut: '', telefono: '', grupo: 'Operador', funcion: '', activo: true, notas: '' };
  const hist = DB.shifts.filter(s => s.workerId === w.id).sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 12);
  const { m, close } = modal(`<header><h3>${isNew ? 'Nueva persona' : esc(w.nombre)}</h3><button class="btn sm ghost" data-close>Cerrar</button></header>
    <div class="form" id="f"><label class="f full">Nombre completo<input name="nombre" value="${esc(w.nombre)}"></label><label class="f">RUT<input name="rut" value="${esc(w.rut)}" placeholder="12.345.678-9"></label><label class="f">Teléfono<input name="telefono" value="${esc(w.telefono)}"></label>
    <label class="f">Grupo<select name="grupo">${opts(GRUPOS, w.grupo)}</select></label><label class="f">Función<input name="funcion" value="${esc(w.funcion)}" placeholder="Ej: montaje y funcionamiento"></label>
    <label class="f full">Notas<textarea name="notas">${esc(w.notas)}</textarea></label><label class="check"><input type="checkbox" name="activo" ${w.activo !== false ? 'checked' : ''}>Activo</label></div>
    ${hist.length ? `<div class="sec">Últimos turnos</div><table class="mini"><tbody>${hist.map(s => `<tr><td>${fdate(s.fecha)}</td><td>${esc(evName(s.eventId))}</td><td><span class="pill ${RCLS[s.rol]}">${s.rol}</span></td><td class="num">${money(s.pago)}</td></tr>`).join('')}</tbody></table>` : ''}
    <div class="row" style="justify-content:space-between;margin-top:16px">${isNew ? '<span></span>' : '<button class="btn red" id="del">Eliminar</button>'}<button class="btn y" id="save">Guardar</button></div>`);
  $('#save', m).onclick = () => { const d = formData($('#f', m)); if (!d.nombre.trim()) return toast('Falta el nombre'); upsert('workers', { ...w, ...d, nombre: d.nombre.trim() }); close(); render(); };
  const del = $('#del', m); if (del) del.onclick = () => { if (DB.shifts.some(s => s.workerId === w.id)) { if (!confirm('Esta persona tiene turnos. Mejor márcala como inactiva. ¿Eliminar igual?')) return; } removeRec('workers', w.id); close(); render(); };
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
    $('#cB').innerHTML = `<div class="card" style="padding:0"><div class="tablewrap"><table><thead><tr><th>N°</th><th>Cliente</th><th class="hide-m">Emisión</th><th class="num hide-m">Neto</th><th class="num hide-m">IVA</th><th class="num">Bruto</th><th class="hide-m">Vence</th><th class="num hide-m">Días</th><th>Estado</th><th class="num">Saldo</th><th class="hide-m">Evento</th></tr></thead><tbody>${L.map(([f, c]) => `<tr class="click" data-inv="${f.id}"><td><b>${esc(f.numero)}</b></td><td class="ell" style="max-width:240px">${esc(cliName(f.clienteId))}</td><td class="hide-m">${fdate(f.emision)}</td><td class="num hide-m">${money(c.neto)}</td><td class="num hide-m">${money(c.iva)}</td><td class="num">${money(c.bruto)}</td><td class="hide-m">${fdate(c.venc)}</td><td class="num hide-m">${c.open && c.dias !== null ? c.dias : ''}</td><td><span class="pill ${c.cls}">${c.estado}</span></td><td class="num">${c.saldo ? money(c.saldo) : '—'}</td><td class="hide-m ell" style="max-width:160px">${(f.eventIds || []).map(evName).join(', ')}</td></tr>`).join('') || '<tr><td colspan="11" class="empty">Sin facturas</td></tr>'}</tbody>
      <tfoot><tr><td colspan="2">Totales</td><td class="hide-m"></td><td class="num hide-m">${money(t('neto'))}</td><td class="num hide-m">${money(t('iva'))}</td><td class="num">${money(t('bruto'))}</td><td class="hide-m"></td><td class="hide-m"></td><td></td><td class="num">${money(t('saldo'))}</td><td class="hide-m"></td></tr></tfoot></table></div></div>`;
    bindItems($('#cB'));
  }
  body();
};
function invoiceModal(f, preset = {}, after) {
  const isNew = !f; f = f ? JSON.parse(JSON.stringify(f)) : Object.assign({ id: uid(), numero: String((Math.max(0, ...DB.invoices.map(x => num(x.numero))) || 0) + 1), clienteId: '', emision: today(), neto: '', bruto: '', venc: '', estadoManual: '', abonos: [], obs: '', eventIds: [] }, preset);
  const { m, close } = modal(`<header><h3>${isNew ? 'Nueva factura' : 'Factura N° ' + esc(f.numero)}</h3><button class="btn sm ghost" data-close>Cerrar</button></header>
    <div class="form" id="f"><label class="f">N° factura<input name="numero" value="${esc(f.numero)}"></label><label class="f">Cliente<select name="clienteId"><option value="">— Elegir cliente —</option>${opts([...DB.clients].sort((a, b) => a.nombre.localeCompare(b.nombre)), f.clienteId, c => c.nombre + (c.rut ? ' · ' + c.rut : ''), c => c.id)}<option value="__new">+ Nuevo cliente…</option></select></label>
    <label class="f">Fecha emisión<input type="date" name="emision" value="${f.emision || ''}"></label><label class="f">Vencimiento <span style="font-weight:500">(vacío = emisión + 30 días)</span><input type="date" name="venc" value="${f.venc || ''}"></label>
    <label class="f">Monto neto<input name="neto" inputmode="numeric" value="${esc(f.neto)}"></label><label class="f">Monto bruto (con IVA)<input name="bruto" inputmode="numeric" value="${esc(f.bruto)}"></label>
    <label class="f">Estado especial<select name="estadoManual">${opts(EST_MAN, f.estadoManual, x => x || 'Automático (según abonos y vencimiento)')}</select></label>
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
  function calc() { const c = invCalc(cur()); $('#calc', m).innerHTML = `<div class="sum"><div>Neto<b>${money(c.neto)}</b></div><div>IVA 19%<b>${money(c.iva)}</b></div><div>Bruto<b>${money(c.bruto)}</b></div><div>Pagado<b>${money(c.pagado)}</b></div><div>Saldo<b>${money(c.saldo)}</b></div><div>Vence<b>${fdate(c.venc)}${c.open && c.dias !== null ? ` (${c.dias} días)` : ''}</b></div><div>Estado<b><span class="pill ${c.cls}">${c.estado}</span></b></div></div>`; }
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
    <div class="sec">Facturas</div><div class="tablewrap" style="max-height:300px"><table class="mini"><thead><tr><th>N°</th><th>Emisión</th><th class="num">Bruto</th><th>Vence</th><th>Estado</th><th class="num">Saldo</th></tr></thead><tbody>${s.inv.sort((a, b) => num(b.numero) - num(a.numero)).map(f => { const k = invCalc(f); return `<tr class="click" data-inv="${f.id}"><td>${esc(f.numero)}</td><td>${fdate(f.emision)}</td><td class="num">${money(k.bruto)}</td><td>${fdate(k.venc)}</td><td><span class="pill ${k.cls}">${k.estado}</span></td><td class="num">${k.saldo ? money(k.saldo) : '—'}</td></tr>`; }).join('') || '<tr><td colspan="6" class="muted">Sin facturas</td></tr>'}</tbody></table></div>
    <div class="sec">Eventos</div><div class="list">${s.evs.sort((a, b) => b.inicio.localeCompare(a.inicio)).map(evItem).join('') || '<div class="muted">Sin eventos</div>'}</div>` : ''}
    <div class="row" style="justify-content:space-between;margin-top:16px">${isNew ? '<span></span>' : '<button class="btn red" id="del">Eliminar cliente</button>'}<button class="btn y" id="save">Guardar</button></div>`, !isNew);
  bindItems(m);
  $('#save', m).onclick = () => { const d = formData($('#f', m)); if (!d.nombre.trim()) return toast('Falta la razón social'); const r = upsert('clients', { ...c, ...d, nombre: d.nombre.trim() }); close(); if (after) after(r); };
  const del = $('#del', m); if (del) del.onclick = () => { if (s.inv.length || s.evs.length) return toast('Tiene facturas o eventos asociados: no se puede eliminar'); removeRec('clients', c.id); close(); if (after) after(); };
  if (!isNew) { $('#jC', m).onclick = () => jpgStatement(c); $('#xC', m).onclick = () => exportInvoicesXlsx(s.inv.map(f => [f, invCalc(f)]), 'Estado de cuenta ' + c.nombre); }
}

/* ---- Ajustes ---- */
VIEWS.ajustes = () => {
  const v = $('#view'); const c = CONN || { owner: 'arvi-cl', repo: 'gestion-datos', branch: 'main', path: 'datos/gestion.enc.json', token: '' };
  v.innerHTML = head('Ajustes', 'Conexión a la nube, importación desde Excel y respaldos') + `
  <div class="grid two">
    <div class="card"><h3>Conexión a la nube (GitHub privado)</h3><p class="muted">Los datos se guardan cifrados con la clave de acceso. Sin conexión, quedan solo en este navegador.</p>
      <div class="form" id="cf"><label class="f">Cuenta u organización<input name="owner" value="${esc(c.owner)}"></label><label class="f">Repositorio privado<input name="repo" value="${esc(c.repo)}"></label><label class="f">Rama<input name="branch" value="${esc(c.branch || 'main')}"></label><label class="f">Archivo<input name="path" value="${esc(c.path)}"></label><label class="f full">Llave de conexión (token)<input name="token" type="password" value="${esc(c.token)}" placeholder="github_pat_…"></label></div>
      <div class="row" style="margin-top:12px"><button class="btn y" id="conn">Conectar y sincronizar</button>${CONN ? '<button class="btn ghost" id="link">Copiar enlace de acceso para el equipo</button><button class="btn red" id="disc">Desconectar este equipo</button>' : ''}</div>
      <p class="muted" style="margin-top:10px">El enlace de acceso lleva la conexión cifrada: solo funciona junto con la clave. Envíalo por un canal privado.</p></div>
    <div class="card"><h3>Importar desde Excel</h3><p class="muted">Carga tus planillas actuales. Puedes repetir la importación: no duplica personas, clientes ni facturas.</p>
      <div class="sec">Programación de eventos (eventos_arvi_juegos.xlsx)</div><div class="row"><select id="imM">${opts(MESES.map((x, i) => i), new Date().getMonth(), i => MESES[i])}</select><input id="imY" type="number" value="${new Date().getFullYear()}" style="width:90px;padding:9px;border-radius:10px;border:1.5px solid var(--line)"><label class="btn ghost">Elegir archivo<input type="file" id="fEv" accept=".xlsx,.xls" hidden></label></div>
      <div class="sec">Cobranza (COBRANZA_2026_ARVI.xlsx)</div><label class="btn ghost">Elegir archivo<input type="file" id="fCo" accept=".xlsx,.xls" hidden></label>
      <div id="imR" class="muted" style="margin-top:10px"></div></div>
    <div class="card"><h3>Respaldo</h3><p class="muted">Descarga todo en Excel (una hoja por módulo) o un respaldo cifrado.</p><div class="row"><button class="btn ghost" id="bx">${I.xls}Excel completo</button><button class="btn ghost" id="bj">Respaldo cifrado</button><label class="btn ghost">Restaurar respaldo<input type="file" id="br" accept=".json" hidden></label></div>
      <p class="muted" style="margin-top:12px">${DB.events.length} eventos · ${DB.shifts.length} turnos · ${DB.workers.length} personas · ${DB.clients.length} clientes · ${DB.invoices.length} facturas</p></div>
  </div>`;
  $('#conn').onclick = async () => { const d = formData($('#cf')); if (!d.token) return toast('Pega la llave de conexión'); const prev = CONN; CONN = d; try { setSync('busy', 'Probando…'); await ghGet(); await saveConn(d); toast('Conectado'); await pull(); render(); } catch (e) { CONN = prev; setSync('bad', 'No se pudo conectar'); toast('No se pudo conectar: revisa repositorio y llave (' + e.message + ')'); } };
  const lk = $('#link'); if (lk) lk.onclick = async () => { const u = location.origin + location.pathname + '#k=' + encodeURIComponent(btoa(JSON.stringify(await encrypt(CONN, PW)))); try { await navigator.clipboard.writeText(u); toast('Enlace copiado'); } catch (e) { prompt('Copia este enlace', u); } };
  const dc = $('#disc'); if (dc) dc.onclick = () => { if (!confirm('¿Desconectar este equipo de la nube? Los datos siguen en la nube.')) return; localStorage.removeItem(LS_CONN); CONN = null; setSync('off', 'Solo en este equipo'); render(); };
  $('#fEv').onchange = async e => { const file = e.target.files[0]; if (!file) return; const wb = XLSX.read(await file.arrayBuffer(), { cellStyles: true, cellDates: true }); const r = importEventos(wb, +$('#imY').value, +$('#imM').value + 1); $('#imR').innerHTML = r; e.target.value = ''; };
  $('#fCo').onchange = async e => { const file = e.target.files[0]; if (!file) return; const wb = XLSX.read(await file.arrayBuffer(), { cellDates: true }); const r = importCobranza(wb); $('#imR').innerHTML = r; e.target.value = ''; };
  $('#bx').onclick = exportAllXlsx;
  $('#bj').onclick = async () => download(new Blob([JSON.stringify(await encrypt(DB, PW))], { type: 'application/json' }), `respaldo-gestion-arvi-${today()}.json`);
  $('#br').onchange = async e => { try { const p = JSON.parse(await e.target.files[0].text()); const d = await decrypt(p, PW); if (!confirm('Se combinará el respaldo con los datos actuales. ¿Continuar?')) return; DB = merge(d, DB); persist(); render(); toast('Respaldo restaurado'); } catch (x) { toast('Respaldo inválido o de otra clave'); } };
};

/* ---------- importadores ---------- */
function matchWorker(name) { const n = norm(name); if (!n) return null; let best = null, bd = 99; for (const w of DB.workers) { const d = lev(norm(w.nombre), n); if (d < bd) { bd = d; best = w; } } return bd <= Math.max(1, Math.floor(n.length / 8)) ? best : null; }
function importEventos(wb, year, month) {
  const ws = wb.Sheets[wb.SheetNames[0]]; const ref = XLSX.utils.decode_range(ws['!ref']); const cell = (r, c) => ws[XLSX.utils.encode_cell({ r, c })];
  let dayRow = -1, dayCol = {}; for (let r = 0; r <= Math.min(ref.e.r, 6); r++) { let cnt = 0; for (let c = 1; c <= ref.e.c; c++) { const v = cell(r, c); if (v && typeof v.v === 'number' && v.v >= 1 && v.v <= 31 && Number.isInteger(v.v)) cnt++; } if (cnt >= 10) { dayRow = r; break; } }
  if (dayRow < 0) return 'No encontré la fila de días (1 a 31).';
  for (let c = 1; c <= ref.e.c; c++) { const v = cell(dayRow, c); if (v && typeof v.v === 'number' && v.v >= 1 && v.v <= 31) dayCol[c] = v.v; }
  const ym = year + '-' + pad(month); let nW = 0, nE = 0, nS = 0, order = 0; const evMap = {};
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
      const key = norm(evn); let e = evMap[key] || DB.events.find(x => norm(x.nombre) === key && x.inicio.slice(0, 7) === ym);
      if (!e) { e = upsert('events', { nombre: evn.replace(/\b\w+/g, s => s[0] + s.slice(1).toLowerCase()), clienteId: '', inicio: fecha, fin: fecha, ubicacion: '', direccion: '', contacto: '', telefonoContacto: '', horarioMontaje: '', horarioFunc: '', ingreso: '', juegos: '', estado: fecha < today() ? 'Realizado' : 'Confirmado', monto: '', vehiculos: [], notas: 'Importado desde Excel' }); nE++; }
      evMap[key] = e; if (fecha < e.inicio) e.inicio = fecha; if (fecha > (e.fin || e.inicio)) e.fin = fecha; upsert('events', e);
      if (!DB.shifts.some(s => s.eventId === e.id && s.workerId === w.id && s.fecha === fecha)) { upsert('shifts', { eventId: e.id, workerId: w.id, fecha, rol, pago }); nS++; }
    }
  }
  ST.month = ym; return `Listo: ${nW} personas nuevas, ${nE} eventos y ${nS} turnos de ${monthLabel(ym)}. <a href="#prog" onclick="go('prog');return false">Ver programación</a>`;
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
        const rec = { ...(ex || { id: uid(), abonos: [], eventIds: [] }), numero, clienteId, emision, neto, bruto, venc, estadoManual: ex && ex.estadoManual && !estadoManual ? ex.estadoManual : estadoManual, obs: obs || (ex ? ex.obs : '') };
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
