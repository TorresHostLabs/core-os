// Core OS · interface do painel
import { marked } from '/vendor/marked/lib/marked.esm.js';

// ---------- ícones (traço no estilo SF Symbols, desenhados em 24x24) ----------
const P = {
  arvore: '<path d="M3 5.5h6M3 5.5v13M3 12h6M3 18.5h6"/><rect x="12" y="3" width="9" height="5" rx="1.6"/><rect x="12" y="9.5" width="9" height="5" rx="1.6"/><rect x="12" y="16" width="9" height="5" rx="1.6"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  conversaNova: '<path d="M20 11.5a7.5 7.5 0 0 1-11 6.6L4 19.5l1.4-4.3A7.5 7.5 0 1 1 20 11.5z"/><path d="M12.5 8.5v6M9.5 11.5h6"/>',
  grade: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"/>',
  mira: '<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  lua: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  sair: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l4-4-4-4M14 12H4"/>',
  fechar: '<path d="M6 6l12 12M18 6L6 18"/>',
  recarregar: '<path d="M20 12a8 8 0 1 1-2.3-5.6"/><path d="M20 4v5h-5"/>',
  backup: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
  relogio: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  raio: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  seta: '<path d="M9 6l6 6-6 6"/>',
  pasta: '<path d="M3.5 7.5A2 2 0 0 1 5.5 5.5h4l2 2h7a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-13a2 2 0 0 1-2-2z"/>',
  doc: '<path d="M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z"/><path d="M14 3.5v5h5M8.5 13h7M8.5 16.5h5"/>',
  imagem: '<rect x="3.5" y="4.5" width="17" height="15" rx="2.5"/><circle cx="9" cy="10" r="1.7"/><path d="M20.5 15.5l-4.5-4.5-8.5 8.5"/>',
  filme: '<rect x="3.5" y="5" width="17" height="14" rx="2.5"/><path d="M10 9.5v5l4.5-2.5z"/>',
  terminal: '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M7 9.5l3 2.5-3 2.5M12.5 15h4.5"/>',
  agente: '<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4.5V8M9.5 13h.01M14.5 13h.01"/><circle cx="12" cy="4" r="1"/>',
  check: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.3l2.4 2.4 4.7-5"/>',
  circulo: '<circle cx="12" cy="12" r="8.5"/>',
  focar: '<path d="M4 9V5.5A1.5 1.5 0 0 1 5.5 4H9M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9M20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15M9 20H5.5A1.5 1.5 0 0 1 4 18.5V15"/>',
  parar: '<rect x="6" y="6" width="12" height="12" rx="2.5"/>',
  grafo: '<circle cx="6" cy="7" r="2.2"/><circle cx="17.5" cy="5.5" r="1.8"/><circle cx="12" cy="13" r="2.6"/><circle cx="5.5" cy="18" r="1.8"/><circle cx="18.5" cy="17.5" r="2.2"/><path d="M7.8 8.4l2.4 2.6M16.2 6.6l-2.9 4.4M10 14.6l-3 2.2M14.5 14.3l2.3 1.7"/>',
  engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  zap: '<path d="M20 11.6a8.2 8.2 0 0 1-12 7.3L4 20l1.2-3.8A8.2 8.2 0 1 1 20 11.6z"/><path d="M9 8.8c0 3.4 2.8 6.2 6.2 6.2l1.3-1.6-2-1-1 .9a4 4 0 0 1-2.8-2.8l.9-1-1-2z"/>',
  fluxo: '<rect x="3" y="9" width="5" height="6" rx="1.5"/><rect x="16" y="4" width="5" height="6" rx="1.5"/><rect x="16" y="14" width="5" height="6" rx="1.5"/><path d="M8 12h3.5a1.5 1.5 0 0 0 1.5-1.5V8.5A1.5 1.5 0 0 1 14.5 7H16M11 12h0.5a1.5 1.5 0 0 1 1.5 1.5v2A1.5 1.5 0 0 0 14.5 17H16"/>',
  enviar: '<path d="M12 15V4M7.5 8.5L12 4l4.5 4.5"/><path d="M4 14.5v3A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-3"/>',
  baixar: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5"/><path d="M4 14.5v3A2.5 2.5 0 0 0 6.5 20h11a2.5 2.5 0 0 0 2.5-2.5v-3"/>',
  voltar: '<path d="M15 6l-6 6 6 6"/>',
  play: '<path d="M8 5.5v13l10.5-6.5z"/>',
  globo: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.4 3.5 5.2 3.5 8.5s-1.2 6.1-3.5 8.5c-2.3-2.4-3.5-5.2-3.5-8.5s1.2-6.1 3.5-8.5z"/>',
};
const ic = (n) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${P[n]}</svg>`;

// ---------- utilidades ----------
const $ = (s, r = document) => r.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const url = (caminho) => `/api/arquivo?caminho=${encodeURIComponent(caminho)}`;
const ehChat = (c) => c?.motor === 'openai'; // motor de API: sem terminal, a conversa é um chat
const semTela = (c) => c.origem === 'whatsapp' || c.origem === 'agendamento'; // conversa que rodou sem terminal: card de histórico
const tipoDe = (c) => (/\.(png|jpe?g|webp|gif|svg)$/i.test(c) ? 'imagem' : /\.(mp4|mov|webm|m4v)$/i.test(c) ? 'video' : /\.(md|txt|json|sh|js|csv|canvas)$/i.test(c) ? 'texto' : 'outro');
const nomeDe = (c) => c.split('/').pop();
const guardar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* */ } };
const recuperar = (k, p) => { try { return JSON.parse(localStorage.getItem(k)) ?? p; } catch { return p; } };
async function api(caminho, opcoes = {}) {
  const r = await fetch(caminho, { headers: { 'Content-Type': 'application/json' }, ...opcoes });
  if (r.status === 401) { mostrarLogin(); throw new Error('login'); }
  return r.headers.get('content-type')?.includes('json') ? r.json() : r.text();
}

// ---------- tema ----------
function aplicarTema(t) { document.documentElement.dataset.tema = t; guardar('tema', t); pintarDock(); }
aplicarTema(recuperar('tema', matchMedia('(prefers-color-scheme: dark)').matches ? 'escuro' : 'claro'));

// ---------- login ----------
function mostrarLogin() { $('#app').hidden = true; $('#login').hidden = false; $('#senha').focus(); }
$('#form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ senha: $('#senha').value }) });
  if (r.ok) { $('#login').hidden = true; iniciar(); } else { $('#login-erro').textContent = (await r.json()).erro; $('#senha').select(); }
});

// ---------- estado ----------
const S = {
  conversas: [],
  ativa: recuperar('ativa', 'mesa'), // id da conversa ou "mesa"
  terminais: new Map(), // id -> { term, fit, ws, elemento }
  cam: { x: 0, y: 0, z: 1 },
};
const espaco = () => recuperar(`espaco:${S.ativa}`, { pos: {}, abertos: [], cam: null });
const salvarEspaco = (e) => guardar(`espaco:${S.ativa}`, e);

// ---------- câmera do canvas ----------
const palco = $('#palco');
const mundo = $('#mundo');
function aplicarCamera(mostrarZoom) {
  const { x, y, z } = S.cam;
  mundo.style.transform = `translate(${x}px, ${y}px) scale(${z})`;
  palco.style.backgroundPosition = `${x}px ${y}px`;
  palco.style.backgroundSize = `${22 * z}px ${22 * z}px`;
  const e = espaco(); e.cam = S.cam; salvarEspaco(e);
  if (mostrarZoom) {
    const ind = $('#zoom-indicador'); ind.textContent = `${Math.round(z * 100)}%`; ind.classList.add('visivel');
    clearTimeout(aplicarCamera.t); aplicarCamera.t = setTimeout(() => ind.classList.remove('visivel'), 900);
  }
}
function zoomEm(px, py, fator) {
  const z = Math.min(2, Math.max(0.2, S.cam.z * fator));
  const k = z / S.cam.z;
  S.cam.x = px - (px - S.cam.x) * k; S.cam.y = py - (py - S.cam.y) * k; S.cam.z = z;
  aplicarCamera(true);
}
function centralizarEm(rect, zMax = 1) {
  const larg = innerWidth - 360 - (aberta('arvore') ? 300 : 0);
  const alt = innerHeight - 140;
  const z = Math.min(zMax, larg / (rect.w + 120), alt / (rect.h + 120));
  const cx = (aberta('arvore') ? 296 : 0) + larg / 2;
  S.cam = { z, x: cx - (rect.x + rect.w / 2) * z, y: (innerHeight - 70) / 2 - (rect.y + rect.h / 2) * z };
  mundo.style.transition = 'transform .6s cubic-bezier(.34,1.2,.64,1)';
  aplicarCamera(true);
  setTimeout(() => { mundo.style.transition = ''; }, 650);
}
function centralizarTudo() {
  const cards = [...mundo.querySelectorAll('.card, .boas-vindas')];
  if (!cards.length) return;
  let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const c of cards) {
    const x = parseFloat(c.style.left), y = parseFloat(c.style.top);
    x1 = Math.min(x1, x); y1 = Math.min(y1, y); x2 = Math.max(x2, x + c.offsetWidth); y2 = Math.max(y2, y + c.offsetHeight);
  }
  centralizarEm({ x: x1, y: y1, w: x2 - x1, h: y2 - y1 });
}

palco.addEventListener('wheel', (e) => {
  const rolavel = e.target.closest('.card-corpo, .xterm');
  if (e.ctrlKey || e.metaKey) { e.preventDefault(); zoomEm(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.01)); return; }
  if (rolavel) return;
  e.preventDefault();
  S.cam.x -= e.deltaX; S.cam.y -= e.deltaY; aplicarCamera();
}, { passive: false });

palco.addEventListener('pointerdown', (e) => {
  if (e.target !== palco && e.target !== mundo) return;
  document.activeElement?.blur();
  const ini = { x: e.clientX, y: e.clientY, cx: S.cam.x, cy: S.cam.y };
  palco.classList.add('arrastando'); palco.setPointerCapture(e.pointerId);
  const mover = (m) => { S.cam.x = ini.cx + m.clientX - ini.x; S.cam.y = ini.cy + m.clientY - ini.y; aplicarCamera(); };
  const soltar = () => { palco.classList.remove('arrastando'); palco.removeEventListener('pointermove', mover); };
  palco.addEventListener('pointermove', mover);
  palco.addEventListener('pointerup', soltar, { once: true });
});

// ---------- cards ----------
function criarCard({ chave, classe, icone, titulo, sub, x, y, w, h, corpo, extras = '', fechavel = true }) {
  const e = espaco();
  const pos = e.pos[chave] || { x, y };
  const card = el('div', `card ${classe}`);
  card.dataset.chave = chave;
  Object.assign(card.style, { left: `${pos.x}px`, top: `${pos.y}px`, width: `${w}px`, height: h ? `${h}px` : 'auto' });
  card.innerHTML = `<div class="card-topo">${ic(icone)}<span class="card-titulo">${esc(titulo)} <span class="card-sub">${esc(sub || '')}</span></span>${extras}${fechavel ? `<button class="icone-botao" data-fechar title="Fechar">${ic('fechar')}</button>` : ''}</div><div class="card-corpo"></div>`;
  if (corpo) card.querySelector('.card-corpo').append(corpo);
  arrastavel(card);
  card.querySelector('[data-fechar]')?.addEventListener('click', () => fecharArquivo(chave.replace(/^arq:/, '')));
  card.addEventListener('pointerdown', () => focarCard(card));
  mundo.append(card);
  return card;
}
function focarCard(card) { mundo.querySelectorAll('.card.em-foco').forEach((c) => c.classList.remove('em-foco')); card.classList.add('em-foco'); }
let zTopo = 10;
function arrastavel(card) {
  const topo = card.querySelector('.card-topo');
  topo.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    card.style.zIndex = ++zTopo;
    const ini = { x: e.clientX, y: e.clientY, l: parseFloat(card.style.left), t: parseFloat(card.style.top) };
    topo.setPointerCapture(e.pointerId);
    const mover = (m) => {
      card.style.left = `${ini.l + (m.clientX - ini.x) / S.cam.z}px`;
      card.style.top = `${ini.t + (m.clientY - ini.y) / S.cam.z}px`;
      desenharLigacoes();
    };
    const soltar = () => {
      topo.removeEventListener('pointermove', mover);
      const es = espaco(); es.pos[card.dataset.chave] = { x: parseFloat(card.style.left), y: parseFloat(card.style.top) }; salvarEspaco(es);
    };
    topo.addEventListener('pointermove', mover);
    topo.addEventListener('pointerup', soltar, { once: true });
  });
}

function corpoDeArquivo(caminho) {
  const t = tipoDe(caminho);
  if (t === 'imagem') { const i = el('img'); i.src = url(caminho); i.alt = nomeDe(caminho); i.draggable = false; return i; }
  if (t === 'video') { const v = el('video'); v.src = url(caminho); v.controls = true; v.playsInline = true; v.preload = 'metadata'; return v; }
  const d = el('div', 'md', '<p style="color:var(--texto-3)">Carregando…</p>');
  api(url(caminho)).then((txt) => { d.innerHTML = renderizar(String(txt), caminho); });
  return d;
}
function renderizar(txt, caminho) {
  const dir = caminho.split('/').slice(0, -1).join('/');
  if (!caminho.endsWith('.md')) return `<pre><code>${esc(txt)}</code></pre>`;
  let fm = '';
  txt = txt.replace(/^---\n([\s\S]*?)\n---\n?/, (_, m) => { fm = m; return ''; });
  const resolver = (alvo) => (/^(https?:|\/|data:)/.test(alvo) ? alvo : url([dir, alvo].filter(Boolean).join('/')));
  txt = txt.replace(/!\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, (_, a) => `![](${encodeURI(a)})`).replace(/\[\[([^\]|]+)(\|([^\]]*))?\]\]/g, (_, a, __, r) => `**${r || a}**`);
  const html = marked.parse(txt, { gfm: true });
  const tmp = el('div', '', html);
  tmp.querySelectorAll('img').forEach((i) => { i.src = resolver(decodeURI(i.getAttribute('src'))); });
  tmp.querySelectorAll('script, iframe, object, embed, form, link, meta, base').forEach((n) => n.remove());
  // sem handlers inline (onerror=…) nem javascript: — nota é conteúdo não confiável
  tmp.querySelectorAll('*').forEach((n) => {
    for (const at of [...n.attributes]) {
      const v = at.value.trim().toLowerCase();
      if (/^on/i.test(at.name) || ((at.name === 'href' || at.name === 'src' || at.name === 'xlink:href' || at.name === 'action') && /^(javascript|vbscript|data:text\/html)/.test(v.replace(/[\s\u0000-\u001f]/g, '')))) n.removeAttribute(at.name);
    }
  });
  return (fm ? `<div class="frontmatter">${esc(fm)}</div>` : '') + tmp.innerHTML;
}

function cardArquivo(caminho, x, y) {
  const t = tipoDe(caminho);
  const tam = t === 'imagem' ? { w: 380, h: 430 } : t === 'video' ? { w: 340, h: 600 } : { w: 560, h: 620 };
  const card = criarCard({
    chave: `arq:${caminho}`, classe: t === 'texto' || t === 'outro' ? 'card-doc' : 'card-midia',
    icone: t === 'imagem' ? 'imagem' : t === 'video' ? 'filme' : 'doc',
    titulo: nomeDe(caminho), sub: caminho.split('/').slice(-2, -1)[0] || '', x, y, ...tam, corpo: corpoDeArquivo(caminho),
    extras: (/\.md$/i.test(caminho) ? '<button class="botao-leve botao-editar" data-wordpress title="Mandar pro WordPress como rascunho">WordPress</button>' : '')
      + (/\.(md|txt)$/i.test(caminho) ? '<button class="botao-leve botao-editar" data-editar title="Editar nota">Editar</button>' : ''),
  });
  if (/\.(md|txt)$/i.test(caminho)) card.querySelector('[data-editar]').addEventListener('click', () => editarNota(card, caminho));
  card.querySelector('[data-wordpress]')?.addEventListener('click', (e) => mandarProWordPress(e.currentTarget, caminho));
  return card;
}

// ---------- editor de notas ----------
const sujos = new Set(); // cards com alterações não salvas
addEventListener('beforeunload', (e) => { if (sujos.size) { e.preventDefault(); e.returnValue = ''; } });
async function editarNota(card, caminho) {
  if (card.querySelector('.editor')) return;
  const corpo = card.querySelector('.card-corpo'); const leitura = corpo.querySelector('.md');
  const botao = card.querySelector('[data-editar]'); botao.disabled = true;
  let nota;
  try { nota = await api(`/api/nota?caminho=${encodeURIComponent(caminho)}`); } catch { botao.disabled = false; return; }
  if (nota.erro) { botao.disabled = false; alert(nota.erro); return; }
  let versao = nota.versao; let original = nota.conteudo;
  const ed = el('div', 'editor');
  const area = el('textarea', 'editor-area'); area.value = original; area.spellcheck = false; area.setAttribute('aria-label', `Editar ${nomeDe(caminho)}`);
  const barra = el('div', 'editor-barra');
  const msg = el('span', 'editor-msg'); msg.setAttribute('role', 'status');
  const salvar = el('button', 'botao-leve botao-salvar'); salvar.type = 'button'; salvar.textContent = 'Salvar';
  const cancelar = el('button', 'botao-leve'); cancelar.type = 'button'; cancelar.textContent = 'Cancelar';
  barra.append(msg, cancelar, salvar); ed.append(barra, area);
  leitura.hidden = true; corpo.prepend(ed); area.focus(); botao.hidden = true;
  const sujo = () => area.value !== original;
  const marcar = () => { sujos[sujo() ? 'add' : 'delete'](card); msg.textContent = sujo() ? 'Alterações não salvas' : ''; msg.className = 'editor-msg'; };
  area.addEventListener('input', marcar);
  const sair = (releitura) => {
    sujos.delete(card); ed.remove(); leitura.hidden = false; botao.hidden = false; botao.disabled = false;
    if (releitura != null) leitura.innerHTML = renderizar(releitura, caminho);
  };
  async function gravar(forcar = false) {
    salvar.disabled = true; msg.textContent = 'Salvando…'; msg.className = 'editor-msg';
    let r;
    try { r = await fetch('/api/nota', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ caminho, conteudo: area.value, versao, forcar }) }); }
    catch { salvar.disabled = false; msg.textContent = 'Sem conexão. Nada foi perdido, tente de novo.'; msg.className = 'editor-msg erro'; return; }
    if (r.status === 401) { mostrarLogin(); salvar.disabled = false; return; }
    const j = await r.json().catch(() => ({}));
    salvar.disabled = false;
    if (r.status === 409) {
      msg.className = 'editor-msg erro'; msg.textContent = 'A nota mudou no servidor. ';
      const b = el('button', 'editor-link'); b.type = 'button'; b.textContent = 'Sobrescrever com a minha versão';
      b.addEventListener('click', () => gravar(true)); msg.append(b); return;
    }
    if (!r.ok) { msg.className = 'editor-msg erro'; msg.textContent = j.erro || 'Não consegui salvar.'; return; }
    versao = j.versao; original = area.value; sair(original);
  }
  salvar.addEventListener('click', () => gravar());
  cancelar.addEventListener('click', () => { if (sujo() && !confirm('Descartar as alterações?')) return; sair(); });
  area.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); gravar(); }
    if (e.key === 'Escape') cancelar.click();
    if (e.key === 'Tab' && !e.shiftKey && !e.ctrlKey && !e.metaKey) { e.preventDefault(); document.execCommand('insertText', false, '  '); }
  });
}

function abrirArquivo(caminho) {
  const e = espaco();
  const jaTem = mundo.querySelector(`.card[data-chave="${CSS.escape(`arq:${caminho}`)}"]`);
  if (jaTem) { focarCard(jaTem); centralizarEm({ x: parseFloat(jaTem.style.left), y: parseFloat(jaTem.style.top), w: jaTem.offsetWidth, h: jaTem.offsetHeight }); return; }
  if (!e.abertos.includes(caminho)) e.abertos.push(caminho);
  const cx = (innerWidth / 2 - S.cam.x) / S.cam.z - 250 + (e.abertos.length % 5) * 24;
  const cy = (innerHeight / 2 - S.cam.y) / S.cam.z - 300 + (e.abertos.length % 5) * 24;
  e.pos[`arq:${caminho}`] = e.pos[`arq:${caminho}`] || { x: cx, y: cy };
  salvarEspaco(e);
  focarCard(cardArquivo(caminho, cx, cy));
  marcarArvore(caminho);
}
function fecharArquivo(caminho) {
  const c = mundo.querySelector(`.card[data-chave="${CSS.escape(`arq:${caminho}`)}"]`);
  if (c && sujos.has(c) && !confirm('Esta nota tem alterações não salvas. Fechar mesmo assim?')) return;
  sujos.delete(c);
  const e = espaco(); e.abertos = e.abertos.filter((c) => c !== caminho); delete e.pos[`arq:${caminho}`]; salvarEspaco(e);
  mundo.querySelector(`.card[data-chave="${CSS.escape(`arq:${caminho}`)}"]`)?.remove();
}

// ---------- terminal de cada conversa ----------
function terminalDe(conv) {
  if (S.terminais.has(conv.id)) return S.terminais.get(conv.id);
  const elemento = el('div');
  elemento.style.height = '100%';
  const term = new Terminal({
    fontFamily: '"SF Mono", Menlo, "DejaVu Sans Mono", Consolas, monospace', fontSize: 13, lineHeight: 1.15, letterSpacing: 0, cursorBlink: true, allowProposedApi: true, scrollback: 5000,
    theme: { background: '#1c1c1e', foreground: '#f5f5f7', cursor: '#0a84ff', selectionBackground: 'rgba(10,132,255,.35)' },
  });
  const fit = new FitAddon.FitAddon();
  term.loadAddon(fit);
  term.loadAddon(new Unicode11Addon.Unicode11Addon());
  term.unicode.activeVersion = '11';
  const t = { term, fit, ws: null, elemento, aberto: false };
  term.onData((d) => t.ws?.readyState === 1 && t.ws.send(JSON.stringify({ t: 'i', d })));
  term.onResize(({ cols, rows }) => t.ws?.readyState === 1 && t.ws.send(JSON.stringify({ t: 'r', cols, rows })));
  S.terminais.set(conv.id, t);
  return t;
}
function conectar(conv, t) {
  if (t.ws && t.ws.readyState <= 1) return;
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  t.ws = new WebSocket(`${proto}://${location.host}/ws?conversa=${conv.id}&cols=${t.term.cols}&rows=${t.term.rows}`);
  t.term.reset();
  // Ao abrir, manda o tamanho real: o Claude Code redesenha a tela na largura certa.
  t.ws.onopen = () => { try { t.fit.fit(); } catch { /* */ } t.ws.send(JSON.stringify({ t: 'r', cols: t.term.cols, rows: t.term.rows })); };
  t.ws.onmessage = (m) => t.term.write(m.data);
  t.ws.onclose = () => { t.ws = null; };
}
function cardTerminal(conv) {
  const t = terminalDe(conv);
  const card = criarCard({
    chave: 'terminal', classe: 'card-terminal', icone: 'terminal', titulo: conv.titulo, sub: conv.motorNome || 'Claude Code',
    x: 0, y: 0, w: 860, h: 540, fechavel: false,
    extras: `<span class="pilula" data-status>pronto</span>`,
  });
  card.querySelector('.card-corpo').append(t.elemento);
  if (!t.aberto) { t.term.open(t.elemento); t.aberto = true; }
  requestAnimationFrame(() => { try { t.fit.fit(); } catch { /* */ } conectar(conv, t); });
  new ResizeObserver(() => { try { t.fit.fit(); } catch { /* */ } }).observe(card.querySelector('.card-corpo'));
  card.addEventListener('pointerdown', () => { if (!t.ws) conectar(conv, t); t.term.focus(); });
  return card;
}

// conversa que veio do WhatsApp: mostra o histórico; o botão assume ela no terminal
const assumidas = new Set(recuperar('assumidas', []));
function cardHistorico(conv) {
  const card = criarCard({
    chave: 'terminal', classe: 'card-terminal card-historico', icone: 'zap', titulo: conv.titulo, sub: 'WhatsApp',
    x: 0, y: 0, w: 860, h: 540, fechavel: false,
    extras: `<span class="pilula" data-status>pronto</span><button class="botao-leve botao-assumir" data-assumir>${ic('terminal')} Continuar no terminal</button>`,
  });
  const corpo = el('div', 'historico');
  card.querySelector('.card-corpo').append(corpo);
  card.querySelector('[data-assumir]').addEventListener('click', (e) => {
    e.stopPropagation();
    const c = S.conversas.find((x) => x.id === conv.id);
    if (c?.processando) { alert('O agente ainda está respondendo no WhatsApp. Espere terminar pra assumir pelo terminal.'); return; }
    assumidas.add(conv.id); guardar('assumidas', [...assumidas]); desenharEspaco();
  });
  pintarHistorico(conv, true);
  return card;
}
let assinaturaHistorico = '';
async function pintarHistorico(conv, forcar) {
  const corpo = mundo.querySelector('.card-historico .historico');
  if (!corpo) return;
  const itens = await api(`/api/conversas/${conv.id}/historico`);
  const ass = `${conv.id}:${itens.length}:${itens.at(-1)?.texto?.length || 0}:${itens.at(-1)?.parcial ? 'p' : ''}`;
  if (!forcar && ass === assinaturaHistorico) return;
  assinaturaHistorico = ass;
  const noFim = corpo.scrollHeight - corpo.scrollTop - corpo.clientHeight < 80; // quem subiu pra ler mensagens antigas não é puxado de volta
  const hora = (t) => (t ? new Date(t).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
  corpo.innerHTML = itens.length ? itens.map((i) => (i.papel === 'acao'
    ? `<div class="hist-acao">${ic('seta')}<span>${esc(i.texto)}</span></div>`
    : `<div class="hist-msg ${i.papel}${i.parcial ? ' parcial' : ''}"><div class="balao">${i.papel === 'claude' ? renderizar(i.texto, 'x.md') : esc(i.texto).replace(/\n/g, '<br>')}</div><small>${i.papel === 'voce' ? 'Você' : esc(conv.motorNome || 'Claude')} · ${hora(i.quando)}</small></div>`)).join('')
    : '<p class="hist-vazio">A conversa aparece aqui assim que o agente começar a responder.</p>';
  if (forcar || noFim) corpo.scrollTop = corpo.scrollHeight;
}

// ---------- desenhar o espaço ativo ----------
function desenharEspaco() {
  mundo.querySelectorAll('.card, .boas-vindas').forEach((c) => c.remove());
  const e = espaco();
  const conv = S.conversas.find((c) => c.id === S.ativa);
  if (!conv) {
    if (S.ativa !== 'mesa') { S.ativa = 'mesa'; guardar('ativa', 'mesa'); return desenharEspaco(); }
    if (!e.abertos.length) {
      const bv = el('div', 'boas-vindas vidro', `<span class="marca-icone" style="width:52px;height:52px;border-radius:14px"></span><h1>Seu cérebro está no ar</h1><p>Abra uma conversa: é um agente de verdade (Claude Code, Codex ou Antigravity) rodando neste servidor, com acesso a tudo que está na árvore.</p><button class="botao-primario" data-acao="nova-conversa">${ic('mais')} Nova conversa</button>`);
      Object.assign(bv.style, { position: 'absolute', left: '-220px', top: '-150px', borderRadius: '28px' });
      mundo.append(bv);
    }
  } else {
    if (ehChat(conv)) cardChat(conv); else if (semTela(conv) && !assumidas.has(conv.id)) cardHistorico(conv); else cardTerminal(conv);
    desenharFilhos(conv);
  }
  for (const c of e.abertos) cardArquivo(c, 0, 0);
  if (e.cam) { S.cam = e.cam; aplicarCamera(); } else setTimeout(centralizarTudo, 60);
  desenharLigacoes();
  pintarConversas();
}

function desenharFilhos(conv) {
  const e = espaco();
  // subagentes abaixo do orquestrador
  const ags = conv.subagentes || [];
  const larg = 290, gap = 26;
  const total = ags.length * larg + Math.max(0, ags.length - 1) * gap;
  ags.forEach((a, i) => {
    const chave = `ag:${a.id}`;
    let card = mundo.querySelector(`.card[data-chave="${chave}"]`);
    if (!card) {
      card = criarCard({ chave, classe: 'card-agente', icone: 'agente', titulo: a.descricao, x: 430 - total / 2 + i * (larg + gap), y: 620, w: larg, fechavel: false,
        corpo: el('div') });
      card.dataset.pai = 'terminal';
    }
    card.querySelector('.card-corpo').innerHTML = `<span class="pilula ${a.status}">${{ trabalhando: 'trabalhando', concluido: 'concluído', parado: 'parado' }[a.status]}</span>${a.ultimaAcao ? `<div class="agente-acao">${esc(a.ultimaAcao)}</div>` : ''}${a.tipo ? `<div class="agente-tipo">${esc(a.tipo)}</div>` : ''}`;
  });
  // mídias geradas à direita
  (conv.midias || []).forEach((m, i) => {
    const chave = `md:${m}`;
    if (mundo.querySelector(`.card[data-chave="${CSS.escape(chave)}"]`)) return;
    const card = criarCard({ chave, classe: 'card-midia', icone: tipoDe(m) === 'video' ? 'filme' : 'imagem', titulo: nomeDe(m), sub: '',
      x: 920 + (i % 3) * 300, y: Math.floor(i / 3) * 380, w: 280, h: tipoDe(m) === 'video' ? 480 : 350, corpo: corpoDeArquivo(m), fechavel: false });
    card.dataset.pai = 'terminal';
  });
  const term = mundo.querySelector('.card[data-chave="terminal"] [data-status]');
  if (term && !ehChat(conv)) { term.className = `pilula ${conv.trabalhando ? 'trabalhando' : ''}`; term.textContent = conv.trabalhando ? 'trabalhando' : conv.ativo ? 'pronto' : 'pausado'; }
  void e;
}

function desenharLigacoes() {
  const svg = $('#ligacoes');
  const pai = mundo.querySelector('.card[data-chave="terminal"]');
  if (!pai) { svg.innerHTML = ''; return; }
  const px = parseFloat(pai.style.left), py = parseFloat(pai.style.top), pw = pai.offsetWidth, ph = pai.offsetHeight;
  let d = '';
  mundo.querySelectorAll('.card[data-pai="terminal"]').forEach((c) => {
    const x = parseFloat(c.style.left), y = parseFloat(c.style.top), w = c.offsetWidth;
    const abaixo = y > py + ph - 20;
    const [ax, ay] = abaixo ? [px + pw / 2, py + ph] : [px + pw, py + 60];
    const [bx, by] = abaixo ? [x + w / 2, y] : [x, y + 40];
    const viva = c.querySelector('.pilula.trabalhando') ? 'viva' : '';
    d += abaixo
      ? `<path class="${viva}" d="M${ax},${ay} C${ax},${(ay + by) / 2} ${bx},${(ay + by) / 2} ${bx},${by}"/>`
      : `<path class="${viva}" d="M${ax},${ay} C${(ax + bx) / 2},${ay} ${(ax + bx) / 2},${by} ${bx},${by}"/>`;
  });
  svg.innerHTML = d;
}

// ---------- conversas (sanfona) ----------
function lerNota(nota) {
  const resumo = nota.match(/^>\s*(.+)$/m)?.[1] || '';
  const itens = [...nota.matchAll(/^\s*[-*]\s+\[( |x|X)\]\s+(.+)$/gm)].map((m) => ({ feito: m[1] !== ' ', texto: m[2] }));
  return { resumo, itens };
}
// ---------- comece aqui: primeiros testes de um clique ----------
async function pintarComece() {
  const caixa = $('#comece');
  const testes = await api('/api/primeiros-testes').catch(() => []);
  if (!testes.length) { caixa.hidden = true; return; }
  const fechado = recuperar('comeceFechado', false);
  caixa.classList.toggle('fechado', fechado);
  caixa.innerHTML = `<button class="comece-topo" data-acao="comece-alternar"><span>${ic('raio')} Comece aqui</span>${ic('seta')}</button>
    <ul class="comece-lista">${testes.map((t) => `<li><button class="comece-item" data-acao="pedir" data-pedido="${esc(t.pedido)}">
      <span class="comece-icone">${ic(t.icone)}</span><span><b>${esc(t.titulo)}</b><small>${esc(t.faz)}</small></span></button></li>`).join('')}</ul>`;
}

function pintarConversas() {
  const lista = $('#conversas-lista');
  lista.innerHTML = '';
  if (!S.conversas.length) {
    lista.append(el('div', 'vazio-lista vidro', 'Nenhuma conversa ainda.<br>Clique em <b>+</b> pra começar.'));
    return;
  }
  for (const c of [...S.conversas].reverse()) {
    const { resumo, itens } = lerNota(c.nota || '');
    const feitos = itens.filter((i) => i.feito).length;
    const aberta = c.id === S.ativa;
    const bloco = el('div', `conversa vidro ${aberta ? 'aberta' : ''}`);
    const pendentes = itens.filter((i) => !i.feito);
    const ordenados = [...pendentes, ...itens.filter((i) => i.feito)];
    bloco.innerHTML = `
      <div class="conversa-cabeca"><span class="ponto ${c.trabalhando ? 'trabalhando' : c.ativo ? 'ativo' : ''}"></span>
        ${c.origem === 'whatsapp' ? `<span class="selo-whats" title="Veio do WhatsApp">${ic('zap')}</span>` : c.origem === 'agendamento' ? `<span class="selo-whats selo-agenda" title="Tarefa agendada">${ic('relogio')}</span>` : ''}<span class="card-titulo">${esc(c.titulo)}</span><img class="selo-motor" src="/logos/${esc(c.motor || 'claude')}.svg" alt="${esc(c.motorNome || 'Claude Code')}" title="${esc(c.motorNome || 'Claude Code')}">${itens.length ? `<span class="conversa-progresso">${feitos}/${itens.length}</span>` : ''}</div>
      <div class="conversa-corpo"><div><div class="conversa-interno">
        ${resumo ? `<p class="resumo">${esc(resumo)}</p>` : `<p class="resumo">${c.nota ? '' : 'O resumo e as ações aparecem aqui assim que o agente criar a nota de status.'}</p>`}
        ${ordenados.length ? `<div class="secao-mini">${pendentes.length ? `${pendentes.length} pendente${pendentes.length > 1 ? 's' : ''}` : 'Tudo feito'}</div>
          <ul class="checklist">${ordenados.map((i) => `<li class="${i.feito ? 'feito' : ''}">${ic(i.feito ? 'check' : 'circulo')}<span>${esc(i.texto)}</span></li>`).join('')}</ul>` : ''}
        ${c.subagentes?.length ? `<div class="secao-mini">${c.subagentes.length} subagente${c.subagentes.length > 1 ? 's' : ''} · ${c.subagentes.filter((a) => a.status === 'trabalhando').length} trabalhando</div>` : ''}
        ${c.ultimaAcao ? `<div class="acao-atual">${esc(c.ultimaAcao)}</div>` : ''}
        <div class="conversa-botoes"><button class="botao-leve" data-focar>${ic('focar')} Focar</button><button class="botao-leve" data-encerrar>${ic('parar')} Encerrar</button></div>
      </div></div></div>`;
    bloco.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-focar]')) { focarTerminal(); return; }
      if (ev.target.closest('[data-encerrar]')) { encerrar(c); return; }
      if (!aberta) trocarPara(c.id);
    });
    lista.append(bloco);
  }
}
function trocarPara(id) { S.ativa = id; guardar('ativa', id); desenharEspaco(); }
function focarTerminal() {
  const c = mundo.querySelector('.card[data-chave="terminal"]');
  if (!c) return;
  centralizarEm({ x: parseFloat(c.style.left), y: parseFloat(c.style.top), w: c.offsetWidth, h: c.offsetHeight });
  setTimeout(() => S.terminais.get(S.ativa)?.term.focus(), 400);
}
// ---------- seletor de motor (Claude Code, Codex, Antigravity) ----------
const MOTORES_UI = {
  claude: { empresa: 'Anthropic', instalar: 'Instala o Claude Code neste servidor (curl -fsSL https://claude.ai/install.sh | bash), confere com claude --version e me guia no login com a minha conta.' },
  codex: { empresa: 'OpenAI', instalar: 'Instala o Codex CLI da OpenAI neste servidor (npm i -g @openai/codex), confere com codex --version e me guia no login com a minha conta ChatGPT (codex login --device-auth). No fim, me avisa que já posso escolher o Codex numa conversa nova.' },
  openai: { empresa: 'OpenAI · pela API' },
  antigravity: { empresa: 'Google', instalar: 'Instala o Antigravity CLI do Google neste servidor pelo instalador oficial (curl -fsSL https://antigravity.google/cli/install.sh | bash), confere se o comando agy funciona e me guia no login com a minha conta Google (link com código, pelo SSH). No fim, me avisa que já posso escolher o Antigravity numa conversa nova.' },
};
async function escolherMotor() {
  const mot = await api('/api/config/motores');
  $('#seletor-motores').innerHTML = Object.entries(mot.motores).map(([id, m]) => `
    <button class="motor-opcao ${m.instalado ? '' : 'falta'}" data-acao="${m.instalado ? 'abrir-motor' : id === 'openai' ? 'config-openai' : 'instalar-motor'}" data-motor="${id}">
      <img src="/logos/${id}.svg" alt="" width="40" height="40">
      <b>${esc(m.nome)}</b><span>${esc(MOTORES_UI[id]?.empresa || '')}</span>
      <em>${m.instalado ? (mot.padrao === id ? 'Último usado' : 'Pronto') : id === 'openai' ? 'Falta a chave · configurar' : 'Não instalado · instalar'}</em>
    </button>`).join('');
  $('#escolher-motor').hidden = false;
}
const fecharSeletor = () => { $('#escolher-motor').hidden = true; };

let pedidoPendente = null;
async function novaConversa(pedido, motor) {
  if (Grafo.aberto) Grafo.fechar();
  fecharSeletor();
  // o pedido (se houver) é escrito pelo servidor na caixa do agente, sem enviar: a pessoa lê e aperta Enter
  const corpo = { cols: 104, rows: 30, ...(motor ? { motor } : {}), ...(typeof pedido === 'string' && pedido ? { pedido } : {}) };
  const c = await api('/api/conversas', { method: 'POST', body: JSON.stringify(corpo) });
  if (!c?.id) { // motor que não existe/não está configurado neste servidor: explica e deixa escolher outro
    alert(c?.erro || 'Não consegui abrir a conversa.'); escolherMotor(); return;
  }
  // motor de chat (sem terminal): o pedido pronto vai pra caixa de texto, sem enviar, como no terminal
  if (c.motor === 'openai' && typeof pedido === 'string' && pedido) pedidoPendente = { id: c.id, texto: pedido };
  await atualizarEstado();
  trocarPara(c.id);
  if (c.motor !== 'openai') setTimeout(focarTerminal, 150);
}
async function encerrar(c) {
  if (!confirm(`Encerrar "${c.titulo}"? A conversa fica salva no histórico do ${c.motorNome || 'Claude Code'}.`)) return;
  await api(`/api/conversas/${c.id}`, { method: 'DELETE' });
  S.terminais.get(c.id)?.ws?.close(); S.terminais.delete(c.id);
  await atualizarEstado();
  trocarPara('mesa');
}

async function atualizarEstado() {
  const antes = JSON.stringify(S.conversas.map((c) => [c.id, c.motor, c.titulo, c.nota, c.trabalhando, c.ativo, c.ultimaAcao, c.subagentes, c.midias]));
  S.conversas = await api('/api/estado');
  const ativa = S.conversas.find((c) => c.id === S.ativa);
  if (ativa && (ehChat(ativa) || (semTela(ativa) && !assumidas.has(ativa.id)))) { pintarHistorico(ativa).catch(() => {}); atualizarChat(ativa); }
  const depois = JSON.stringify(S.conversas.map((c) => [c.id, c.motor, c.titulo, c.nota, c.trabalhando, c.ativo, c.ultimaAcao, c.subagentes, c.midias]));
  if (antes === depois) return;
  pintarConversas();
  const conv = S.conversas.find((c) => c.id === S.ativa);
  if (conv) {
    desenharFilhos(conv);
    const titulo = mundo.querySelector('.card[data-chave="terminal"] .card-titulo');
    if (titulo) titulo.innerHTML = `${esc(conv.titulo)} <span class="card-sub">${!ehChat(conv) && semTela(conv) && !assumidas.has(conv.id) ? (conv.origem === 'agendamento' ? 'Agendado' : 'WhatsApp') : esc(conv.motorNome || 'Claude Code')}</span>`;
    desenharLigacoes();
  }
}

// ---------- árvore ----------
// ---------- busca nas notas ----------
let buscaTimer = null; let buscaSeq = 0;
function destacar(alvo, texto, de, ate) {
  alvo.append(texto.slice(0, de));
  const m = el('mark'); m.textContent = texto.slice(de, ate); alvo.append(m);
  alvo.append(texto.slice(ate));
}
async function fazerBusca(q) {
  const lista = $('#busca-lista'); const arv = $('#arvore-lista');
  if (q.trim().length < 2) { lista.hidden = true; arv.hidden = false; return; }
  const minha = ++buscaSeq;
  let achados = [];
  try { achados = await api(`/api/busca?q=${encodeURIComponent(q)}`); } catch { achados = []; }
  if (minha !== buscaSeq) return; // chegou uma busca mais nova
  arv.hidden = true; lista.hidden = false; lista.innerHTML = '';
  if (!achados.length) { const v = el('div', 'busca-vazio'); v.textContent = 'Nada encontrado.'; lista.append(v); return; }
  for (const r of achados) {
    const b = el('button', 'achado'); b.type = 'button';
    const nome = el('b'); nome.textContent = r.nome; b.append(nome);
    const sub = el('small'); sub.textContent = r.caminho; b.append(sub);
    for (const t of r.trechos) {
      const x = el('span', 'trecho'); destacar(x, t.texto, t.de, t.ate); b.append(x);
    }
    b.addEventListener('click', () => abrirArquivo(r.caminho));
    lista.append(b);
  }
}
$('#busca')?.addEventListener('input', (e) => { clearTimeout(buscaTimer); buscaTimer = setTimeout(() => fazerBusca(e.target.value), 250); });
$('#busca')?.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.target.value = ''; fazerBusca(''); } });

const abertas = new Set(recuperar('pastas', ['conteudo']));
async function carregarArvore() {
  const dados = await api('/api/arvore');
  const raiz = $('#arvore-lista');
  raiz.innerHTML = '';
  raiz.append(montarNos(dados));
}
function montarNos(nos) {
  const frag = document.createDocumentFragment();
  for (const n of nos) {
    const linha = el('div', 'no');
    linha.dataset.caminho = n.caminho;
    if (n.tipo === 'pasta') {
      const aberto = abertas.has(n.caminho);
      linha.classList.toggle('aberto', aberto);
      linha.innerHTML = `<svg class="i seta" viewBox="0 0 24 24">${P.seta}</svg>${ic('pasta')}<span class="no-nome">${esc(n.nome)}</span>`;
      const filhos = el('div', 'filhos');
      filhos.hidden = !aberto;
      filhos.append(montarNos(n.filhos));
      linha.addEventListener('click', () => {
        const ab = !abertas.has(n.caminho);
        ab ? abertas.add(n.caminho) : abertas.delete(n.caminho);
        guardar('pastas', [...abertas]);
        linha.classList.toggle('aberto', ab); filhos.hidden = !ab;
      });
      frag.append(linha, filhos);
    } else {
      const t = tipoDe(n.nome);
      linha.innerHTML = `<span class="seta-vazia"></span>${ic(t === 'imagem' ? 'imagem' : t === 'video' ? 'filme' : 'doc')}<span class="no-nome">${esc(n.nome)}</span>`;
      linha.addEventListener('click', () => abrir(n.caminho));
      frag.append(linha);
    }
  }
  return frag;
}
function marcarArvore(caminho) {
  document.querySelectorAll('.no.ativo').forEach((n) => n.classList.remove('ativo'));
  document.querySelector(`.no[data-caminho="${CSS.escape(caminho)}"]`)?.classList.add('ativo');
}

// ---------- conteúdos: pastas com capa, pasta aberta, envio ----------
const ROTULOS = { carrosseis: 'Carrosséis', reels: 'Reels', thumbnails: 'Thumbnails', whatsapp: 'WhatsApp', enviados: 'Enviados', videos: 'Vídeos', imagens: 'Imagens' };
const rotulo = (n) => ROTULOS[n] || n.charAt(0).toUpperCase() + n.slice(1).replace(/-/g, ' ');
const tamanhoBonito = (b) => (b > 1e9 ? `${(b / 1e9).toFixed(1)} GB` : b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
const dataBonita = (ms) => new Date(ms).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
function nomeBonito(n, pasta) {
  let x = pasta ? n : n.replace(/\.[^.]+$/, '');
  const data = x.match(/^(\d{4})-(\d{2})-(\d{2})-/);
  if (data) x = x.slice(11);
  x = x.replace(/[-_]+/g, ' ').trim();
  return { titulo: x.charAt(0).toUpperCase() + x.slice(1), data: data ? `${data[3]}/${data[2]}` : '' };
}
const baixar = (c) => `${url(c)}&baixar=1`;
const capaUrl = (capa) => (capa.tipo === 'video' ? `/api/capa?caminho=${encodeURIComponent(capa.caminho)}` : url(capa.caminho));
function previaDe(c, classe = 'previa') {
  const t = tipoDe(c);
  if (t === 'imagem') return `<div class="${classe}"><img src="${url(c)}" alt="" draggable="false"></div>`;
  if (t === 'video') return `<div class="${classe}"><img src="/api/capa?caminho=${encodeURIComponent(c)}" alt="" draggable="false"><span class="selo-play">${ic('play')}</span></div>`;
  return `<div class="${classe} previa-doc">${ic('doc')}<span>${esc((c.split('.').pop() || '').toUpperCase())}</span></div>`;
}

const Cont = { item: null };
async function abrirConteudos() {
  $('#folha-conteudos').hidden = false; pintarDock();
  Cont.item ? await mostrarPasta(Cont.item) : await mostrarRaiz();
}
function cabecalho({ titulo, sub, migalha }) {
  $('#conteudos-titulo').textContent = titulo;
  $('#conteudos-sub').textContent = sub;
  $('#conteudos-migalha').hidden = !migalha; $('#conteudos-migalha').textContent = migalha || '';
  $('[data-acao="conteudos-voltar"]').hidden = !migalha;
  $('#soltar-destino').textContent = Cont.item ? `em ${Cont.item.titulo}` : 'na pasta Enviados';
}
async function mostrarRaiz() {
  Cont.item = null;
  cabecalho({ titulo: 'Conteúdos', sub: 'Tudo que o cérebro gerou, organizado por pasta.' });
  const cats = await api('/api/conteudos');
  const grade = $('#grade-conteudos'); grade.innerHTML = ''; grade.scrollTop = 0;
  if (!cats.some((c) => c.itens.length)) { grade.innerHTML = '<p class="vazio-conteudos">Nada gerado ainda. Peça algo numa conversa ou envie arquivos.</p>'; return; }
  for (const cat of cats) {
    if (!cat.itens.length) continue;
    const sec = el('section', 'grupo-conteudo', `<h3>${esc(rotulo(cat.nome))} <span>${cat.itens.length}</span></h3>`);
    const gi = el('div', 'grupo-pastas');
    for (const it of cat.itens) {
      const nb = nomeBonito(it.nome, it.pasta);
      const b = el('button', 'pasta-card');
      const capa = it.capa ? `<img src="${capaUrl(it.capa)}" alt="" draggable="false">${it.capa.tipo === 'video' ? `<span class="selo-play">${ic('play')}</span>` : ''}` : `<span class="capa-vazia">${ic(it.pasta ? 'pasta' : 'doc')}</span>`;
      b.innerHTML = `<div class="pasta-capa">${capa}</div>
        <div class="pasta-info"><span class="pasta-icone">${ic(it.pasta ? 'pasta' : 'doc')}</span><div><b>${esc(nb.titulo)}</b>
        <small>${it.pasta ? `${it.arquivos} ${it.arquivos === 1 ? 'arquivo' : 'arquivos'}` : esc((it.nome.split('.').pop() || '').toUpperCase())} · ${nb.data || dataBonita(it.mtime)}</small></div></div>`;
      b.addEventListener('click', () => (it.pasta
        ? mostrarPasta({ caminho: it.caminho, titulo: nb.titulo, categoria: rotulo(cat.nome) })
        : Visor.abrir([it.caminho], 0)));
      gi.append(b);
    }
    sec.append(gi); grade.append(sec);
  }
}
async function mostrarPasta(item) {
  Cont.item = item;
  const lista = await api(`/api/pasta?caminho=${encodeURIComponent(item.caminho)}`);
  cabecalho({ titulo: item.titulo, sub: `${lista.length} ${lista.length === 1 ? 'arquivo' : 'arquivos'} · clique pra abrir, ou arraste arquivos aqui pra enviar`, migalha: `Conteúdos › ${item.categoria}` });
  const grade = $('#grade-conteudos'); grade.innerHTML = ''; grade.scrollTop = 0;
  const grupos = new Map();
  for (const f of lista) {
    const sub = f.caminho.slice(item.caminho.length + 1).split('/').slice(0, -1).join(' / ');
    if (!grupos.has(sub)) grupos.set(sub, []);
    grupos.get(sub).push(f);
  }
  const ordem = [...grupos.keys()].sort((a, b) => (a === '' ? -1 : b === '' ? 1 : a === 'entrega' ? -1 : b === 'entrega' ? 1 : a.localeCompare(b)));
  const todos = ordem.flatMap((g) => grupos.get(g).map((f) => f.caminho));
  for (const g of ordem) {
    const sec = el('section', 'grupo-conteudo', g ? `<h3>${esc(rotulo(g))} <span>${grupos.get(g).length}</span></h3>` : '');
    const gi = el('div', 'grupo-itens');
    for (const f of grupos.get(g)) {
      const b = el('div', 'miniatura');
      b.innerHTML = `${previaDe(f.caminho)}<div class="legenda"><span>${esc(f.nome)}</span><small>${tamanhoBonito(f.tamanho)}</small></div>
        <a class="mini-baixar" href="${baixar(f.caminho)}" download title="Baixar">${ic('baixar')}</a>`;
      b.addEventListener('click', (e) => { if (e.target.closest('.mini-baixar')) return; Visor.abrir(todos, todos.indexOf(f.caminho)); });
      gi.append(b);
    }
    sec.append(gi); grade.append(sec);
  }
}
function fecharConteudos() { $('#folha-conteudos').hidden = true; pintarDock(); }

// envio do computador pro servidor (um arquivo por vez, com progresso)
async function enviarArquivos(arquivos) {
  const pasta = Cont.item ? Cont.item.caminho : 'conteudo/enviados';
  const caixa = $('#envio'); caixa.hidden = false;
  let feitos = 0;
  for (const f of arquivos) {
    await new Promise((ok) => {
      const x = new XMLHttpRequest();
      x.open('POST', `/api/enviar?pasta=${encodeURIComponent(pasta)}&nome=${encodeURIComponent(f.name)}`);
      x.setRequestHeader('Content-Type', 'application/octet-stream');
      x.upload.onprogress = (e) => {
        const pct = e.lengthComputable ? Math.round((e.loaded / e.total) * 100) : 0;
        caixa.innerHTML = `${ic('enviar')}<div><b>Enviando ${feitos + 1} de ${arquivos.length}</b><small>${esc(f.name)}</small><i style="--p:${pct}%"></i></div>`;
      };
      x.onloadend = () => { if (x.status === 200) feitos++; ok(); };
      x.send(f);
    });
  }
  caixa.innerHTML = `${ic('check')}<div><b>${feitos} de ${arquivos.length} ${arquivos.length === 1 ? 'arquivo enviado' : 'arquivos enviados'}</b><small>${esc(Cont.item ? Cont.item.titulo : 'Conteúdos › Enviados')}</small></div>`;
  setTimeout(() => { caixa.hidden = true; }, 3500);
  if (!$('#folha-conteudos').hidden) (Cont.item ? mostrarPasta(Cont.item) : mostrarRaiz());
  carregarArvoreSeMudou().catch(() => {});
}
$('#entrada-arquivos').addEventListener('change', (e) => { const a = [...e.target.files]; e.target.value = ''; if (a.length) enviarArquivos(a); });
{
  const corpo = $('#conteudos-corpo'); let profundidade = 0;
  corpo.addEventListener('dragenter', (e) => { if (!e.dataTransfer?.types.includes('Files')) return; e.preventDefault(); profundidade++; corpo.classList.add('soltando'); });
  corpo.addEventListener('dragover', (e) => { if (e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  corpo.addEventListener('dragleave', () => { if (--profundidade <= 0) { profundidade = 0; corpo.classList.remove('soltando'); } });
  corpo.addEventListener('drop', (e) => { e.preventDefault(); profundidade = 0; corpo.classList.remove('soltando'); const a = [...e.dataTransfer.files]; if (a.length) enviarArquivos(a); });
}

// ---------- visor: o arquivo por cima de tudo, fundo desfocado ----------
const Visor = {
  lista: [], i: 0,
  get aberto() { return !$('#visor').hidden; },
  abrir(lista, i) { this.lista = lista; this.i = Math.max(0, i); $('#visor').hidden = false; this.mostrar(); },
  fechar() { $('#visor-palco').innerHTML = ''; $('#visor').hidden = true; },
  passo(d) { if (this.lista.length < 2) return; this.i = (this.i + d + this.lista.length) % this.lista.length; this.mostrar(); },
  mostrar() {
    const c = this.lista[this.i]; const t = tipoDe(c);
    $('#visor-nome').textContent = nomeDe(c);
    $('#visor-info').textContent = this.lista.length > 1 ? `${this.i + 1} de ${this.lista.length}` : c.split('/').slice(0, -1).join(' › ');
    $('#visor-baixar').href = baixar(c);
    $('#visor').classList.toggle('so-um', this.lista.length < 2);
    const palco = $('#visor-palco'); palco.innerHTML = '';
    if (t === 'imagem') { const im = el('img', 'visor-midia'); im.src = url(c); im.alt = nomeDe(c); palco.append(im); }
    else if (t === 'video') { const v = el('video', 'visor-midia'); v.src = url(c); v.controls = true; v.autoplay = true; v.playsInline = true; palco.append(v); }
    else if (t === 'texto') { const d = el('div', 'visor-doc md', '<p style="color:var(--texto-3)">Carregando…</p>'); palco.append(d); api(url(c)).then((txt) => { d.innerHTML = renderizar(String(txt), c); }); }
    else palco.append(el('div', 'visor-doc visor-sem-previa', `${ic('doc')}<b>Sem prévia pra esse tipo de arquivo</b><a class="botao-leve" href="${baixar(c)}" download>${ic('baixar')} Baixar</a>`));
  },
};
// mídia abre no visor de onde vier (árvore, grafo, conteúdos); nota continua virando card no canvas
async function abrir(caminho) {
  const t = tipoDe(caminho);
  if (t !== 'imagem' && t !== 'video') return abrirArquivo(caminho);
  const dir = caminho.split('/').slice(0, -1).join('/');
  let irmaos = [caminho];
  try {
    const l = await api(`/api/pasta?caminho=${encodeURIComponent(dir)}`);
    irmaos = l.map((f) => f.caminho).filter((p) => p.split('/').slice(0, -1).join('/') === dir && ['imagem', 'video'].includes(tipoDe(p)));
  } catch { /* fica só ele */ }
  Visor.abrir(irmaos, irmaos.indexOf(caminho));
}

// ---------- dock e ações ----------
const aberta = (q) => (q === 'arvore' ? !$('#arvore').classList.contains('fechado') : false);
function pintarDock() {
  const icones = { arvore: 'arvore', grafo: 'grafo', config: 'engrenagem', 'nova-conversa': 'conversaNova', conteudos: 'grade', agenda: 'relogio', backup: 'backup', centralizar: 'mira', sair: 'sair',
    tema: document.documentElement.dataset.tema === 'escuro' ? 'sol' : 'lua' };
  document.querySelectorAll('#dock button').forEach((b) => { b.innerHTML = ic(icones[b.dataset.acao]); });
  $('#dock [data-acao="arvore"]')?.classList.toggle('ligado', !$('#arvore')?.classList.contains('fechado'));
  $('#dock [data-acao="conteudos"]')?.classList.toggle('ligado', !$('#folha-conteudos')?.hidden);
  $('#dock [data-acao="grafo"]')?.classList.toggle('ligado', !$('#grafo')?.hidden);
  $('#dock [data-acao="config"]')?.classList.toggle('ligado', !$('#folha-config')?.hidden);
  $('#dock [data-acao="agenda"]')?.classList.toggle('ligado', !$('#folha-agenda')?.hidden);
  $('#dock [data-acao="backup"]')?.classList.toggle('ligado', !$('#folha-backup')?.hidden);
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-acao]');
  if (!b) return;
  const a = b.dataset.acao;
  if (a === 'arvore') { $('#arvore').classList.toggle('fechado'); guardar('arvoreFechada', $('#arvore').classList.contains('fechado')); pintarDock(); }
  if (a === 'nova-conversa') escolherMotor();
  if (a === 'fechar-seletor') fecharSeletor();
  if (a === 'abrir-motor') { api('/api/config/motores', { method: 'POST', body: JSON.stringify({ padrao: b.dataset.motor }) }); novaConversa(null, b.dataset.motor); }
  if (a === 'instalar-motor') novaConversa(MOTORES_UI[b.dataset.motor].instalar);
  if (a === 'conteudos') abrirConteudos();
  if (a === 'fechar-conteudos') fecharConteudos();
  if (a === 'conteudos-voltar') mostrarRaiz();
  if (a === 'enviar-arquivos') $('#entrada-arquivos').click();
  if (a === 'fechar-visor') Visor.fechar();
  if (a === 'visor-ant') Visor.passo(-1);
  if (a === 'visor-prox') Visor.passo(1);
  if (a === 'centralizar') centralizarTudo();
  if (a === 'tema') aplicarTema(document.documentElement.dataset.tema === 'escuro' ? 'claro' : 'escuro');
  if (a === 'recarregar-arvore') carregarArvore();
  if (a === 'grafo') (Grafo.aberto ? Grafo.fechar() : Grafo.abrir());
  if (a === 'config') abrirConfig();
  if (a === 'agenda') abrirAgenda();
  if (a === 'config-openai') abrirOpenAI();
  if (a === 'fechar-openai') fecharOpenAI();
  if (a === 'backup') abrirBackup();
  if (a === 'fechar-backup') fecharBackup();
  if (a === 'fechar-agenda') fecharAgenda();
  if (a === 'fechar-config') fecharConfig();
  if (a === 'whats-conectar') conectarWhats(b);
  if (a === 'motor') api('/api/config/motores', { method: 'POST', body: JSON.stringify({ [b.dataset.campo]: b.dataset.valor }) }).then(pintarConfig);
  if (a === 'whats-desconectar') desconectarWhats();
  if (a === 'acesso-adicionar') autorizarNumero();
  if (a === 'acesso-remover') salvarAcesso((x) => { x.numeros = x.numeros.filter((n) => n !== b.dataset.n); });
  if (a === 'pedir') { fecharConfig(); novaConversa(b.dataset.pedido); } // sem motor fixo: vale o que está configurado e instalado
  if (a === 'comece-alternar') { const f = !$('#comece').classList.contains('fechado'); guardar('comeceFechado', f); $('#comece').classList.toggle('fechado', f); }
  if (a === 'sair') { await fetch('/api/logout', { method: 'POST' }); location.reload(); }
});
document.addEventListener('keydown', (e) => {
  if (Visor.aberto && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && !e.target.closest('input, textarea, .xterm')) { Visor.passo(e.key === 'ArrowRight' ? 1 : -1); return; }
  if (e.key !== 'Escape') return;
  if (Visor.aberto) Visor.fechar();
  else if (!$('#escolher-motor').hidden) fecharSeletor();
  else if (!$('#folha-conteudos').hidden) fecharConteudos();
  else if (!$('#folha-config').hidden) fecharConfig();
  else if (!$('#folha-agenda').hidden) fecharAgenda();
  else if (!$('#folha-backup').hidden) fecharBackup();
  else if (!$('#folha-openai').hidden) fecharOpenAI();
  else if (Grafo.aberto) Grafo.fechar();
});

// ---------- grafo (pontinhos ligados, estilo Obsidian) ----------
const Grafo = {
  aberto: false, nos: [], lig: [], cam: { x: 0, y: 0, z: 1 }, alfa: 1, hover: null, arrastado: null,
  async abrir() {
    const dados = await api('/api/grafo');
    const antigos = new Map(this.nos.map((n) => [n.id, n]));
    const tela = $('#grafo-tela');
    this.nos = dados.nos.map((n, i) => {
      const a = antigos.get(n.id); const ang = i * 2.4; const r = 30 + Math.sqrt(i) * 28;
      return { ...n, x: a?.x ?? Math.cos(ang) * r, y: a?.y ?? Math.sin(ang) * r, vx: 0, vy: 0, grau: 0 };
    });
    const idx = new Map(this.nos.map((n) => [n.id, n]));
    this.lig = dados.ligacoes.map((l) => ({ a: idx.get(l.de), b: idx.get(l.para), tipo: l.tipo })).filter((l) => l.a && l.b);
    for (const l of this.lig) { l.a.grau++; l.b.grau++; }
    this.viz = new Map(this.nos.map((n) => [n, new Set()]));
    for (const l of this.lig) { this.viz.get(l.a).add(l.b); this.viz.get(l.b).add(l.a); }
    $('#grafo').hidden = false; this.aberto = true; pintarDock();
    this.ajustar(tela);
    // acomoda o desenho antes de mostrar (o movimento final fica só no ajuste fino)
    this.alfa = 1; for (let i = 0; i < 500; i++) this.passo();
    this.alfa = 0.12;
    if (!this.cam.iniciada) this.enquadrar();
    if (!this.ligado) this.ligar(tela);
    cancelAnimationFrame(this.raf); const loop = () => { this.passo(); this.desenhar(tela); if (this.aberto) this.raf = requestAnimationFrame(loop); }; loop();
    this.timer = setInterval(() => { if (this.aberto && document.hidden) { this.passo(); this.desenhar(tela); } }, 50);
  },
  enquadrar() {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const n of this.nos) { x1 = Math.min(x1, n.x); y1 = Math.min(y1, n.y); x2 = Math.max(x2, n.x); y2 = Math.max(y2, n.y); }
    const esq = aberta('arvore') ? 300 : 20, dir = 350, topo = 70, base = 110;
    const lw = innerWidth - esq - dir, lh = innerHeight - topo - base;
    const z = Math.min(1.3, lw / (x2 - x1 + 120), lh / (y2 - y1 + 120));
    this.cam = { z, x: esq + lw / 2 - ((x1 + x2) / 2) * z, y: topo + lh / 2 - ((y1 + y2) / 2) * z, iniciada: true };
  },
  fechar() { this.aberto = false; $('#grafo').hidden = true; $('#grafo-rotulo').hidden = true; cancelAnimationFrame(this.raf); clearInterval(this.timer); pintarDock(); },
  ajustar(tela) { const d = devicePixelRatio || 1; tela.width = innerWidth * d; tela.height = innerHeight * d; this.dpr = d; },
  raio(n) { return n.tipo === 'pasta' ? 2.8 + Math.sqrt(n.grau) * 0.9 : 2 + Math.sqrt(n.grau) * 0.5; },
  passo() {
    if (this.alfa < 0.004) return;
    const N = this.nos; const k = this.alfa;
    for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
      const a = N[i], b = N[j]; let dx = b.x - a.x, dy = b.y - a.y; let d2 = dx * dx + dy * dy || 0.01;
      if (d2 > 90000) continue; const f = (700 / d2) * k; const d = Math.sqrt(d2); dx /= d; dy /= d;
      a.vx -= dx * f; a.vy -= dy * f; b.vx += dx * f; b.vy += dy * f;
    }
    for (const l of this.lig) {
      const alvo = l.tipo === 'pasta' ? 34 : 60; const dx = l.b.x - l.a.x, dy = l.b.y - l.a.y; const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = ((d - alvo) / d) * 0.06 * k; l.a.vx += dx * f; l.a.vy += dy * f; l.b.vx -= dx * f; l.b.vy -= dy * f;
    }
    for (const n of N) {
      n.vx -= n.x * 0.012 * k; n.vy -= n.y * 0.012 * k;
      if (n === this.arrastado) { n.vx = n.vy = 0; continue; }
      n.vx *= 0.82; n.vy *= 0.82;
      const v = Math.hypot(n.vx, n.vy); if (v > 18) { n.vx *= 18 / v; n.vy *= 18 / v; }
      n.x += n.vx; n.y += n.vy;
    }
    this.alfa *= 0.992;
  },
  desenhar(tela) {
    const c = tela.getContext('2d'); const d = this.dpr; const cs = getComputedStyle(document.documentElement);
    const cor = (v) => cs.getPropertyValue(v).trim();
    c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, tela.width, tela.height);
    c.setTransform(d * this.cam.z, 0, 0, d * this.cam.z, d * this.cam.x, d * this.cam.y);
    const h = this.hover; const viz = h ? this.viz.get(h) : null;
    c.lineWidth = 1 / this.cam.z;
    for (const l of this.lig) {
      const ativa = h && (l.a === h || l.b === h);
      c.strokeStyle = ativa ? cor('--acento') : cor('--texto-3'); c.globalAlpha = h ? (ativa ? 0.9 : 0.06) : (l.tipo === 'link' ? 0.35 : 0.18);
      c.beginPath(); c.moveTo(l.a.x, l.a.y); c.lineTo(l.b.x, l.b.y); c.stroke();
    }
    const cores = { pasta: cor('--acento'), nota: cor('--texto-2'), midia: cor('--laranja') };
    for (const n of this.nos) {
      const foco = !h || n === h || viz.has(n);
      c.globalAlpha = foco ? 1 : 0.15; c.fillStyle = cores[n.tipo];
      c.beginPath(); c.arc(n.x, n.y, this.raio(n) * (n === h ? 1.5 : 1), 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1; c.fillStyle = cor('--texto'); c.textAlign = 'center'; c.textBaseline = 'top';
    const fs = 10.5 / Math.max(this.cam.z, 0.6);
    c.font = `500 ${fs}px -apple-system, BlinkMacSystemFont, Inter, sans-serif`;
    for (const n of this.nos) {
      const raiz = n.tipo === 'pasta' && !n.id.includes('/');
      const mostra = (h && (n === h || viz.has(n))) || (!h && (raiz || this.cam.z > 2.8));
      if (!mostra) continue;
      c.globalAlpha = n === h ? 1 : 0.55; c.fillText(n.nome, n.x, n.y + this.raio(n) + 4);
    }
    c.globalAlpha = 1;
  },
  noEm(x, y) {
    const wx = (x - this.cam.x) / this.cam.z, wy = (y - this.cam.y) / this.cam.z;
    let melhor = null, dm = Infinity;
    for (const n of this.nos) { const d = Math.hypot(n.x - wx, n.y - wy); if (d < this.raio(n) + 6 / this.cam.z && d < dm) { dm = d; melhor = n; } }
    return melhor;
  },
  ligar(tela) {
    this.ligado = true;
    addEventListener('resize', () => this.aberto && this.ajustar(tela));
    tela.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey || Math.abs(e.deltaY) > 0) {
        const f = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)); const z = Math.min(4, Math.max(0.2, this.cam.z * f)); const k = z / this.cam.z;
        this.cam.x = e.clientX - (e.clientX - this.cam.x) * k; this.cam.y = e.clientY - (e.clientY - this.cam.y) * k; this.cam.z = z;
      }
    }, { passive: false });
    tela.addEventListener('pointermove', (e) => {
      if (this.pan) { this.cam.x = this.pan.cx + e.clientX - this.pan.x; this.cam.y = this.pan.cy + e.clientY - this.pan.y; return; }
      if (this.arrastado) { this.arrastado.x = (e.clientX - this.cam.x) / this.cam.z; this.arrastado.y = (e.clientY - this.cam.y) / this.cam.z; this.alfa = Math.max(this.alfa, 0.3); this.moveu = true; return; }
      const n = this.noEm(e.clientX, e.clientY); this.hover = n; tela.style.cursor = n ? 'pointer' : 'grab';
      const r = $('#grafo-rotulo');
      if (n) { r.hidden = false; r.textContent = n.id; r.style.left = `${e.clientX + 14}px`; r.style.top = `${e.clientY + 14}px`; } else r.hidden = true;
    });
    tela.addEventListener('pointerdown', (e) => {
      tela.setPointerCapture(e.pointerId); this.moveu = false;
      const n = this.noEm(e.clientX, e.clientY);
      if (n) this.arrastado = n; else { this.pan = { x: e.clientX, y: e.clientY, cx: this.cam.x, cy: this.cam.y }; tela.classList.add('arrastando'); }
    });
    tela.addEventListener('pointerup', () => {
      const n = this.arrastado; this.arrastado = null; this.pan = null; tela.classList.remove('arrastando');
      if (n && !this.moveu && n.tipo !== 'pasta') { this.fechar(); abrir(n.id); }
    });
  },
};

// ---------- configurações (engrenagem) ----------
let qrAtual = null; let qrVencido = false; let acessoAtual = { numeros: [], chatVoce: true };
async function abrirConfig() {
  $('#folha-config').hidden = false; pintarDock();
  await pintarConfig();
  clearInterval(abrirConfig.t); abrirConfig.t = setInterval(() => tickConfig().catch(() => {}), 3000);
}
// com o QR na tela: só troca a imagem quando o WhatsApp gira o código e redesenha quando conecta ou vence.
// sem QR: redesenha o estado, menos quando a pessoa está digitando um número.
async function tickConfig() {
  if ($('#folha-config').hidden) { clearInterval(abrirConfig.t); return; }
  if (qrAtual) {
    const r = await api('/api/config/whatsapp/qr');
    if (!r || r.erro) return;
    if (r.estado === 'connecting') {
      if (r.qr && r.qr !== qrAtual) { qrAtual = r.qr; const img = $('#config-corpo .qr img'); if (img) img.src = r.qr; }
      return;
    }
    qrAtual = null; qrVencido = r.estado !== 'open';
    return pintarConfig();
  }
  if (document.activeElement?.closest?.('#config-corpo') && document.activeElement.matches('input, textarea')) return;
  if ($('#acesso-novo')?.value) return;
  await pintarConfig();
}
// ---------- agendamento de tarefas ----------
const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const quandoBR = (ms) => new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
function descreverFreq(f) {
  if (f.tipo === 'diaria') return `Todo dia às ${f.hora}`;
  if (f.tipo === 'semanal') return `${f.dias.map((d) => DIAS_SEMANA[d]).join(', ')} às ${f.hora}`;
  const n = f.minutos;
  if (n % 1440 === 0) return `A cada ${n / 1440} dia${n / 1440 > 1 ? 's' : ''}`;
  if (n % 60 === 0) return `A cada ${n / 60} h`;
  return `A cada ${n} min`;
}
let agendaLista = []; let agendaEdicao = null; // agendaEdicao: id | 'novo' | null
async function abrirAgenda() {
  const corpo = $('#agenda-corpo');
  if (!corpo.firstElementChild) corpo.innerHTML = '<div id="agenda-form"></div><div id="agenda-lista" class="agenda-lista"></div>';
  $('#folha-agenda').hidden = false; pintarDock();
  await pintarAgenda();
  clearInterval(abrirAgenda.t);
  abrirAgenda.t = setInterval(() => { if ($('#folha-agenda').hidden) clearInterval(abrirAgenda.t); else pintarAgenda().catch(() => {}); }, 5000);
}
function fecharAgenda() { $('#folha-agenda').hidden = true; clearInterval(abrirAgenda.t); agendaEdicao = null; pintarDock(); }
async function pintarAgenda() {
  agendaLista = await api('/api/agendamentos');
  const raiz = $('#agenda-lista');
  if (!raiz) return;
  const topo = agendaEdicao ? '' : '<div class="agenda-topo"><button class="botao-leve botao-salvar" data-agenda="novo" type="button">+ Nova tarefa</button></div>';
  raiz.innerHTML = topo + (agendaLista.length ? agendaLista.map((a) => {
    const u = a.ultima;
    return `<article class="config-cartao agenda-item ${a.ativo ? '' : 'pausada'}" data-id="${esc(a.id)}">
      <div class="config-cabeca"><span class="config-icone azul">${ic('relogio')}</span>
        <div class="config-titulo"><b>${esc(a.nome)}</b><span>${esc(descreverFreq(a.freq))}${a.enviarWhats ? ' · avisa no WhatsApp' : ''}</span></div>
        <span class="pilula ${a.naFila ? 'trabalhando' : a.ativo ? 'conectado' : ''}">${a.naFila ? 'Rodando…' : a.ativo ? 'Ativa' : 'Pausada'}</span></div>
      <p class="agenda-prompt"></p>
      <dl class="config-linhas">
        <div><dt>Próxima</dt><dd>${a.proxima ? esc(quandoBR(a.proxima)) : '—'}</dd></div>
        <div><dt>Última</dt><dd>${u ? `${esc(quandoBR(u.quando))} · ${u.ok ? 'ok' : '<span style="color:#ff3b30">falhou</span>'}` : 'ainda não rodou'}</dd></div>
      </dl>
      ${u?.resumo ? '<p class="agenda-resumo"></p>' : ''}
      <div class="config-botoes">
        <button class="botao-leve" data-agenda="executar" type="button" ${a.naFila ? 'disabled' : ''}>Executar agora</button>
        <button class="botao-leve" data-agenda="alternar" type="button">${a.ativo ? 'Pausar' : 'Ativar'}</button>
        <button class="botao-leve" data-agenda="editar" type="button">Editar</button>
        <button class="botao-leve" data-agenda="excluir" type="button">Excluir</button>
      </div></article>`;
  }).join('') : '<p class="config-dica">Nenhuma tarefa agendada ainda. Crie uma pra o seu cérebro trabalhar sozinho (um resumo diário, um lembrete, uma checagem).</p>');
  // textos livres entram como texto, nunca como HTML
  raiz.querySelectorAll('.agenda-item').forEach((n) => {
    const a = agendaLista.find((x) => x.id === n.dataset.id);
    n.querySelector('.agenda-prompt').textContent = a.prompt;
    const r = n.querySelector('.agenda-resumo'); if (r) r.textContent = a.ultima.resumo;
  });
}
function formAgenda(ag) {
  const f = ag?.freq || { tipo: 'diaria', hora: '08:00' };
  const unid = f.tipo === 'intervalo' ? (f.minutos % 1440 === 0 ? 1440 : f.minutos % 60 === 0 ? 60 : 1) : 60;
  const form = el('form', 'config-cartao agenda-form');
  form.dataset.tipo = f.tipo;
  form.innerHTML = `
    <label>Nome<input name="nome" maxlength="80" required placeholder="Ex.: Resumo da manhã"></label>
    <label>O que o cérebro deve fazer<textarea name="prompt" rows="4" maxlength="4000" required placeholder="Ex.: Resuma as notas que mudaram ontem e liste 3 prioridades pra hoje."></textarea></label>
    <div class="agenda-linha">
      <label>Quando<select name="tipo"><option value="diaria">Todo dia</option><option value="semanal">Em dias da semana</option><option value="intervalo">De tempos em tempos</option></select></label>
      <label class="so-horario">Horário (Brasília)<input type="time" name="hora" required></label>
      <label class="so-intervalo">A cada<span class="agenda-par"><input type="number" name="n" min="1" max="10080" step="1"><select name="unid"><option value="1">minutos</option><option value="60">horas</option><option value="1440">dias</option></select></span></label>
    </div>
    <div class="agenda-dias so-semanal">${DIAS_SEMANA.map((d, i) => `<label><input type="checkbox" name="dia" value="${i}"> ${d}</label>`).join('')}</div>
    <label class="agenda-check"><input type="checkbox" name="whats"> Mandar o resultado no WhatsApp</label>
    <p class="login-erro" role="alert"></p>
    <div class="config-botoes"><button type="submit" class="botao-leve botao-salvar">Salvar</button><button type="button" class="botao-leve" data-agenda="cancelar">Cancelar</button></div>`;
  form.nome.value = ag?.nome || ''; form.prompt.value = ag?.prompt || '';
  form.tipo.value = f.tipo; form.hora.value = f.hora || '08:00';
  form.n.value = f.tipo === 'intervalo' ? f.minutos / unid : 1; form.unid.value = String(unid);
  form.querySelectorAll('[name=dia]').forEach((c) => { c.checked = (f.dias || []).includes(Number(c.value)); });
  form.whats.checked = Boolean(ag?.enviarWhats);
  form.tipo.addEventListener('change', () => { form.dataset.tipo = form.tipo.value; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const erro = form.querySelector('.login-erro'); erro.textContent = '';
    const tipo = form.tipo.value;
    const freq = tipo === 'intervalo' ? { tipo, minutos: Math.round(Number(form.n.value) * Number(form.unid.value)) }
      : tipo === 'semanal' ? { tipo, hora: form.hora.value, dias: [...form.querySelectorAll('[name=dia]:checked')].map((c) => Number(c.value)) }
        : { tipo, hora: form.hora.value };
    const corpo = { nome: form.nome.value, prompt: form.prompt.value, freq, enviarWhats: form.whats.checked };
    const edit = agendaEdicao && agendaEdicao !== 'novo';
    const r = await fetch(edit ? `/api/agendamentos/${agendaEdicao}` : '/api/agendamentos', { method: edit ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    if (r.status === 401) return mostrarLogin();
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { erro.textContent = j.erro || 'Não consegui salvar.'; return; }
    agendaEdicao = null; $('#agenda-form').innerHTML = ''; pintarAgenda();
  });
  return form;
}
function mostrarFormAgenda(ag) {
  agendaEdicao = ag ? ag.id : 'novo';
  const f = $('#agenda-form'); f.innerHTML = ''; f.append(formAgenda(ag));
  f.querySelector('[name=nome]').focus();
  pintarAgenda();
}
$('#folha-agenda')?.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-agenda]'); if (!b) return;
  const id = b.closest('.agenda-item')?.dataset.id; const ag = agendaLista.find((x) => x.id === id);
  const acao = b.dataset.agenda;
  if (acao === 'novo') return mostrarFormAgenda(null);
  if (acao === 'cancelar') { agendaEdicao = null; $('#agenda-form').innerHTML = ''; return pintarAgenda(); }
  if (acao === 'editar' && ag) return mostrarFormAgenda(ag);
  if (acao === 'alternar' && ag) await api(`/api/agendamentos/${id}`, { method: 'PUT', body: JSON.stringify({ ativo: !ag.ativo }) });
  if (acao === 'executar' && ag) { b.disabled = true; await api(`/api/agendamentos/${id}/executar`, { method: 'POST' }); }
  if (acao === 'excluir' && ag && confirm(`Excluir a tarefa "${ag.nome}"? As conversas que ela já gerou continuam no painel.`)) await api(`/api/agendamentos/${id}`, { method: 'DELETE' });
  pintarAgenda();
});

// ---------- chat (motor de API: OpenAI) ----------
function cardChat(conv) {
  const card = criarCard({
    chave: 'terminal', classe: 'card-terminal card-historico card-chat', icone: 'conversaNova', titulo: conv.titulo, sub: conv.motorNome || 'OpenAI (API)',
    x: 0, y: 0, w: 860, h: 540, fechavel: false, extras: '<span class="pilula" data-status>pronto</span>',
  });
  const raiz = el('div', 'chat');
  raiz.innerHTML = `<div class="historico"></div>
    <form class="chat-entrada"><textarea class="chat-texto" rows="2" maxlength="20000" placeholder="Escreva pro seu cérebro… (Enter envia, Shift+Enter quebra a linha)" aria-label="Mensagem"></textarea>
      <button type="submit" class="botao-leve botao-salvar chat-enviar">Enviar</button></form><p class="chat-aviso" role="status"></p>`;
  card.querySelector('.card-corpo').append(raiz);
  const form = raiz.querySelector('form'); const area = raiz.querySelector('.chat-texto'); const aviso = raiz.querySelector('.chat-aviso');
  if (pedidoPendente?.id === conv.id) { area.value = pedidoPendente.texto; pedidoPendente = null; aviso.textContent = 'Pedido pronto na caixa: leia e aperte Enter pra enviar.'; }
  const viva = () => S.conversas.find((x) => x.id === conv.id) || conv;
  async function enviar() {
    const texto = area.value.trim(); if (!texto) return;
    aviso.textContent = '';
    const r = await fetch(`/api/conversas/${conv.id}/mensagem`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto }) });
    if (r.status === 401) return mostrarLogin();
    if (!r.ok) { aviso.textContent = (await r.json().catch(() => ({}))).erro || 'Não consegui enviar.'; return; }
    area.value = '';
    viva().processando = true; viva().trabalhando = true; atualizarChat(viva());
    await atualizarEstado(); setTimeout(() => pintarHistorico(conv, true), 600);
  }
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (viva().processando) { await fetch(`/api/conversas/${conv.id}/parar`, { method: 'POST' }); return; }
    enviar();
  });
  area.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); if (!viva().processando) enviar(); } });
  pintarHistorico(conv, true).then(() => atualizarChat(viva()));
  setTimeout(() => area.focus(), 80);
  // enquanto o agente responde, olha o histórico várias vezes por segundo pra mostrar o texto chegando
  const rapido = setInterval(() => {
    if (!card.isConnected) { clearInterval(rapido); return; }
    if (viva().processando && !document.hidden) pintarHistorico(conv).catch(() => {});
  }, 450);
  return card;
}
function atualizarChat(conv) {
  const card = mundo.querySelector('.card-chat'); if (!card || !conv) return;
  const pill = card.querySelector('[data-status]'); const b = card.querySelector('.chat-enviar');
  const ocupado = Boolean(conv.processando);
  pill.className = `pilula${ocupado ? ' trabalhando' : ''}`; pill.textContent = ocupado ? (conv.ultimaAcao || 'pensando…') : 'pronto';
  b.textContent = ocupado ? 'Parar' : 'Enviar'; b.classList.toggle('parar', ocupado);
}

// ---------- configurações da OpenAI (API) ----------
const numeroBR = (n) => Number(n || 0).toLocaleString('pt-BR');
async function abrirOpenAI() {
  fecharSeletor();
  const corpo = $('#openai-corpo');
  if (!corpo.firstElementChild) {
    corpo.innerHTML = `
      <section class="config-cartao agenda-form" id="openai-chave">
        <div class="config-cabeca"><span class="config-icone azul"><img src="/logos/openai.svg" alt="" width="22" height="22" style="filter:invert(1)"></span><div class="config-titulo"><b>Chave da API</b><span id="openai-chave-estado"></span></div></div>
        <form id="openai-form-chave" class="agenda-linha">
          <label>Nova chave<input type="password" name="chave" placeholder="sk-…" autocomplete="off" spellcheck="false"></label>
          <div class="config-botoes"><button type="submit" class="botao-leve botao-salvar">Testar e guardar</button><button type="button" class="botao-leve" data-openai="apagar-chave" hidden>Remover chave</button></div>
        </form>
        <p class="login-erro" id="openai-erro-chave" role="alert"></p>
        <p class="config-dica">A chave é testada na OpenAI antes de ser guardada neste servidor (arquivo só do servidor) e nunca volta pra esta tela. Crie uma em platform.openai.com/api-keys. Quem define <code>OPENAI_API_KEY</code> no servidor tem prioridade.</p>
      </section>
      <form class="config-cartao agenda-form" id="openai-form-cfg">
        <div class="config-cabeca"><span class="config-icone azul">${ic('engrenagem')}</span><div class="config-titulo"><b>Modelo e limites</b><span>Controle do que cada pedido pode gastar</span></div></div>
        <label>Modelo<input name="modelo" list="openai-modelos" placeholder="Escolha da lista ou digite" autocomplete="off" spellcheck="false" required></label>
        <datalist id="openai-modelos"></datalist>
        <div class="config-botoes"><button type="button" class="botao-leve" data-openai="modelos">Buscar modelos da minha conta</button></div>
        <div class="agenda-linha">
          <label>Passos por pedido<input type="number" name="maxPassos" min="1" max="100" step="1" required></label>
          <label>Limite de saída por resposta (tokens, 0 = sem limite)<input type="number" name="maxSaida" min="0" step="1" required></label>
          <label>Limite diário (tokens, 0 = sem limite)<input type="number" name="limiteDiario" min="0" step="1" required></label>
        </div>
        <label class="agenda-check"><input type="checkbox" name="streaming"> Mostrar a resposta em tempo real, palavra por palavra (desligue só se o servidor não suportar)</label>
        <label class="agenda-check"><input type="checkbox" name="shell"> Permitir que o agente rode comandos de shell neste servidor (avançado)</label>
        <p class="config-dica"><b>Atenção:</b> sem isso o agente só lê e escreve arquivos do cérebro, o que é bem mais seguro. Com isso ligado ele pode rodar qualquer comando que o painel pode, inclusive a partir de mensagens do WhatsApp e de tarefas agendadas.</p>
        <p class="login-erro" id="openai-erro-cfg" role="alert"></p>
        <div class="config-botoes"><button type="submit" class="botao-leve botao-salvar">Salvar</button></div>
      </form>
      <section class="config-cartao"><dl class="config-linhas" id="openai-uso"></dl>
        <p class="config-dica">Tokens contados pelo que a OpenAI informa a cada resposta; os "do cache" são entrada repetida que a OpenAI cobra mais barato (o cache é automático e depende do modelo). Se você interromper uma resposta no meio, os tokens dela podem não ser contados. O custo em dinheiro depende do modelo escolhido: confira os preços atuais no painel da OpenAI. Esse motor não tem terminal nem skills do Claude Code: ele conversa pelo painel, pelo WhatsApp e pelos agendamentos.</p>
      </section>`;
    $('#openai-form-chave').addEventListener('submit', salvarChaveOpenAI);
    $('#openai-form-cfg').addEventListener('submit', salvarCfgOpenAI);
  }
  $('#folha-openai').hidden = false;
  await pintarOpenAI(true);
}
function fecharOpenAI() { $('#folha-openai').hidden = true; }
async function pintarOpenAI(preencher) {
  const d = await api('/api/config/openai');
  const k = d.chave;
  $('#openai-chave-estado').textContent = k.configurada ? `Configurada (termina em ${k.final}) · ${k.origem === 'ambiente' ? 'definida no servidor' : 'guardada pelo painel'}` : 'Ainda não configurada';
  $('#openai-form-chave [data-openai="apagar-chave"]').hidden = k.origem !== 'painel';
  const f = $('#openai-form-cfg');
  if (preencher) { f.modelo.value = d.config.modelo; f.maxPassos.value = d.config.maxPassos; f.maxSaida.value = d.config.maxSaida; f.limiteDiario.value = d.config.limiteDiario; f.shell.checked = d.config.shell; f.streaming.checked = d.config.streaming; }
  const pct = (u) => (u.entrada ? ` (${Math.round((u.cache / u.entrada) * 100)}% do cache)` : '');
  $('#openai-uso').innerHTML = `<div><dt>Hoje</dt><dd>${numeroBR(d.uso.hoje.entrada)} tokens de entrada${pct(d.uso.hoje)} · ${numeroBR(d.uso.hoje.saida)} de saída</dd></div>
    <div><dt>Total (90 dias)</dt><dd>${numeroBR(d.uso.total.entrada)} de entrada${pct(d.uso.total)} · ${numeroBR(d.uso.total.saida)} de saída</dd></div>`;
}
async function salvarChaveOpenAI(e) {
  e.preventDefault();
  const f = e.target; const erro = $('#openai-erro-chave'); erro.textContent = '';
  const b = f.querySelector('.botao-salvar'); b.disabled = true; b.textContent = 'Testando…';
  const r = await fetch('/api/config/openai/chave', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chave: f.chave.value }) });
  b.disabled = false; b.textContent = 'Testar e guardar';
  if (r.status === 401) return mostrarLogin();
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { erro.textContent = j.erro || 'Não consegui guardar a chave.'; return; }
  f.chave.value = ''; pintarOpenAI(false); buscarModelosOpenAI();
}
async function buscarModelosOpenAI() {
  const erro = $('#openai-erro-cfg'); erro.textContent = '';
  const r = await fetch('/api/config/openai/modelos');
  if (r.status === 401) return mostrarLogin();
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { erro.textContent = j.erro || 'Não consegui buscar os modelos.'; return; }
  $('#openai-modelos').innerHTML = j.modelos.map((m) => `<option value="${esc(m)}"></option>`).join('');
  erro.textContent = j.modelos.length ? `${j.modelos.length} modelos de texto disponíveis na sua conta. Clique no campo Modelo pra escolher.` : 'Nenhum modelo de texto encontrado na sua conta.';
}
async function salvarCfgOpenAI(e) {
  e.preventDefault();
  const f = e.target; const erro = $('#openai-erro-cfg'); erro.textContent = '';
  const r = await fetch('/api/config/openai', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ modelo: f.modelo.value, maxPassos: Number(f.maxPassos.value), maxSaida: Number(f.maxSaida.value), limiteDiario: Number(f.limiteDiario.value), shell: f.shell.checked, streaming: f.streaming.checked }) });
  if (r.status === 401) return mostrarLogin();
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { erro.textContent = j.erro || 'Não consegui salvar.'; return; }
  const b = f.querySelector('.botao-salvar'); b.textContent = 'Salvo ✓'; setTimeout(() => { b.textContent = 'Salvar'; }, 1500);
  pintarOpenAI(false);
}
$('#folha-openai')?.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-openai]'); if (!b) return;
  if (b.dataset.openai === 'modelos') await buscarModelosOpenAI();
  if (b.dataset.openai === 'apagar-chave' && confirm('Remover a chave guardada pelo painel? Conversas com este motor deixam de funcionar até você colocar outra.')) {
    await api('/api/config/openai/chave', { method: 'PUT', body: JSON.stringify({ apagar: true }) }); pintarOpenAI(false);
  }
});

// ---------- backup do cérebro ----------
const tamanhoBR = (n) => (n >= 1e9 ? `${(n / 1e9).toFixed(1)} GB` : n >= 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`);
const quandoCompleto = (ms) => new Date(ms).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
async function abrirBackup() {
  const corpo = $('#backup-corpo');
  if (!corpo.firstElementChild) {
    corpo.innerHTML = `
      <form id="backup-cfg" class="config-cartao agenda-form">
        <div class="config-cabeca"><span class="config-icone azul">${ic('backup')}</span><div class="config-titulo"><b>Backup automático</b><span>Todo dia, no horário de Brasília, guardado neste servidor</span></div></div>
        <label class="agenda-check"><input type="checkbox" name="auto"> Ligar o backup automático</label>
        <div class="agenda-linha">
          <label>Horário<input type="time" name="hora" required></label>
          <label>Guardar os últimos<input type="number" name="manter" min="1" max="60" step="1" required></label>
        </div>
        <label class="agenda-check"><input type="checkbox" name="midia"> Incluir imagens e vídeos (o arquivo fica bem maior)</label>
        <p class="login-erro" role="alert"></p>
        <div class="config-botoes"><button type="submit" class="botao-leve botao-salvar">Salvar</button></div>
      </form>
      <div id="backup-lista" class="agenda-lista"></div>`;
    $('#backup-cfg').addEventListener('submit', salvarConfigBackup);
  }
  $('#folha-backup').hidden = false; pintarDock();
  await pintarBackup(true);
  clearInterval(abrirBackup.t);
  abrirBackup.t = setInterval(() => { if ($('#folha-backup').hidden) clearInterval(abrirBackup.t); else pintarBackup(false).catch(() => {}); }, 4000);
}
function fecharBackup() { $('#folha-backup').hidden = true; clearInterval(abrirBackup.t); pintarDock(); }
async function salvarConfigBackup(e) {
  e.preventDefault();
  const f = e.target; const erro = f.querySelector('.login-erro'); erro.textContent = '';
  const r = await fetch('/api/backup/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ auto: f.auto.checked, hora: f.hora.value, manter: Number(f.manter.value), midia: f.midia.checked }) });
  if (r.status === 401) return mostrarLogin();
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { erro.textContent = j.erro || 'Não consegui salvar.'; return; }
  erro.textContent = ''; const b = f.querySelector('.botao-salvar'); b.textContent = 'Salvo ✓'; setTimeout(() => { b.textContent = 'Salvar'; }, 1500);
  pintarBackup(false);
}
async function pintarBackup(preencherForm) {
  const d = await api('/api/backup');
  const f = $('#backup-cfg');
  if (f && preencherForm) { f.auto.checked = d.config.auto; f.hora.value = d.config.hora; f.manter.value = d.config.manter; f.midia.checked = d.config.midia; }
  const u = d.ultima;
  const raiz = $('#backup-lista');
  raiz.innerHTML = `
    <article class="config-cartao">
      <dl class="config-linhas">
        <div><dt>Próximo automático</dt><dd>${d.proxima ? esc(quandoCompleto(d.proxima)) : 'desligado'}</dd></div>
        <div><dt>Último backup</dt><dd>${d.rodando ? 'rodando agora…' : u ? `${esc(quandoCompleto(u.quando))} · ${u.ok ? `ok (${esc(tamanhoBR(u.tamanho))})` : '<span style="color:#ff3b30">falhou</span>'}` : 'nenhum ainda'}</dd></div>
        ${d.livre != null ? `<div><dt>Espaço livre no servidor</dt><dd>${esc(tamanhoBR(d.livre))}</dd></div>` : ''}
      </dl>
      ${u && !u.ok ? '<p class="agenda-resumo" id="backup-erro"></p>' : ''}
      <div class="config-botoes">
        <a class="botao-leve botao-salvar" href="/api/backup/baixar?midia=${d.config.midia ? 1 : 0}" download>Baixar agora</a>
        <button class="botao-leve" type="button" data-backup="criar" ${d.rodando ? 'disabled' : ''}>Criar backup no servidor</button>
      </div>
      <p class="config-dica">"Baixar agora" gera o arquivo na hora e manda direto pro seu computador, sem ocupar espaço aqui.</p>
    </article>
    <article class="config-cartao">
      <div class="config-titulo"><b>Backups guardados no servidor</b><span>${d.backups.length ? `${d.backups.length} arquivo${d.backups.length > 1 ? 's' : ''}` : 'nenhum'}</span></div>
      ${d.backups.map((b) => `<div class="backup-item" data-nome="${esc(b.nome)}"><div><b>${esc(quandoCompleto(b.quando))}</b><span>${esc(tamanhoBR(b.tamanho))}</span></div>
        <a class="botao-leve" href="/api/backup/arquivo?nome=${encodeURIComponent(b.nome)}" download>Baixar</a>
        <button class="botao-leve" type="button" data-backup="excluir">Excluir</button></div>`).join('')}
      <p class="config-dica">Estes backups ficam no mesmo disco do cérebro: se o servidor se perder, eles se perdem junto. <b>Baixe de vez em quando uma cópia pro seu computador.</b></p>
      <p class="config-dica">Pra restaurar: <code>mkdir restaurado &amp;&amp; tar -xzf cerebro-AAAAMMDD-HHMMSS.tar.gz -C restaurado</code>, confira o conteúdo e copie o que precisar de volta.</p>
    </article>`;
  if (u && !u.ok) $('#backup-erro').textContent = u.erro || '';
}
$('#folha-backup')?.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-backup]'); if (!b) return;
  if (b.dataset.backup === 'criar') { b.disabled = true; await api('/api/backup/criar', { method: 'POST' }); }
  if (b.dataset.backup === 'excluir') {
    const nome = b.closest('.backup-item').dataset.nome;
    if (!confirm('Excluir este backup do servidor? Não dá pra desfazer.')) return;
    await api(`/api/backup/arquivo?nome=${encodeURIComponent(nome)}`, { method: 'DELETE' });
  }
  pintarBackup(false);
});

function fecharConfig() { $('#folha-config').hidden = true; qrAtual = null; qrVencido = false; pintarDock(); }
async function pintarConfig() {
  const [cfg, mot, ext, wp] = await Promise.all([api('/api/config'), api('/api/config/motores'), api('/api/extras'), api('/api/config/wordpress').catch(() => ({ configurado: false }))]);
  const itemExtra = (x) => `<li class="extra"><span class="extra-logo"><img src="/logos/${esc(x.logo)}" alt=""></span>
      <span class="extra-texto"><b>${esc(x.nome)}</b><span>${esc(x.faz)}</span></span>
      ${x.instalado ? '<span class="pilula conectado">Instalado</span>' : `<button class="botao-leve" data-acao="pedir" data-pedido="${esc(x.pedido)}">${ic('conversaNova')} Pedir na conversa</button>`}</li>`;
  const w = cfg.whatsapp;
  const estados = { open: ['conectado', 'Conectado'], connecting: ['trabalhando', 'Conectando'], close: ['', 'Desconectado'], indisponivel: ['erro', 'Indisponível'] };
  const [cls, rot] = estados[w.estado] || ['', w.estado];
  if (w.estado === 'open') { qrAtual = null; qrVencido = false; }
  acessoAtual = w.acesso || acessoAtual;
  const formata = (n) => (n ? n.replace(/^(\d{2})(\d{2})(\d{4,5})(\d{4})$/, '+$1 ($2) $3-$4') : 'nenhum');
  const motorWhats = mot.motores[mot.whatsapp]?.nome || 'Claude Code';
  const pedidoDominio = 'Quero configurar um subdomínio próprio pra este servidor, com HTTPS. Me guia passo a passo.';
  const pedidoN8n = 'Conecta o n8n deste servidor no Claude Code por MCP, pra você criar e editar fluxos por aqui.';
  const escolha = (campo) => Object.entries(mot.motores).map(([id, m]) => `<button class="botao-leve ${mot[campo] === id ? 'escolhido' : ''}" data-acao="motor" data-campo="${campo}" data-valor="${id}" title="${esc(m.instalado ? m.nome : `Não instalado. ${m.login}`)}"><img class="logo-mini" src="/logos/${id}.svg" alt="">${esc(m.nome)}${m.instalado ? '' : ' ·  não instalado'}</button>`).join('');
  const faltam = Object.values(mot.motores).filter((m) => !m.instalado);
  $('#config-corpo').innerHTML = `
    <section class="config-cartao">
      <div class="config-cabeca"><span class="config-icone azul">${ic('terminal')}</span>
        <div class="config-titulo"><b>Motor de IA</b><span>Quem responde nas conversas: Claude Code, Codex (OpenAI) ou Antigravity (Google)</span></div></div>
      <dl class="config-linhas"><div><dt>Conversas novas no painel</dt><dd class="config-escolha">${escolha('padrao')}</dd></div>
        <div><dt>WhatsApp</dt><dd class="config-escolha">${escolha('whatsapp')}</dd></div></dl>
      <div class="config-botoes"><button class="botao-leve" data-acao="config-openai" type="button">Configurar OpenAI (API)</button></div>
      <p class="config-dica">Vale pras próximas conversas; as abertas seguem no motor em que começaram. No WhatsApp, a troca abre uma conversa nova.</p>
      ${Object.values(mot.motores).map((m) => `<p class="config-dica"><b>${esc(m.nome)}:</b> ${m.instalado ? '' : 'não instalado. '}${esc(m.login)}</p>`).join('')}
    </section>
    <section class="config-cartao">
      <div class="config-cabeca"><span class="config-icone verde">${ic('zap')}</span>
        <div class="config-titulo"><b>WhatsApp</b><span>Evolution API rodando neste servidor</span></div>
        <span class="pilula ${cls}">${rot}</span></div>
      <dl class="config-linhas">
        <div><dt>Número conectado</dt><dd>${esc(w.estado === 'open' ? formata(w.numero) : 'nenhum')}${w.estado === 'open' && w.nomePerfil ? ` <span class="config-sutil">${esc(w.nomePerfil)}</span>` : ''}</dd></div>
        <div><dt>Fluxo</dt><dd>WhatsApp → n8n → ${esc(motorWhats)}</dd></div>
      </dl>
      ${w.erro ? `<p class="config-dica">${esc(w.erro)}</p>` : ''}
      ${qrAtual ? `<div class="qr"><img alt="QR do WhatsApp" src="${qrAtual}"></div><p class="config-dica" style="text-align:center">No celular: WhatsApp › Aparelhos conectados › Conectar aparelho. O código se renova sozinho.</p>` : ''}
      ${qrVencido ? '<p class="config-dica">O QR venceu antes da leitura. Gere outro e escaneie em seguida.</p>' : ''}
      <div class="config-botoes">
        ${w.estado === 'open'
          ? `<button class="botao-leve" data-acao="whats-desconectar">${ic('parar')} Desconectar</button>`
          : qrAtual
            ? `<button class="botao-leve" data-acao="whats-conectar" data-novo="1">${ic('recarregar')} Gerar outro QR</button>`
            : `<button class="botao-leve" data-acao="whats-conectar" ${w.configurado ? '' : 'disabled'}>${ic('zap')} Conectar WhatsApp</button>
               ${w.estado === 'connecting' ? `<button class="botao-leve" data-acao="whats-conectar" data-novo="1">${ic('recarregar')} Zerar e gerar outro</button>` : ''}`}
      </div>
      <div class="acesso">
        <div class="acesso-titulo"><b>Quem pode dar ordens</b><span>Só esses números são atendidos. Mensagem de qualquer outro é ignorada.</span></div>
        <label class="acesso-voce"><input type="checkbox" id="acesso-voce" ${acessoAtual.chatVoce ? 'checked' : ''}> Chat "Você" do número conectado</label>
        <div class="acesso-lista">${acessoAtual.numeros.map((n) => `<span class="acesso-num">${esc(formata(n))}<button class="acesso-tirar" data-acao="acesso-remover" data-n="${esc(n)}" title="Tirar">${ic('fechar')}</button></span>`).join('') || '<span class="config-sutil">Nenhum outro número autorizado.</span>'}</div>
        <div class="acesso-novo"><input id="acesso-novo" inputmode="tel" placeholder="DDD + número, ex.: 27 99999-9999"><button class="botao-leve" data-acao="acesso-adicionar">${ic('mais')} Autorizar</button></div>
        <p class="config-dica">Exemplo: conecte o número business aqui e autorize o seu número pessoal. Você manda mensagem do pessoal pro business e o cérebro responde lá.</p>
      </div>
    </section>
    ${cartaoWordPress(wp)}
    <section class="config-cartao">
      <div class="config-cabeca"><span class="config-icone azul">${ic('raio')}</span>
        <div class="config-titulo"><b>Aplicações extras</b><span>Programas que deixam o cérebro fazer mais coisas neste servidor</span></div></div>
      <ul class="extras">${ext.aplicacoes.map(itemExtra).join('')}</ul>
      <p class="config-dica">"Pedir na conversa" abre uma conversa com o pedido escrito. Aperte Enter e o Claude instala.</p>
    </section>
    <section class="config-cartao">
      <div class="config-cabeca"><span class="config-icone laranja">${ic('fluxo')}</span>
        <div class="config-titulo"><b>Conexões (MCP)</b><span>Ferramentas de fora que o Claude Code passa a usar direto</span></div></div>
      <ul class="extras">${ext.mcps.map(itemExtra).join('')}</ul>
      <p class="config-dica">Se a conexão pedir chave ou login, o Claude pede na conversa e guarda fora do cérebro, só neste servidor.</p>
    </section>
    <section class="config-cartao">
      <div class="config-cabeca"><span class="config-icone laranja">${ic('fluxo')}</span>
        <div class="config-titulo"><b>n8n</b><span>Automações que trabalham junto com o cérebro</span></div></div>
      <p class="config-dica">O n8n se conecta ao Claude Code por MCP, direto numa conversa. É só pedir.</p>
      <div class="config-botoes">
        ${cfg.n8n.url ? `<a class="botao-leve" href="${esc(cfg.n8n.url)}" target="_blank" rel="noopener">${ic('fluxo')} Abrir n8n</a>` : ''}
        <button class="botao-leve" data-acao="pedir" data-pedido="${esc(pedidoN8n)}">${ic('conversaNova')} Pedir numa conversa</button>
      </div>
    </section>
    <section class="config-cartao">
      <div class="config-cabeca"><span class="config-icone azul">${ic('globo')}</span>
        <div class="config-titulo"><b>Endereço</b><span>Como você acessa este painel</span></div></div>
      <dl class="config-linhas"><div><dt>Agora</dt><dd>${esc(cfg.servidor.painel)}</dd></div></dl>
      <p class="config-dica">Quer usar seu domínio (ex.: <code>cerebro.seusite.com</code>) com cadeado de HTTPS? Abra uma conversa e peça. O Claude te guia no DNS e configura o servidor.</p>
      <div class="config-botoes"><button class="botao-leve" data-acao="pedir" data-pedido="${esc(pedidoDominio)}">${ic('conversaNova')} Pedir numa conversa</button></div>
    </section>`;
}
// ---------- WordPress ----------
const PEDIDO_WP = 'Escreve um post pro meu blog sobre "3 tarefas que a IA faz por mim todo dia", no meu estilo, e manda pro WordPress como rascunho usando a skill wordpress. Me devolve o link de edição.';
const STATUS_WP = { draft: 'rascunho', publish: 'publicado', future: 'agendado', pending: 'em revisão', private: 'privado' };
function cartaoWordPress(wp) {
  const cabeca = `<div class="config-cabeca"><span class="extra-logo"><img src="/logos/wordpress.svg" alt="" width="22" height="22"></span>
    <div class="config-titulo"><b>WordPress</b><span>Publica os posts do cérebro no seu site</span></div>
    <span class="pilula ${wp.configurado ? 'conectado' : ''}">${wp.configurado ? 'Conectado' : 'Desconectado'}</span></div>`;
  if (wp.configurado) return `<section class="config-cartao" id="wp-cartao">${cabeca}
    <dl class="config-linhas">
      <div><dt>Site</dt><dd><a href="${esc(wp.url)}" target="_blank" rel="noopener">${esc(wp.url.replace(/^https?:\/\//, ''))}</a></dd></div>
      <div><dt>Usuário</dt><dd>${esc(wp.usuario)}${wp.nome && wp.nome !== wp.usuario ? ` <span class="config-sutil">${esc(wp.nome)}</span>` : ''} · senha terminando em ${esc(wp.final)}${wp.origem === 'ambiente' ? ' · definida no servidor' : ''}</dd></div>
    </dl>
    <div id="wp-posts"></div>
    <div class="config-botoes">
      <button class="botao-leve" data-acao="pedir" data-pedido="${esc(PEDIDO_WP)}">${ic('conversaNova')} Pedir um post numa conversa</button>
      <button class="botao-leve" data-wp="posts" type="button">Ver últimos posts</button>
      ${wp.origem === 'painel' ? '<button class="botao-leve" data-wp="desconectar" type="button">Desconectar</button>' : ''}
    </div>
    <p class="config-dica">Peça numa conversa ("posta esse artigo no blog", "agenda o post pra sexta 9h") ou abra uma nota <code>.md</code> e clique em <b>WordPress</b> pra mandar como rascunho. Sem você pedir pra publicar, tudo vai como rascunho.</p>
  </section>`;
  return `<section class="config-cartao" id="wp-cartao">${cabeca}
    <form id="wp-form" class="agenda-form">
      <label>Endereço do site<input name="url" placeholder="https://seusite.com.br" autocomplete="off" spellcheck="false" required></label>
      <div class="agenda-linha">
        <label>Usuário<input name="usuario" autocomplete="off" spellcheck="false" required></label>
        <label>Senha de aplicativo<input name="senha" type="password" placeholder="xxxx xxxx xxxx xxxx xxxx xxxx" autocomplete="new-password" required></label>
      </div>
      <p class="login-erro" id="wp-erro" role="alert"></p>
      <div class="config-botoes"><button type="submit" class="botao-leve botao-salvar">Testar e conectar</button></div>
    </form>
    <p class="config-dica">No seu WordPress: <b>Usuários › Perfil › Senhas de aplicativo</b>, dê um nome (ex.: Core OS) e clique em <b>Adicionar</b>. Cole aqui a senha gerada (não é a sua senha de login). O usuário precisa ser Autor, Editor ou Administrador e o site precisa estar em HTTPS. A conexão é testada antes de ser guardada neste servidor e a senha nunca volta pra esta tela.</p>
  </section>`;
}
async function conectarWordPress(e) {
  e.preventDefault();
  const f = e.target; const erro = $('#wp-erro'); erro.textContent = '';
  const b = f.querySelector('.botao-salvar'); b.disabled = true; b.textContent = 'Testando…';
  try {
    const r = await fetch('/api/config/wordpress', { method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: f.url.value, usuario: f.usuario.value, senha: f.senha.value }) });
    if (r.status === 401) return mostrarLogin();
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { erro.textContent = j.erro || 'Não consegui conectar.'; return; }
    if (j.podePublicar === false) alert('Conectado. Esse usuário só pode salvar rascunhos e mandar pra revisão: publicar direto exige Editor ou Administrador.');
    pintarConfig();
  } catch { erro.textContent = 'Sem conexão com o painel.'; } finally { b.disabled = false; b.textContent = 'Testar e conectar'; }
}
document.addEventListener('submit', (e) => { if (e.target.id === 'wp-form') conectarWordPress(e); });
$('#folha-config')?.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-wp]'); if (!b) return;
  if (b.dataset.wp === 'desconectar') {
    if (!confirm('Desconectar o WordPress? O cérebro deixa de publicar até você conectar de novo. (Revogue também a senha de aplicativo no WordPress, se não for mais usar.)')) return;
    await api('/api/config/wordpress', { method: 'PUT', body: JSON.stringify({ apagar: true }) }); pintarConfig();
  }
  if (b.dataset.wp === 'posts') {
    const caixa = $('#wp-posts'); b.disabled = true; caixa.innerHTML = '<p class="config-dica">Buscando…</p>';
    try {
      const r = await fetch('/api/wordpress/posts?n=8'); const j = await r.json();
      if (!r.ok) throw new Error(j.erro);
      caixa.innerHTML = j.posts.length ? `<ul class="extras">${j.posts.map((p) => `<li class="extra"><span class="extra-texto"><b>${esc(p.titulo || '(sem título)')}</b>
        <span>${esc(STATUS_WP[p.status] || p.status)} · ${esc(new Date(p.data).toLocaleDateString('pt-BR'))}</span></span>
        <a class="botao-leve" href="${esc(p.status === 'publish' ? p.link : p.editar)}" target="_blank" rel="noopener">${p.status === 'publish' ? 'Ver' : 'Editar'}</a></li>`).join('')}</ul>` : '<p class="config-dica">Nenhum post ainda.</p>';
    } catch (err) { caixa.innerHTML = `<p class="login-erro">${esc(err.message || 'Não consegui ler os posts.')}</p>`; } finally { b.disabled = false; }
  }
});
async function mandarProWordPress(botao, caminho) {
  if (!confirm(`Mandar "${nomeDe(caminho)}" pro WordPress como rascunho?\n\nTítulo, categorias, tags e imagem destacada vêm do frontmatter da nota (ou do primeiro "# Título"). As imagens da nota sobem junto.`)) return;
  botao.disabled = true; const antes = botao.textContent; botao.textContent = 'Enviando…';
  try {
    const r = await fetch('/api/wordpress/publicar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ arquivo: caminho, status: 'draft' }) });
    if (r.status === 401) return mostrarLogin();
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert(j.erro || 'Não consegui mandar pro WordPress.'); return; }
    if (confirm(`Rascunho salvo no WordPress (post ${j.id}). Abrir pra revisar e publicar?`)) window.open(j.editar, '_blank', 'noopener');
  } finally { botao.disabled = false; botao.textContent = antes; }
}

async function conectarWhats(botao) {
  botao.disabled = true; qrVencido = false;
  try {
    const r = await api('/api/config/whatsapp/conectar', { method: 'POST', body: JSON.stringify({ novo: botao.dataset.novo === '1' }) });
    qrAtual = r.qr || null;
    if (r.estado !== 'open' && !r.qr) alert(r.erro || 'A Evolution não devolveu o QR. Tente "Zerar e gerar outro".');
  } catch (e) { alert(`Não consegui gerar o QR: ${e.message}`); } finally { pintarConfig(); }
}
async function desconectarWhats() {
  if (!confirm('Desconectar o WhatsApp deste cérebro? Pra conectar outro número, é só gerar o QR de novo depois.')) return;
  await api('/api/config/whatsapp/desconectar', { method: 'POST' }); qrAtual = null; pintarConfig();
}
async function salvarAcesso(mudar) {
  const a = { numeros: [...acessoAtual.numeros], chatVoce: acessoAtual.chatVoce };
  mudar(a);
  acessoAtual = await api('/api/config/whatsapp/acesso', { method: 'POST', body: JSON.stringify(a) });
  pintarConfig();
}
function autorizarNumero() {
  const campo = $('#acesso-novo'); const d = campo.value.replace(/\D/g, '');
  if (d.length < 10 || d.length > 13) { campo.focus(); campo.classList.add('invalido'); return; }
  campo.value = '';
  salvarAcesso((a) => { a.numeros.push(d); });
}
document.addEventListener('change', (e) => { if (e.target.id === 'acesso-voce') salvarAcesso((a) => { a.chatVoce = e.target.checked; }); });
document.addEventListener('keydown', (e) => { if (e.target.id === 'acesso-novo') { e.target.classList.remove('invalido'); if (e.key === 'Enter') autorizarNumero(); } });

// ---------- início ----------
async function iniciar() {
  $('#app').hidden = false;
  document.querySelector('[data-acao="recarregar-arvore"]').innerHTML = ic('recarregar');
  document.querySelector('.conversas-topo [data-acao="nova-conversa"]').innerHTML = ic('mais');
  document.querySelectorAll('.folha-topo .icone-botao').forEach((b) => { b.innerHTML = ic('fechar'); });
  $('[data-acao="conteudos-voltar"]').innerHTML = ic('voltar');
  $('.visor-acoes [data-acao="fechar-visor"]').innerHTML = ic('fechar');
  $('.visor-nav.ant').innerHTML = ic('voltar'); $('.visor-nav.prox').innerHTML = ic('seta');
  document.querySelectorAll('.ic-enviar').forEach((x) => { x.innerHTML = ic('enviar'); });
  document.querySelectorAll('.ic-baixar').forEach((x) => { x.innerHTML = ic('baixar'); });
  if (recuperar('arvoreFechada', false)) $('#arvore').classList.add('fechado');
  pintarDock();
  await Promise.all([carregarArvore(), atualizarEstado(), pintarComece()]);
  desenharEspaco();
  setInterval(() => atualizarEstado().catch(() => {}), 2000);
  setInterval(() => carregarArvoreSeMudou().catch(() => {}), 6000);
}
let assinaturaArvore = '';
async function carregarArvoreSeMudou() {
  const dados = await api('/api/arvore');
  const ass = JSON.stringify(dados);
  if (ass === assinaturaArvore) return;
  const primeira = !assinaturaArvore;
  assinaturaArvore = ass;
  if (!primeira) { const raiz = $('#arvore-lista'); raiz.innerHTML = ''; raiz.append(montarNos(dados)); }
}

fetch('/api/eu').then((r) => r.json()).then((r) => (r.logado ? iniciar() : mostrarLogin()));
