// Core OS · painel web do segundo cérebro.
// Serve a árvore de arquivos, abre conversas reais do Claude Code (um terminal por conversa)
// e acompanha nota de status, subagentes e mídias geradas de cada conversa.
import express from 'express';
import { WebSocketServer } from 'ws';
import pty from '@homebridge/node-pty-prebuilt-multiarch';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalogo, PRIMEIROS_TESTES } from './extras.js';
import { MOTORES, motorDe, disponiveis, comandoTerminal, rodarSemTela, vincularCodex, lerCodex } from './motores.js';
import { iniciarOpenAI, lerConfigOpenAI, gravarConfigOpenAI, estadoChave, salvarChave, apagarChave, testarChave, listarModelos, usoOpenAI, historicoOpenAI, pararOpenAI } from './openai.js';

const AQUI = path.dirname(fileURLToPath(import.meta.url));

// ---------- configuração ----------
carregarEnv(process.env.CORE_OS_ENV || '/opt/core-os/.env');
const CFG = {
  porta: Number(process.env.CORE_OS_PORT || 3000),
  host: process.env.CORE_OS_HOST || '127.0.0.1',
  vault: fs.realpathSync(path.resolve(process.env.CORE_OS_VAULT || path.join(AQUI, '..', 'cerebro-demo'))),
  dados: path.resolve(process.env.CORE_OS_DATA || path.join(AQUI, 'data')),
  senha: process.env.CORE_OS_PASSWORD || '',
  tokenPonte: process.env.CORE_OS_HOOK_TOKEN || '',
  claude: process.env.CLAUDE_BIN || 'claude',
};
fs.mkdirSync(CFG.dados, { recursive: true });
iniciarOpenAI({ dados: CFG.dados, vault: CFG.vault });
if (!CFG.senha) {
  CFG.senha = crypto.randomBytes(9).toString('base64url');
  console.log(`\n  CORE_OS_PASSWORD não definida. Senha desta execução: ${CFG.senha}\n`);
}
const PROJETOS = path.join(os.homedir(), '.claude', 'projects', CFG.vault.replace(/[^a-zA-Z0-9]/g, '-'));
const MIDIA = /\.(png|jpe?g|webp|gif|svg|mp4|mov|webm|m4v)$/i;

function carregarEnv(arquivo) {
  try {
    for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
    }
  } catch { /* sem .env: segue com o ambiente */ }
}

// ---------- persistência simples em JSON ----------
const arq = (n) => path.join(CFG.dados, n);
const ler = (n, padrao) => { try { return JSON.parse(fs.readFileSync(arq(n), 'utf8')); } catch { return padrao; } };
const gravar = (n, v) => fs.writeFileSync(arq(n), JSON.stringify(v, null, 2));

// ---------- autenticação ----------
const VALIDADE_LOGIN = 30 * 24 * 3600 * 1000;
const hash = (s) => crypto.createHash('sha256').update(String(s)).digest();
const hashHex = (s) => hash(s).toString('hex');
// guarda só o hash do token (nunca o token) e a data de validade; aceita o formato antigo (lista de tokens)
const sessoesLogin = new Map();
for (const item of ler('logins.json', [])) {
  if (typeof item === 'string') sessoesLogin.set(hashHex(item), Date.now() + VALIDADE_LOGIN);
  else if (item?.h && item.ate > Date.now()) sessoesLogin.set(item.h, item.ate);
}
const salvarLogins = () => gravar('logins.json', [...sessoesLogin].map(([h, ate]) => ({ h, ate })).slice(-50));
const falhas = new Map(); // ip -> [timestamps]
setInterval(() => { // não deixa o mapa de falhas crescer sem fim
  const agora = Date.now();
  for (const [ip, ts] of falhas) if (!ts.some((t) => agora - t < 60_000)) falhas.delete(ip);
  for (const [h, ate] of sessoesLogin) if (ate < agora) sessoesLogin.delete(h);
}, 600_000).unref();
function cookies(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((c) => {
    const i = c.indexOf('=');
    return i < 0 ? [] : [c.slice(0, i).trim(), c.slice(i + 1).trim()];
  }).filter((p) => p[0]));
}
const logado = (req) => {
  const ate = sessoesLogin.get(hashHex(cookies(req).coreos || ''));
  return Boolean(ate && ate > Date.now());
};

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');
app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.set({ 'X-Frame-Options': 'DENY', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  // arquivos do cérebro são conteúdo não confiável: sem script mesmo se abertos direto (SVG/HTML)
  if (req.path === '/api/arquivo' || req.path === '/api/capa') res.set('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'");
  next();
});

app.post('/api/login', (req, res) => {
  const ip = req.ip;
  const agora = Date.now();
  const recentes = (falhas.get(ip) || []).filter((t) => agora - t < 60_000);
  if (recentes.length >= 5) return res.status(429).json({ erro: 'Muitas tentativas. Espere 1 minuto.' });
  if (!crypto.timingSafeEqual(hash(req.body?.senha || ''), hash(CFG.senha))) {
    falhas.set(ip, [...recentes, agora]);
    return res.status(401).json({ erro: 'Senha errada.' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  sessoesLogin.set(hashHex(token), Date.now() + VALIDADE_LOGIN);
  salvarLogins();
  const seguro = req.secure ? '; Secure' : '';
  res.set('Set-Cookie', `coreos=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${seguro}`);
  res.json({ ok: true });
});

app.post('/api/logout', (req, res) => {
  sessoesLogin.delete(hashHex(cookies(req).coreos || ''));
  salvarLogins();
  res.set('Set-Cookie', 'coreos=; Path=/; Max-Age=0').json({ ok: true });
});

app.get('/api/eu', (req, res) => res.json({ logado: logado(req) }));

// Ponte do WhatsApp (chamada pelo n8n com token próprio, antes do bloqueio de login).
app.post('/api/ponte/whatsapp', (req, res) => ponteWhatsapp(req, res));

app.use('/api', (req, res, next) => (logado(req) ? next() : res.status(401).json({ erro: 'Faça login.' })));

// ---------- arquivos ----------
function dentroDoVault(rel) {
  const alvo = path.resolve(CFG.vault, String(rel || '').replace(/^\/+/, ''));
  let real;
  try { real = fs.realpathSync(alvo); } catch { return null; }
  return real === CFG.vault || real.startsWith(CFG.vault + path.sep) ? real : null;
}
const OCULTOS = new Set(['.git', 'node_modules', '.DS_Store', '.obsidian', '.trash']);

function arvore(dir, rel = '', profundidade = 0) {
  if (profundidade > 8) return [];
  let itens = [];
  try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
  return itens
    .filter((d) => !OCULTOS.has(d.name) && (!d.name.startsWith('.') || d.name === '.claude'))
    .sort((a, b) => (b.isDirectory() - a.isDirectory()) || a.name.localeCompare(b.name, 'pt'))
    .map((d) => {
      const p = rel ? `${rel}/${d.name}` : d.name;
      return d.isDirectory()
        ? { nome: d.name, caminho: p, tipo: 'pasta', filhos: arvore(path.join(dir, d.name), p, profundidade + 1) }
        : { nome: d.name, caminho: p, tipo: 'arquivo' };
    });
}

app.get('/api/arvore', (req, res) => res.json(arvore(CFG.vault)));

// ---------- busca nas notas ----------
// minúsculas e sem acento, mantendo o mesmo tamanho do texto original (pra marcar o trecho achado)
const plano = (t) => Array.from(String(t), (c) => {
  const n = c.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
  if (n.length === 1) return n;
  const l = c.toLowerCase();
  return l.length === c.length ? l : c;
}).join('');
const BUSCAVEL = /\.(md|txt)$/i;

function buscar(consulta) {
  const q = plano(consulta.trim());
  const resultados = [];
  let lidos = 0;
  (function andar(lista) {
    for (const n of lista) {
      if (resultados.length >= 60 || lidos > 5000) return;
      if (n.tipo === 'pasta') { andar(n.filhos); continue; }
      if (!BUSCAVEL.test(n.nome)) continue;
      let texto = '';
      try {
        const abs = path.join(CFG.vault, n.caminho);
        if (fs.statSync(abs).size > 1_000_000) continue;
        texto = fs.readFileSync(abs, 'utf8'); lidos++;
      } catch { continue; }
      const noNome = plano(n.nome).includes(q);
      const trechos = [];
      const linhas = texto.split('\n');
      for (let i = 0; i < linhas.length && trechos.length < 3; i++) {
        const pos = plano(linhas[i]).indexOf(q);
        if (pos < 0) continue;
        const ini = Math.max(0, pos - 50);
        const corte = linhas[i].slice(ini, pos + q.length + 90);
        trechos.push({ linha: i + 1, texto: (ini > 0 ? '…' : '') + corte, de: pos - ini + (ini > 0 ? 1 : 0), ate: pos - ini + (ini > 0 ? 1 : 0) + q.length });
      }
      if (noNome || trechos.length) resultados.push({ caminho: n.caminho, nome: n.nome, noNome, trechos });
    }
  })(arvore(CFG.vault));
  // nome que bate vem primeiro
  return resultados.sort((a, b) => Number(b.noNome) - Number(a.noNome));
}

app.get('/api/busca', (req, res) => {
  const q = String(req.query.q || '');
  if (q.trim().length < 2) return res.json([]);
  if (q.length > 100) return res.status(400).json({ erro: 'Busca longa demais.' });
  res.json(buscar(q));
});

app.get('/api/arquivo', (req, res) => {
  const real = dentroDoVault(req.query.caminho);
  if (!real || !fs.statSync(real).isFile()) return res.status(404).json({ erro: 'Arquivo não encontrado.' });
  if (req.query.baixar) return res.download(real, path.basename(real), { dotfiles: 'allow' });
  res.sendFile(real, { dotfiles: 'allow', headers: { 'Cache-Control': 'no-cache' } });
});

// ---------- editor de notas ----------
// só edita .md/.txt que já existem dentro do cérebro; `versao` (mtime) evita sobrescrever mudança feita por outra conversa
const EDITAVEL = /\.(md|txt)$/i;
const LIMITE_NOTA = 900_000;
function notaEditavel(rel) {
  const real = dentroDoVault(rel);
  if (!real || !EDITAVEL.test(real)) return null;
  const st = fs.statSync(real);
  return st.isFile() ? { real, st } : null;
}
app.get('/api/nota', (req, res) => {
  const n = notaEditavel(req.query.caminho);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada (só .md e .txt podem ser editados).' });
  if (n.st.size > LIMITE_NOTA) return res.status(413).json({ erro: 'Nota grande demais para o editor.' });
  res.json({ conteudo: fs.readFileSync(n.real, 'utf8'), versao: n.st.mtimeMs });
});
app.put('/api/nota', (req, res) => {
  const { caminho, conteudo, versao, forcar } = req.body || {};
  const n = notaEditavel(caminho);
  if (!n) return res.status(404).json({ erro: 'Nota não encontrada (só .md e .txt podem ser editados).' });
  if (typeof conteudo !== 'string') return res.status(400).json({ erro: 'Conteúdo inválido.' });
  if (Buffer.byteLength(conteudo) > LIMITE_NOTA) return res.status(413).json({ erro: 'Nota grande demais.' });
  if (!forcar && n.st.mtimeMs !== versao) return res.status(409).json({ erro: 'A nota mudou no servidor desde que você abriu.' });
  const tmp = `${n.real}.${process.pid}.salvando`;
  try {
    fs.writeFileSync(tmp, conteudo, { mode: n.st.mode & 0o777 });
    fs.renameSync(tmp, n.real);
  } catch (e) {
    try { fs.unlinkSync(tmp); } catch { /* */ }
    return res.status(500).json({ erro: 'Não consegui salvar.' });
  }
  res.json({ ok: true, versao: fs.statSync(n.real).mtimeMs });
});

// ---------- conteúdos (pastas com capa, download e envio) ----------
const IMAGEM = /\.(png|jpe?g|webp|gif|svg)$/i;
const VIDEO = /\.(mp4|mov|webm|m4v)$/i;
const IGNORAR = (n) => n.startsWith('.') || n === 'CLAUDE.md' || n === 'AGENTS.md';

// todos os arquivos dentro de uma pasta (recursivo), com caminho relativo ao vault
function arquivosDe(absDir, relDir) {
  const lista = [];
  (function andar(dir, rel) {
    let itens = [];
    try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const d of itens) {
      if (IGNORAR(d.name)) continue;
      const abs = path.join(dir, d.name); const r = `${rel}/${d.name}`;
      if (d.isDirectory()) andar(abs, r);
      else { const st = fs.statSync(abs); lista.push({ caminho: r, nome: d.name, tamanho: st.size, mtime: st.mtimeMs }); }
    }
  })(absDir, relDir);
  return lista;
}

// a capa de um item: "capa.*" > primeira imagem da entrega > primeira imagem > vídeo mais "final"
function escolherCapa(arquivos) {
  const midia = arquivos.filter((a) => IMAGEM.test(a.nome) || VIDEO.test(a.nome)).sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt', { numeric: true }));
  const peso = (a) => (/^capa\./i.test(a.nome) ? 0 : IMAGEM.test(a.nome) && a.caminho.includes('/entrega/') ? 1 : IMAGEM.test(a.nome) && !a.caminho.includes('/original/') ? 2
    : IMAGEM.test(a.nome) ? 3 : /depois|final|editado/i.test(a.nome) ? 4 : 5);
  const c = midia.sort((a, b) => peso(a) - peso(b))[0];
  return c ? { caminho: c.caminho, tipo: IMAGEM.test(c.nome) ? 'imagem' : 'video' } : null;
}

function listarConteudos() {
  const base = path.join(CFG.vault, 'conteudo');
  let tipos = [];
  try { tipos = fs.readdirSync(base, { withFileTypes: true }).filter((d) => d.isDirectory() && !IGNORAR(d.name)); } catch { return []; }
  return tipos.map((t) => {
    const absT = path.join(base, t.name); const relT = `conteudo/${t.name}`;
    const itens = fs.readdirSync(absT, { withFileTypes: true }).filter((d) => !IGNORAR(d.name)).map((d) => {
      const rel = `${relT}/${d.name}`;
      const arquivos = d.isDirectory() ? arquivosDe(path.join(absT, d.name), rel) : [(() => { const st = fs.statSync(path.join(absT, d.name)); return { caminho: rel, nome: d.name, tamanho: st.size, mtime: st.mtimeMs }; })()];
      return { nome: d.name, caminho: rel, pasta: d.isDirectory(), arquivos: arquivos.length,
        mtime: Math.max(0, ...arquivos.map((a) => a.mtime)), capa: escolherCapa(arquivos) };
    }).sort((a, b) => b.mtime - a.mtime);
    return { nome: t.name, caminho: relT, itens, mtime: Math.max(0, ...itens.map((i) => i.mtime)) };
  }).sort((a, b) => b.mtime - a.mtime);
}
app.get('/api/conteudos', (req, res) => res.json(listarConteudos()));

app.get('/api/pasta', (req, res) => {
  const real = dentroDoVault(req.query.caminho);
  if (!real || !fs.statSync(real).isDirectory()) return res.status(404).json({ erro: 'Pasta não encontrada.' });
  const rel = path.relative(CFG.vault, real).split(path.sep).join('/');
  res.json(arquivosDe(real, rel).sort((a, b) => a.caminho.localeCompare(b.caminho, 'pt', { numeric: true })));
});

// capa de vídeo: um quadro em JPG, gerado uma vez pelo ffmpeg e guardado no cache
const CAPAS = path.join(CFG.dados, 'capas'); fs.mkdirSync(CAPAS, { recursive: true });
const gerando = new Map();
const enviados = new Set(); // arquivos que vieram do computador do dono: não viram card de conversa
app.get('/api/capa', async (req, res) => {
  const real = dentroDoVault(req.query.caminho);
  if (!real || !VIDEO.test(real)) return res.status(404).end();
  const st = fs.statSync(real);
  const destino = path.join(CAPAS, crypto.createHash('sha1').update(`${real}:${st.mtimeMs}`).digest('hex') + '.jpg');
  if (!fs.existsSync(destino)) {
    if (!gerando.has(destino)) gerando.set(destino, new Promise((ok) => {
      const f = spawn('ffmpeg', ['-y', '-ss', '1', '-i', real, '-frames:v', '1', '-vf', 'scale=480:-2', '-q:v', '4', destino], { stdio: 'ignore' });
      f.on('error', () => ok()); f.on('close', () => ok());
    }).finally(() => gerando.delete(destino)));
    await gerando.get(destino);
  }
  if (!fs.existsSync(destino)) return res.status(404).end();
  res.sendFile(destino, { dotfiles: 'allow', headers: { 'Cache-Control': 'private, max-age=86400' } });
});

// envio de arquivo do computador pro servidor (corpo cru, um arquivo por requisição)
app.post('/api/enviar', (req, res) => {
  const pedida = path.resolve(CFG.vault, String(req.query.pasta || 'conteudo/enviados').replace(/^\/+/, ''));
  if (pedida.startsWith(CFG.vault + path.sep) && !fs.existsSync(pedida)) fs.mkdirSync(pedida, { recursive: true });
  const pasta = dentroDoVault(path.relative(CFG.vault, pedida));
  if (!pasta || !fs.statSync(pasta).isDirectory()) return res.status(400).json({ erro: 'Pasta inválida.' });
  let nome = path.basename(String(req.query.nome || '')).replace(/[\/\\\0]/g, '').trim();
  if (!nome || nome.startsWith('.')) return res.status(400).json({ erro: 'Nome de arquivo inválido.' });
  const ext = path.extname(nome); const raiz = nome.slice(0, nome.length - ext.length);
  for (let i = 2; fs.existsSync(path.join(pasta, nome)); i++) nome = `${raiz}-${i}${ext}`;
  const destino = path.join(pasta, nome); const tmp = `${destino}.enviando`;
  const LIMITE = Number(process.env.CORE_OS_MAX_UPLOAD_MB || 500) * 1024 * 1024;
  if (Number(req.headers['content-length'] || 0) > LIMITE) return res.status(413).json({ erro: 'Arquivo grande demais.' });
  const out = fs.createWriteStream(tmp);
  let recebido = 0;
  req.on('data', (c) => { recebido += c.length; if (recebido > LIMITE) { req.unpipe(out); out.destroy(); try { fs.unlinkSync(tmp); } catch { /* */ } if (!res.headersSent) res.status(413).json({ erro: 'Arquivo grande demais.' }); } });
  req.pipe(out);
  out.on('finish', () => { fs.renameSync(tmp, destino); enviados.add(path.relative(CFG.vault, destino).split(path.sep).join('/')); res.json({ caminho: path.relative(CFG.vault, destino).split(path.sep).join('/') }); });
  const erro = () => { try { fs.unlinkSync(tmp); } catch { /* */ } if (!res.headersSent) res.status(500).json({ erro: 'Falhou no meio do envio.' }); };
  out.on('error', erro); req.on('aborted', erro);
});

// ---------- grafo (visão estilo Obsidian) ----------
function montarGrafo() {
  const nos = []; const ligacoes = []; const porNome = new Map(); const existe = new Set();
  (function andar(lista, pai) {
    for (const n of lista) {
      if (n.caminho.startsWith('.claude/hooks') || n.caminho === 'sessoes' || n.caminho.startsWith('sessoes/')) continue;
      const tipo = n.tipo === 'pasta' ? 'pasta' : /\.md$/i.test(n.nome) ? 'nota' : MIDIA.test(n.nome) ? 'midia' : 'outro';
      if (tipo === 'outro') continue;
      nos.push({ id: n.caminho, nome: n.nome.replace(/\.md$/i, ''), tipo });
      existe.add(n.caminho);
      if (tipo !== 'pasta') { const b = n.nome.replace(/\.md$/i, '').toLowerCase(); if (!porNome.has(b)) porNome.set(b, n.caminho); }
      if (pai) ligacoes.push({ de: pai, para: n.caminho, tipo: 'pasta' });
      if (n.filhos) andar(n.filhos, n.caminho);
    }
  })(arvore(CFG.vault), null);
  for (const n of nos.filter((x) => x.tipo === 'nota')) {
    let txt = ''; try { txt = fs.readFileSync(path.join(CFG.vault, n.id), 'utf8'); } catch { continue; }
    const dir = path.posix.dirname(n.id);
    const alvos = new Set();
    for (const m of txt.matchAll(/!?\[\[([^\]|#]+)/g)) { const c = porNome.get(path.posix.basename(m[1].trim()).replace(/\.md$/i, '').toLowerCase()); if (c) alvos.add(c); }
    for (const m of txt.matchAll(/\]\(([^)#\s]+)\)/g)) { const c = path.posix.normalize(path.posix.join(dir, (() => { try { return decodeURI(m[1]); } catch { return m[1]; } })())); if (existe.has(c)) alvos.add(c); }
    for (const m of txt.matchAll(/`([^`\s]+)`/g)) { const c = m[1].replace(/\/$/, ''); if (existe.has(c)) alvos.add(c); else { const r = path.posix.normalize(path.posix.join(dir, c)); if (existe.has(r)) alvos.add(r); } }
    for (const a of alvos) if (a !== n.id) ligacoes.push({ de: n.id, para: a, tipo: 'link' });
  }
  return { nos, ligacoes };
}
app.get('/api/grafo', (req, res) => res.json(montarGrafo()));

// ---------- configurações: canais ----------
async function evo(caminho, opcoes = {}) {
  const { EVO_URL, EVO_KEY } = process.env;
  if (!EVO_URL || !EVO_KEY) throw new Error('Evolution API não configurada neste servidor.');
  const r = await fetch(`${EVO_URL}${caminho}`, { ...opcoes, headers: { apikey: EVO_KEY, 'Content-Type': 'application/json', ...(opcoes.headers || {}) } });
  const corpo = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(corpo?.response?.message?.toString() || corpo?.message || `Evolution respondeu ${r.status}`);
  return corpo;
}
const INSTANCIA = () => process.env.EVO_INSTANCE || 'cerebro';
const WEBHOOK_N8N = () => process.env.WHATS_WEBHOOK || 'http://n8n:5678/webhook/core-os-whatsapp';
const estadoWhats = async () => { const e = await evo(`/instance/connectionState/${INSTANCIA()}`); return e?.instance?.state || e?.state || 'close'; };

// a instância some se alguém apagar pela Evolution: recria com o webhook do n8n
async function garantirInstancia() {
  let existe = false;
  try {
    const lista = await evo(`/instance/fetchInstances?instanceName=${INSTANCIA()}`);
    existe = (Array.isArray(lista) ? lista : [lista]).some((i) => (i?.name || i?.instance?.instanceName) === INSTANCIA());
  } catch { /* 404: não existe */ }
  if (existe) return;
  await evo('/instance/create', { method: 'POST', body: JSON.stringify({ instanceName: INSTANCIA(), integration: 'WHATSAPP-BAILEYS', qrcode: false }) });
  await evo(`/webhook/set/${INSTANCIA()}`, { method: 'POST', body: JSON.stringify({ webhook: { enabled: true, url: WEBHOOK_N8N(), byEvents: false, base64: false, events: ['MESSAGES_UPSERT'] } }) });
}

// quem pode dar ordens pelo WhatsApp (editável em Configurações; trocar aqui não mexe em código nem no n8n)
const acessoWhats = () => {
  const a = { numeros: [], chatVoce: true, ...ler('whatsapp-acesso.json', {}) };
  if (!a.numeros.length && process.env.WHATS_DONO && !ler('whatsapp-acesso.json', null)) a.numeros = [process.env.WHATS_DONO];
  return a;
};
// número comparável: só dígitos, com 55, sem o 9 extra do celular brasileiro (o WhatsApp às vezes usa sem)
function chaveNumero(n) {
  let d = String(n || '').split('@')[0].split(':')[0].replace(/\D/g, '');
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  if (d.startsWith('55') && d.length === 13 && d[4] === '9') d = d.slice(0, 4) + d.slice(5);
  return d;
}

app.get('/api/config', async (req, res) => {
  const cfg = {
    whatsapp: { configurado: Boolean(process.env.EVO_URL && process.env.EVO_KEY), acesso: acessoWhats(), estado: 'indisponivel', numero: '' },
    n8n: { url: process.env.N8N_PUBLIC_URL || '' },
    servidor: { painel: `${req.protocol}://${req.get('host')}`, cerebro: CFG.vault },
  };
  if (cfg.whatsapp.configurado) {
    try {
      const est = await evo(`/instance/connectionState/${INSTANCIA()}`);
      cfg.whatsapp.estado = est?.instance?.state || est?.state || 'close';
      const lista = await evo(`/instance/fetchInstances?instanceName=${INSTANCIA()}`);
      const inst = (Array.isArray(lista) ? lista : [lista]).find((i) => (i.name || i.instance?.instanceName) === INSTANCIA());
      cfg.whatsapp.numero = String(inst?.ownerJid || inst?.instance?.owner || '').split('@')[0];
      cfg.whatsapp.nomePerfil = inst?.profileName || '';
    } catch (e) { cfg.whatsapp.erro = e.message; }
  }
  res.json(cfg);
});
// conectar: devolve o QR atual. novo=true zera a tentativa presa (logout) e começa outra do zero.
app.post('/api/config/whatsapp/conectar', async (req, res) => {
  try {
    meuNumeroCache = { n: '', t: 0 };
    await garantirInstancia();
    let estado = await estadoWhats();
    if (estado === 'open') return res.json({ estado });
    if (req.body?.novo && estado === 'connecting') {
      await evo(`/instance/logout/${INSTANCIA()}`, { method: 'DELETE' }).catch(() => {});
      estado = 'close';
    }
    const r = await evo(`/instance/connect/${INSTANCIA()}`);
    res.json({ qr: r.base64 || null, estado: 'connecting' });
  } catch (e) { res.status(502).json({ erro: e.message }); }
});
// o painel pergunta a cada 3s enquanto o QR está na tela: troca a imagem quando o WhatsApp gira o código
// e avisa quando conectou (ou quando o QR venceu de vez)
app.get('/api/config/whatsapp/qr', async (req, res) => {
  try {
    const estado = await estadoWhats();
    if (estado !== 'connecting') { if (estado === 'open') meuNumeroCache = { n: '', t: 0 }; return res.json({ estado }); }
    const r = await evo(`/instance/connect/${INSTANCIA()}`);
    res.json({ estado, qr: r.base64 || null });
  } catch (e) { res.status(502).json({ erro: e.message }); }
});
app.post('/api/config/whatsapp/desconectar', async (req, res) => {
  meuNumeroCache = { n: '', t: 0 };
  await evo(`/instance/logout/${INSTANCIA()}`, { method: 'DELETE' }).catch(() => {});
  try { res.json({ ok: true, estado: await estadoWhats() }); } catch (e) { res.status(502).json({ erro: e.message }); }
});
app.post('/api/config/whatsapp/acesso', (req, res) => {
  const numeros = [...new Set((Array.isArray(req.body?.numeros) ? req.body.numeros : [])
    .map((n) => String(n).replace(/\D/g, '')).filter((n) => n.length >= 10 && n.length <= 13)
    .map((n) => (n.length <= 11 ? `55${n}` : n)))].slice(0, 20);
  const acesso = { numeros, chatVoce: req.body?.chatVoce !== false };
  gravar('whatsapp-acesso.json', acesso);
  res.json(acesso);
});

// ---------- extras: aplicações, MCPs e primeiros testes (cada um vira pedido numa conversa) ----------
app.get('/api/extras', (req, res) => res.json(catalogo(CFG.vault)));
app.get('/api/primeiros-testes', (req, res) => res.json(PRIMEIROS_TESTES));

// ---------- motores de IA (Claude Code, Codex, Antigravity) ----------
const prefsMotor = () => ({ padrao: 'claude', whatsapp: 'claude', ...ler('motores.json', {}) });
app.get('/api/config/motores', (req, res) => res.json({ ...prefsMotor(), motores: disponiveis() }));
app.post('/api/config/motores', (req, res) => {
  const atual = prefsMotor();
  for (const k of ['padrao', 'whatsapp']) if (MOTORES[req.body?.[k]]) atual[k] = req.body[k];
  gravar('motores.json', atual);
  res.json(atual);
});

// ---------- conversas (um agente real por conversa, no motor escolhido) ----------
let conversas = ler('conversas.json', []);
for (const c of conversas) c.processando = false; // painel reiniciou: nada está rodando
const vivos = new Map(); // id -> { proc, buffer, clientes:Set }
const salvarConversas = () => gravar('conversas.json', conversas);

function promptSistema(id) {
  return [
    'Você está rodando dentro do painel do Core OS.',
    `A nota de status desta conversa é sessoes/${id}.md (caminho relativo à pasta do cérebro).`,
    'Siga o CLAUDE.md §6: crie essa nota na primeira ação de qualquer tarefa, com título, resumo de 1 ou 2 frases e checklist, e marque cada etapa ao terminar.',
  ].join(' ');
}

// Ambiente limpo: sem segredos do painel e sem variáveis de uma sessão-mãe do Claude Code
// (elas fazem o filho se achar subsessão e não gravar histórico).
function envLimpo(extra = {}) {
  // WHATS_PARA: pra quem vai o "me manda no zap" (quem falou pelo WhatsApp, ou o primeiro número autorizado)
  const env = { ...process.env, WHATS_PARA: acessoWhats().numeros[0] || '', ...extra };
  for (const k of Object.keys(env)) if (/^(CLAUDECODE|CLAUDE_CODE_|CLAUDE_PID|CLAUDE_EFFORT|AI_AGENT|CORE_OS_PASSWORD|CORE_OS_HOOK_TOKEN)/.test(k)) delete env[k];
  // sem telemetria nem relatório de erros nas conversas abertas pelo painel
  env.DISABLE_TELEMETRY = '1'; env.DISABLE_ERROR_REPORTING = '1';
  return env;
}

function iniciarTerminal(conv, cols = 120, rows = 32, pedido = '') {
  const jaTemClaude = fs.existsSync(path.join(PROJETOS, `${conv.id}.jsonl`));
  const { bin, args } = comandoTerminal(conv, { prompt: promptSistema(conv.id), jaTemClaude });
  const env = envLimpo({ TERM: 'xterm-256color', COLORTERM: 'truecolor', CORE_OS_SESSAO: conv.id });
  let proc;
  try { proc = pty.spawn(bin, args, { name: 'xterm-256color', cwd: CFG.vault, env, cols, rows }); } catch (e) {
    proc = pty.spawn('bash', ['-c', `echo; echo "  ${MOTORES[motorDe(conv)].nome} não está instalado neste servidor (${e.message})."; echo "  ${MOTORES[motorDe(conv)].login}"; sleep 3600`], { name: 'xterm-256color', cwd: CFG.vault, env, cols, rows });
  }
  if (!conv.sessaoMotor) { conv.iniciouTerminal = Date.now(); salvarConversas(); }
  // pedido pronto (Comece aqui, extras): o servidor escreve na caixa assim que o agente mostra o prompt, sem enviar
  const vivo = { proc, buffer: '', clientes: new Set(), pedido: String(pedido || '').replace(/[\r\n]+/g, ' ').slice(0, 2000) };
  if (vivo.pedido) setTimeout(() => { vivo.pedido = ''; }, 90_000);
  proc.onData((d) => {
    vivo.buffer = (vivo.buffer + d).slice(-300_000);
    if (vivo.pedido) {
      const tela = vivo.buffer.slice(-6000).replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '');
      if (!/trust this folder|sign in|choose how/i.test(tela) && /[❯›]/.test(tela)) {
        const texto = vivo.pedido; vivo.pedido = '';
        setTimeout(() => { try { proc.write(texto); } catch { /* encerrou */ } }, 600);
      }
    }
    conv.ultimaAtividade = Date.now();
    for (const ws of vivo.clientes) if (ws.readyState === 1) ws.send(d);
  });
  proc.onExit(() => {
    vivos.delete(conv.id);
    for (const ws of vivo.clientes) if (ws.readyState === 1) ws.send('\r\n\x1b[2m[conversa encerrada. Clique no terminal pra retomar]\x1b[0m\r\n');
  });
  vivos.set(conv.id, vivo);
  return vivo;
}

function criarConversa(extra = {}) {
  const conv = { id: crypto.randomUUID(), criada: Date.now(), ultimaAtividade: Date.now(), midias: [], numero: conversas.length + 1, motor: prefsMotor().padrao, ...extra };
  conversas.push(conv);
  salvarConversas();
  return conv;
}

app.post('/api/conversas', (req, res) => {
  const conv = criarConversa(MOTORES[req.body?.motor] ? { motor: req.body.motor } : {});
  const cols = Number(req.body?.cols) || 120;
  const rows = Number(req.body?.rows) || 32;
  if (MOTORES[motorDe(conv)].api) return res.json(conv); // motor de API: sem terminal, a conversa é um chat
  iniciarTerminal(conv, Math.min(cols, 400), Math.min(rows, 200), typeof req.body?.pedido === 'string' ? req.body.pedido : '');
  res.json(conv);
});

app.delete('/api/conversas/:id', (req, res) => {
  const conv = conversas.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).end();
  vivos.get(conv.id)?.proc.kill();
  pararOpenAI(conv.id);
  conv.arquivada = true;
  salvarConversas();
  res.json({ ok: true });
});

// ---------- leitura do registro do Claude Code ----------
const cacheRegistro = new Map(); // arquivo -> { tamanho, dados }
function lerRegistro(arquivo) {
  let st;
  try { st = fs.statSync(arquivo); } catch { return null; }
  const c = cacheRegistro.get(arquivo);
  if (c && c.tamanho === st.size) return c.dados;
  const linhas = fs.readFileSync(arquivo, 'utf8').split('\n');
  let ultimaAcao = null; let terminou = false; const escritos = [];
  for (const l of linhas) {
    if (!l) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    const conteudo = o.message?.content;
    if (o.type !== 'assistant' || !Array.isArray(conteudo)) continue;
    const usos = conteudo.filter((b) => b.type === 'tool_use');
    if (usos.length) {
      const u = usos[usos.length - 1];
      ultimaAcao = descreverAcao(u);
      terminou = false;
      for (const x of usos) if (['Write', 'Edit'].includes(x.name) && x.input?.file_path) escritos.push(x.input.file_path);
    } else if (o.message?.stop_reason === 'end_turn') terminou = true;
  }
  const dados = { ultimaAcao, terminou, escritos, mtime: st.mtimeMs };
  cacheRegistro.set(arquivo, { tamanho: st.size, dados });
  return dados;
}

function descreverAcao(u) {
  const i = u.input || {};
  const curto = (s) => String(s || '').replace(/\s+/g, ' ').slice(0, 90);
  if (/sessoes\/[0-9a-f-]{36}\.md/.test(i.file_path || '')) return 'Atualizando a nota de status';
  if (i.description) return `${u.name}: ${curto(i.description)}`;
  if (i.file_path) return `${u.name}: ${path.basename(i.file_path)}`;
  if (i.command) return `${u.name}: ${curto(i.command)}`;
  if (i.pattern) return `${u.name}: ${curto(i.pattern)}`;
  return u.name;
}

function subagentes(id) {
  const dir = path.join(PROJETOS, id, 'subagents');
  let itens = [];
  try { itens = fs.readdirSync(dir).filter((f) => f.endsWith('.meta.json')); } catch { return []; }
  return itens.map((f) => {
    let meta = {}; try { meta = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); } catch { /* */ }
    const reg = lerRegistro(path.join(dir, f.replace('.meta.json', '.jsonl'))) || {};
    const recente = reg.mtime && Date.now() - reg.mtime < 30_000;
    return {
      id: f.replace('.meta.json', ''),
      descricao: meta.description || 'Subagente',
      tipo: meta.agentType || '',
      status: reg.terminou ? 'concluido' : recente ? 'trabalhando' : 'parado',
      ultimaAcao: reg.ultimaAcao,
      inicio: reg.mtime,
    };
  }).sort((a, b) => (a.inicio || 0) - (b.inicio || 0));
}

function registroDe(c) {
  const m = motorDe(c);
  if (m === 'claude') return lerRegistro(path.join(PROJETOS, `${c.id}.jsonl`)) || {};
  if (m === 'codex') return lerCodex(c.sessaoMotor).reg || {};
  if (MOTORES[m].api) return { ultimaAcao: c.ultimaAcao, terminou: !c.processando, mtime: c.ultimaAtividade };
  return {};
}

function lerNota(id) {
  try { return fs.readFileSync(path.join(CFG.vault, 'sessoes', `${id}.md`), 'utf8'); } catch { return ''; }
}

app.get('/api/estado', (req, res) => {
  res.json(conversas.filter((c) => !c.arquivada).map((c) => {
    const reg = registroDe(c);
    const nota = lerNota(c.id);
    const padrao = c.origem === 'agendamento' ? `Agendado · ${c.tituloFixo || 'tarefa'}` : c.origem === 'whatsapp'
      ? `WhatsApp · ${new Date(c.criada).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`
      : `Conversa ${c.numero}`;
    const titulo = nota.match(/^#\s+(.+)$/m)?.[1]?.trim() || padrao;
    return {
      id: c.id, motor: motorDe(c), motorNome: MOTORES[motorDe(c)].nome, titulo, nota, numero: c.numero, criada: c.criada, origem: c.origem || 'painel', processando: Boolean(c.processando),
      ativo: vivos.has(c.id),
      trabalhando: Boolean(c.processando) || (reg.mtime ? Date.now() - reg.mtime < 8000 && !reg.terminou : false),
      ultimaAcao: reg.ultimaAcao, midias: c.midias || [], subagentes: motorDe(c) === 'claude' ? subagentes(c.id) : [],
    };
  }));
});

// histórico legível (o que foi pedido, o que o Claude respondeu e o que ele fez)
app.get('/api/conversas/:id/historico', (req, res) => {
  if (!/^[0-9a-f-]{36}$/.test(req.params.id)) return res.status(400).end();
  const conv = conversas.find((c) => c.id === req.params.id);
  if (conv && motorDe(conv) === 'codex') return res.json(lerCodex(conv.sessaoMotor).itens.slice(-300));
  if (conv && MOTORES[motorDe(conv)].api) return res.json(historicoOpenAI(conv.id).slice(-300));
  if (conv && motorDe(conv) !== 'claude') return res.json((conv.historico || []).slice(-300));
  let linhas = [];
  try { linhas = fs.readFileSync(path.join(PROJETOS, `${req.params.id}.jsonl`), 'utf8').split('\n'); } catch { return res.json([]); }
  const itens = [];
  for (const l of linhas) {
    if (!l) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    const quando = o.timestamp ? Date.parse(o.timestamp) : null;
    const c = o.message?.content;
    if (o.type === 'user' && !o.isMeta) {
      const texto = typeof c === 'string' ? c : Array.isArray(c) ? c.filter((b) => b.type === 'text').map((b) => b.text).join('\n') : '';
      if (texto && !texto.startsWith('<')) itens.push({ papel: 'voce', texto, quando });
    } else if (o.type === 'assistant' && Array.isArray(c)) {
      for (const b of c) {
        if (b.type === 'text' && b.text.trim()) itens.push({ papel: 'claude', texto: b.text.trim(), quando });
        if (b.type === 'tool_use') itens.push({ papel: 'acao', texto: descreverAcao(b), quando });
      }
    }
  }
  res.json(itens.slice(-300));
});

setInterval(() => { if (vincularCodex(conversas, CFG.vault)) salvarConversas(); }, 4000);

// ---------- mídias novas em conteudo/ viram cards da conversa que as gerou ----------
let vistos = null;
setInterval(() => {
  const atual = new Map(arquivosDe(path.join(CFG.vault, 'conteudo'), 'conteudo').filter((f) => MIDIA.test(f.caminho) && !enviados.has(f.caminho)).map((f) => [f.caminho, f.mtime]));
  if (vistos) {
    for (const [p, m] of atual) {
      if (vistos.get(p) === m) continue;
      const dona = conversas
        .filter((c) => !c.arquivada)
        .map((c) => ({ c, t: Math.max(c.ultimaAtividade || 0, registroDe(c).mtime || 0) }))
        .filter((x) => Date.now() - x.t < 180_000)
        .sort((a, b) => b.t - a.t)[0]?.c;
      if (dona && !dona.midias.includes(p)) { dona.midias.push(p); salvarConversas(); }
    }
  }
  vistos = atual;
}, 3000);

// ---------- ponte do WhatsApp: só números autorizados dão ordens; a resposta volta pra quem mandou ----------
// O n8n repassa toda mensagem de conversa individual; quem decide quem é atendido é este painel
// (Configurações › WhatsApp › Quem pode dar ordens). Cada conversa vira um item do painel (origem: whatsapp).
// "/nova" (ou /clear) abre outra; depois de 6h parado, a próxima mensagem também abre outra.
const SEIS_HORAS = 6 * 3600_000;
const COMANDO_NOVA = /^\s*\/(nova|novo|clear|limpar)\b\s*/i;
const PROMPT_WHATS = [
  'Esta conversa acontece pelo WhatsApp: o dono te mandou mensagem e a sua resposta final volta pra ele como mensagem.',
  'Responda curto, em texto simples de WhatsApp (sem tabela, sem título, no máximo um negrito com *asteriscos*).',
  'Pra ler conversas, achar contato ou mandar mensagem e arquivo pra outra pessoa ou pro dono, use a skill whatsapp e siga as regras dela.',
].join(' ');
const filaWhats = [];
let whatsOcupado = false;

// devolve o número pra onde a resposta vai, ou null se quem mandou não está autorizado
function autorizado({ deMim, chat, eu }) {
  const a = acessoWhats();
  const c = chaveNumero(chat);
  if (!c) return null;
  if (deMim) return a.chatVoce && c === chaveNumero(eu) ? String(chat).split('@')[0] : null; // chat "Você"
  return a.numeros.some((n) => chaveNumero(n) === c) ? String(chat).split('@')[0] : null;
}

function ponteWhatsapp(req, res) {
  const token = req.get('x-core-os-token') || '';
  const agora = Date.now(); const chave = `ponte:${req.ip}`;
  const recentes = (falhas.get(chave) || []).filter((t) => agora - t < 60_000);
  if (recentes.length >= 20) return res.status(429).json({ erro: 'tentativas demais' });
  if (!CFG.tokenPonte || !crypto.timingSafeEqual(hash(token), hash(CFG.tokenPonte))) { falhas.set(chave, [...recentes, agora]); return res.status(401).json({ erro: 'token' }); }
  const b = req.body || {};
  const texto = String(b.texto || '').trim();
  const tipo = String(b.tipo || 'texto');
  // formato antigo do fluxo (só chat "Você"): continua funcionando até o n8n ser atualizado
  const para = b.chat ? autorizado({ deMim: Boolean(b.deMim), chat: b.chat, eu: b.eu }) : (acessoWhats().chatVoce ? '' : null);
  if (para === null) return res.status(202).json({ ok: true, ignorado: true });
  if (tipo === 'texto' && !texto) return res.status(400).json({ erro: 'texto vazio' });
  filaWhats.push({ texto, tipo, para });
  res.status(202).json({ ok: true, posicao: filaWhats.length });
  processarWhats();
}

// uma conversa ativa por número que fala com o cérebro
function conversaDoWhats(para, forcarNova) {
  const todos = ler('whatsapp.json', {});
  const chave = chaveNumero(para) || 'dono';
  const est = todos[chave] || {};
  const atual = conversas.find((c) => c.id === est.conversa && !c.arquivada);
  const parada = !est.ultima || Date.now() - est.ultima > SEIS_HORAS;
  // se o dono assumiu essa conversa pelo terminal do painel, o WhatsApp abre outra pra não brigarem
  if (atual && !forcarNova && !parada && !vivos.has(atual.id) && motorDe(atual) === prefsMotor().whatsapp) return atual;
  const nova = criarConversa({ origem: 'whatsapp', motor: prefsMotor().whatsapp, whatsDe: para });
  marcarWhats(para, nova.id);
  return nova;
}
function marcarWhats(para, conversa) {
  const todos = ler('whatsapp.json', {});
  delete todos.conversa; delete todos.ultima; // formato antigo
  todos[chaveNumero(para) || 'dono'] = { conversa, ultima: Date.now() };
  gravar('whatsapp.json', todos);
}

async function rodarClaude(conv, texto, para, instrucoes = PROMPT_WHATS) {
  const jaTemClaude = fs.existsSync(path.join(PROJETOS, `${conv.id}.jsonl`));
  const { resposta, sessao } = await rodarSemTela(conv, texto, {
    prompt: `${promptSistema(conv.id)} ${instrucoes}`, env: envLimpo({ CORE_OS_SESSAO: conv.id, WHATS_PARA: para || '' }), cwd: CFG.vault, jaTemClaude,
  });
  if (sessao && !conv.sessaoMotor) conv.sessaoMotor = sessao;
  if (motorDe(conv) === 'antigravity') {
    conv.historico = [...(conv.historico || []), { papel: 'voce', texto, quando: Date.now() - 1 }, { papel: 'claude', texto: resposta, quando: Date.now() }].slice(-300);
  }
  salvarConversas();
  return resposta;
}

async function processarWhats() {
  if (whatsOcupado || !filaWhats.length) return;
  whatsOcupado = true;
  const { texto: bruto, tipo, para } = filaWhats.shift();
  try {
    if (tipo !== 'texto') { await responderWhats('Por enquanto eu só leio texto. Escreve o que você precisa que eu faço.', para); return; }
    const pediuNova = COMANDO_NOVA.test(bruto);
    const texto = bruto.replace(COMANDO_NOVA, '').trim();
    const conv = conversaDoWhats(para, pediuNova);
    if (!texto) { await responderWhats('Conversa nova aberta. Pode mandar.', para); return; }
    conv.processando = true; conv.ultimaAtividade = Date.now(); salvarConversas();
    let resposta;
    try { resposta = await rodarClaude(conv, texto, para); } finally { conv.processando = false; conv.ultimaAtividade = Date.now(); salvarConversas(); }
    marcarWhats(para, conv.id);
    await responderWhats(resposta.slice(0, 3500) || 'Feito.', para);
  } catch (e) {
    console.error('[whatsapp]', e);
  } finally {
    whatsOcupado = false;
    setImmediate(processarWhats);
  }
}

// o número conectado no painel (lido da Evolution, guardado por 10 min; zera ao reconectar)
let meuNumeroCache = { n: '', t: 0 };
async function meuNumero() {
  if (meuNumeroCache.n && Date.now() - meuNumeroCache.t < 600_000) return meuNumeroCache.n;
  try {
    const lista = await evo(`/instance/fetchInstances?instanceName=${INSTANCIA()}`);
    const inst = (Array.isArray(lista) ? lista : [lista]).find((i) => (i.name || i.instance?.instanceName) === INSTANCIA());
    const n = String(inst?.ownerJid || '').split('@')[0];
    if (n) meuNumeroCache = { n, t: Date.now() };
  } catch { /* sem conexão */ }
  return meuNumeroCache.n;
}

async function responderWhats(texto, para) {
  const { EVO_URL, EVO_KEY } = process.env;
  const eu = await meuNumero();
  const numero = para || eu;
  if (!EVO_URL || !numero) return console.log('[whatsapp] sem Evolution ou número, resposta:', texto);
  // ⁣ (invisível) marca a resposta no chat "Você": o fluxo ignora, então não entra em loop
  const marca = chaveNumero(numero) === chaveNumero(eu) ? '⁣' : '';
  try {
    const r = await fetch(`${EVO_URL}/message/sendText/${INSTANCIA()}`, {
      method: 'POST', headers: { apikey: EVO_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ number: numero, text: `${marca}${texto}` }),
    });
    if (!r.ok) console.error('[whatsapp] Evolution recusou a resposta:', r.status, (await r.text()).slice(0, 200));
  } catch (e) { console.error('[whatsapp] falhou ao responder:', e.message); }
}

// ---------- agendamento de tarefas ----------
// Cada tarefa é um prompt que roda sozinho no horário (fuso de Brasília), sem terminal, e vira uma conversa do painel
// (origem: agendamento). Uma por vez; se o painel ficou fora do ar, execução atrasada em mais de 2h é pulada.
const FUSO = 'America/Sao_Paulo';
const MAX_AGENDAMENTOS = 30;
const PROMPT_AGENDA = [
  'Esta é uma tarefa agendada: roda sozinha, ninguém está acompanhando agora e não dá pra fazer perguntas.',
  'Faça o que o prompt pede com o que você tem e termine com um resultado final curto e direto (ele aparece no painel e, se configurado, vai por WhatsApp).',
  'Se faltar informação, diga o que faltou em vez de perguntar.',
].join(' ');
let agendamentos = ler('agendamentos.json', []);
const salvarAgendamentos = () => gravar('agendamentos.json', agendamentos);

function partesNoFuso(ms) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: FUSO, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' })
    .formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return { ano: +p.year, mes: +p.month, dia: +p.day, hora: +p.hour, min: +p.minute, dow: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday) };
}
// instante (ms) em que o relógio de Brasília marca ano-mes-dia hora:min
function instanteNoFuso(ano, mes, dia, hora, min) {
  const alvo = Date.UTC(ano, mes - 1, dia, hora, min);
  let t = alvo;
  for (let i = 0; i < 2; i++) { const q = partesNoFuso(t); t -= Date.UTC(q.ano, q.mes - 1, q.dia, q.hora, q.min) - alvo; }
  return t;
}
function proximaExecucao(freq, de) {
  if (freq.tipo === 'intervalo') return de + freq.minutos * 60_000;
  const [h, m] = freq.hora.split(':').map(Number);
  const base = partesNoFuso(de);
  for (let i = 0; i < 9; i++) {
    const d = new Date(Date.UTC(base.ano, base.mes - 1, base.dia + i));
    if (freq.tipo === 'semanal' && !freq.dias.includes((base.dow + i) % 7)) continue;
    const t = instanteNoFuso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate(), h, m);
    if (t > de) return t;
  }
  return de + 24 * 3600_000;
}

function validarAgenda(b) {
  const nome = String(b.nome ?? '').trim(); const prompt = String(b.prompt ?? '').trim();
  if (!nome || nome.length > 80) return { erro: 'Dê um nome de até 80 caracteres.' };
  if (!prompt || prompt.length > 4000) return { erro: 'O pedido precisa ter entre 1 e 4000 caracteres.' };
  const f = b.freq || {}; let freq;
  if (f.tipo === 'diaria' || f.tipo === 'semanal') {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(f.hora))) return { erro: 'Horário inválido.' };
    freq = { tipo: f.tipo, hora: f.hora };
    if (f.tipo === 'semanal') {
      const dias = [...new Set((Array.isArray(f.dias) ? f.dias : []).map(Number))].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6).sort();
      if (!dias.length) return { erro: 'Escolha pelo menos um dia da semana.' };
      freq.dias = dias;
    }
  } else if (f.tipo === 'intervalo') {
    const minutos = Number(f.minutos);
    if (!Number.isInteger(minutos) || minutos < 15 || minutos > 10080) return { erro: 'O intervalo vai de 15 minutos a 7 dias.' };
    freq = { tipo: 'intervalo', minutos };
  } else return { erro: 'Frequência inválida.' };
  return { valor: { nome, prompt, freq, enviarWhats: Boolean(b.enviarWhats), ativo: b.ativo !== false } };
}
const publicaAgenda = (a) => ({ id: a.id, nome: a.nome, prompt: a.prompt, freq: a.freq, enviarWhats: a.enviarWhats, ativo: a.ativo,
  proxima: a.ativo ? a.proxima || null : null, ultima: a.ultima || null, naFila: naFilaAgenda.has(a.id) });

const filaAgenda = []; const naFilaAgenda = new Set(); let agendaOcupada = false;
function enfileirarAgenda(id) {
  if (naFilaAgenda.has(id)) return false;
  naFilaAgenda.add(id); filaAgenda.push(id); processarAgenda();
  return true;
}
async function processarAgenda() {
  if (agendaOcupada) return;
  const id = filaAgenda.shift();
  if (!id) return;
  agendaOcupada = true;
  try { const ag = agendamentos.find((a) => a.id === id); if (ag) await executarAgendamento(ag); }
  catch (e) { console.error('[agenda]', e); }
  finally { naFilaAgenda.delete(id); agendaOcupada = false; setImmediate(processarAgenda); }
}
async function executarAgendamento(ag) {
  const para = acessoWhats().numeros[0] || '';
  const conv = criarConversa({ origem: 'agendamento', agendamento: ag.id, tituloFixo: ag.nome, motor: prefsMotor().padrao });
  conv.processando = true; salvarConversas();
  let resposta = ''; let ok = true;
  try { resposta = await rodarClaude(conv, ag.prompt, para, PROMPT_AGENDA); }
  catch (e) { ok = false; resposta = String(e.message || e); }
  finally { conv.processando = false; conv.ultimaAtividade = Date.now(); salvarConversas(); }
  if (/^Não consegui abrir/.test(resposta)) ok = false;
  const atual = agendamentos.find((a) => a.id === ag.id);
  if (atual) { atual.ultima = { quando: Date.now(), conversa: conv.id, ok, resumo: resposta.slice(0, 300) }; salvarAgendamentos(); }
  if (ag.enviarWhats) await responderWhats(`*${ag.nome}*\n${resposta.slice(0, 3400) || 'Feito.'}`, para);
}
function tickAgenda() {
  const agora = Date.now(); let mudou = false;
  for (const ag of agendamentos) {
    if (!ag.ativo) continue;
    if (!ag.proxima) { ag.proxima = proximaExecucao(ag.freq, agora); mudou = true; continue; }
    if (ag.proxima <= agora) {
      const atraso = agora - ag.proxima;
      ag.proxima = proximaExecucao(ag.freq, agora); mudou = true;
      if (atraso < 2 * 3600_000) enfileirarAgenda(ag.id);
    }
  }
  if (mudou) salvarAgendamentos();
}
setInterval(tickAgenda, 30_000);
setTimeout(tickAgenda, 5_000);

app.get('/api/agendamentos', (req, res) => res.json(agendamentos.map(publicaAgenda)));
app.post('/api/agendamentos', (req, res) => {
  if (agendamentos.length >= MAX_AGENDAMENTOS) return res.status(400).json({ erro: `Limite de ${MAX_AGENDAMENTOS} agendamentos.` });
  const v = validarAgenda(req.body || {});
  if (v.erro) return res.status(400).json(v);
  const ag = { id: crypto.randomUUID(), criado: Date.now(), ...v.valor };
  ag.proxima = ag.ativo ? proximaExecucao(ag.freq, Date.now()) : null;
  agendamentos.push(ag); salvarAgendamentos();
  res.status(201).json(publicaAgenda(ag));
});
app.put('/api/agendamentos/:id', (req, res) => {
  const ag = agendamentos.find((a) => a.id === req.params.id);
  if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
  const v = validarAgenda({ ...ag, ...(req.body || {}) });
  if (v.erro) return res.status(400).json(v);
  const mudouHorario = JSON.stringify(v.valor.freq) !== JSON.stringify(ag.freq) || (v.valor.ativo && !ag.ativo);
  Object.assign(ag, v.valor);
  if (!ag.ativo) ag.proxima = null; else if (mudouHorario || !ag.proxima) ag.proxima = proximaExecucao(ag.freq, Date.now());
  salvarAgendamentos();
  res.json(publicaAgenda(ag));
});
app.delete('/api/agendamentos/:id', (req, res) => {
  const i = agendamentos.findIndex((a) => a.id === req.params.id);
  if (i < 0) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
  agendamentos.splice(i, 1); salvarAgendamentos();
  res.json({ ok: true });
});
app.post('/api/agendamentos/:id/executar', (req, res) => {
  const ag = agendamentos.find((a) => a.id === req.params.id);
  if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado.' });
  if (!enfileirarAgenda(ag.id)) return res.status(409).json({ erro: 'Essa tarefa já está na fila ou rodando.' });
  res.status(202).json({ ok: true });
});

// ---------- backup do cérebro ----------
// .tar.gz da pasta do cérebro (tar do sistema). Manual (download em streaming ou guardado em dados/backups)
// e automático diário (fuso de Brasília) com retenção dos N mais recentes. Restaurar é manual (comando na tela).
const PASTA_BACKUP = path.join(CFG.dados, 'backups'); fs.mkdirSync(PASTA_BACKUP, { recursive: true });
const NOME_BACKUP = /^cerebro-\d{8}-\d{6}\.tar\.gz$/;
const MIDIAS_TAR = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'mp4', 'mov', 'webm', 'm4v'];
let backupCfg = { auto: false, hora: '03:00', manter: 7, midia: true, ultima: null, proxima: null, ...ler('backup.json', {}) };
const salvarBackupCfg = () => gravar('backup.json', backupCfg);
let backupRodando = false; let baixandoBackup = false;

function selo(ms = Date.now()) {
  const q = partesNoFuso(ms); const z = (n) => String(n).padStart(2, '0');
  return `${q.ano}${z(q.mes)}${z(q.dia)}-${z(q.hora)}${z(q.min)}${z(new Date(ms).getUTCSeconds())}`;
}
function argsTar(saida, midia) {
  const ex = ['--exclude=node_modules', '--exclude=.trash', '--exclude=*.enviando', ...(midia ? [] : MIDIAS_TAR.map((e) => `--exclude=*.${e}`))];
  return ['-czf', saida, ...ex, '-C', path.dirname(CFG.vault), path.basename(CFG.vault)];
}
function espacoLivre() { try { const f = fs.statfsSync(PASTA_BACKUP); return f.bavail * f.bsize; } catch { return Infinity; } }
function listarBackups() {
  return fs.readdirSync(PASTA_BACKUP).filter((n) => NOME_BACKUP.test(n)).sort().reverse().map((nome) => {
    const st = fs.statSync(path.join(PASTA_BACKUP, nome)); return { nome, tamanho: st.size, quando: st.mtimeMs };
  });
}
function podarBackups() {
  for (const b of listarBackups().slice(Math.max(1, backupCfg.manter))) { try { fs.unlinkSync(path.join(PASTA_BACKUP, b.nome)); } catch { /* */ } }
}
function criarBackup(midia) {
  if (espacoLivre() < 500 * 1024 * 1024) return Promise.reject(new Error('Pouco espaço em disco (menos de 500 MB livres).'));
  const nome = `cerebro-${selo()}.tar.gz`; const destino = path.join(PASTA_BACKUP, nome); const tmp = `${destino}.parcial`;
  return new Promise((ok, falha) => {
    const proc = spawn('tar', argsTar(tmp, midia), { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = ''; proc.stderr.on('data', (d) => { err += d; });
    proc.on('error', (e) => falha(new Error(`Não consegui rodar o tar: ${e.message}`)));
    proc.on('close', (code) => {
      // código 1 do tar = "um arquivo mudou durante a leitura": o backup serve
      if (code !== 0 && code !== 1) { try { fs.unlinkSync(tmp); } catch { /* */ } return falha(new Error(err.trim().split('\n').slice(-2).join(' ') || `tar saiu com código ${code}`)); }
      fs.renameSync(tmp, destino); ok({ nome, tamanho: fs.statSync(destino).size });
    });
  });
}
async function rodarBackup(origem) {
  if (backupRodando) return false;
  backupRodando = true;
  try {
    const r = await criarBackup(backupCfg.midia);
    backupCfg.ultima = { quando: Date.now(), ok: true, arquivo: r.nome, tamanho: r.tamanho, origem };
    podarBackups();
  } catch (e) { backupCfg.ultima = { quando: Date.now(), ok: false, erro: String(e.message || e).slice(0, 300), origem }; }
  finally { backupRodando = false; salvarBackupCfg(); }
  return true;
}
function tickBackup() {
  if (!backupCfg.auto) return;
  const agora = Date.now();
  if (!backupCfg.proxima) { backupCfg.proxima = proximaExecucao({ tipo: 'diaria', hora: backupCfg.hora }, agora); salvarBackupCfg(); return; }
  if (backupCfg.proxima <= agora) {
    backupCfg.proxima = proximaExecucao({ tipo: 'diaria', hora: backupCfg.hora }, agora); salvarBackupCfg();
    rodarBackup('automatico'); // backup atrasado (painel fora do ar) roda mesmo assim
  }
}
setInterval(tickBackup, 60_000);
setTimeout(tickBackup, 10_000);

app.get('/api/backup', (req, res) => {
  const { auto, hora, manter, midia, ultima, proxima } = backupCfg;
  res.json({ config: { auto, hora, manter, midia }, ultima, proxima: auto ? proxima : null, rodando: backupRodando, backups: listarBackups(), livre: espacoLivre() === Infinity ? null : espacoLivre() });
});
app.put('/api/backup/config', (req, res) => {
  const b = req.body || {};
  const hora = String(b.hora ?? backupCfg.hora); const manter = Number(b.manter ?? backupCfg.manter);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return res.status(400).json({ erro: 'Horário inválido.' });
  if (!Number.isInteger(manter) || manter < 1 || manter > 60) return res.status(400).json({ erro: 'Guardar de 1 a 60 backups.' });
  const mudou = hora !== backupCfg.hora || (b.auto === true && !backupCfg.auto);
  Object.assign(backupCfg, { auto: Boolean(b.auto ?? backupCfg.auto), hora, manter, midia: Boolean(b.midia ?? backupCfg.midia) });
  if (!backupCfg.auto) backupCfg.proxima = null; else if (mudou || !backupCfg.proxima) backupCfg.proxima = proximaExecucao({ tipo: 'diaria', hora }, Date.now());
  podarBackups(); salvarBackupCfg();
  res.json({ ok: true });
});
app.post('/api/backup/criar', (req, res) => {
  if (backupRodando) return res.status(409).json({ erro: 'Já tem um backup rodando.' });
  rodarBackup('manual');
  res.status(202).json({ ok: true });
});
const arquivoBackup = (nome) => (NOME_BACKUP.test(String(nome)) && fs.existsSync(path.join(PASTA_BACKUP, nome)) ? path.join(PASTA_BACKUP, nome) : null);
app.get('/api/backup/arquivo', (req, res) => {
  const f = arquivoBackup(req.query.nome);
  if (!f) return res.status(404).json({ erro: 'Backup não encontrado.' });
  res.download(f, path.basename(f));
});
app.delete('/api/backup/arquivo', (req, res) => {
  const f = arquivoBackup(req.query.nome);
  if (!f) return res.status(404).json({ erro: 'Backup não encontrado.' });
  fs.unlinkSync(f); res.json({ ok: true });
});
// download direto, sem guardar no servidor (o tar escreve na resposta)
app.get('/api/backup/baixar', (req, res) => {
  if (baixandoBackup) return res.status(409).json({ erro: 'Já tem um download de backup em andamento.' });
  baixandoBackup = true;
  const proc = spawn('tar', argsTar('-', req.query.midia !== '0'), { stdio: ['ignore', 'pipe', 'ignore'] });
  res.set({ 'Content-Type': 'application/gzip', 'Content-Disposition': `attachment; filename="cerebro-${selo()}.tar.gz"`, 'Cache-Control': 'no-store' });
  proc.stdout.pipe(res);
  const fim = () => { baixandoBackup = false; };
  proc.on('error', () => { fim(); if (!res.headersSent) res.status(500).end(); else res.destroy(); });
  proc.on('close', fim);
  res.on('close', () => { proc.kill('SIGTERM'); fim(); }); // cliente desistiu: para o tar
});

// ---------- motor OpenAI (API): chat no painel e configurações ----------
const PROMPT_PAINEL = 'Esta conversa acontece no painel web do Core OS: o dono lê sua resposta na tela, então pode usar markdown simples (listas, negrito) quando ajudar.';
app.post('/api/conversas/:id/mensagem', (req, res) => {
  const conv = conversas.find((c) => c.id === req.params.id && !c.arquivada);
  if (!conv) return res.status(404).json({ erro: 'Conversa não encontrada.' });
  if (!MOTORES[motorDe(conv)].api) return res.status(400).json({ erro: 'Esta conversa usa um terminal; digite nele.' });
  const texto = String(req.body?.texto ?? '').trim();
  if (!texto || texto.length > 20000) return res.status(400).json({ erro: 'Mensagem vazia ou longa demais (máximo 20 mil caracteres).' });
  if (conv.processando) return res.status(409).json({ erro: 'Ainda estou respondendo. Espere terminar ou clique em Parar.' });
  conv.processando = true; conv.ultimaAtividade = Date.now(); salvarConversas();
  res.status(202).json({ ok: true });
  rodarClaude(conv, texto, undefined, PROMPT_PAINEL).catch((e) => console.error('[openai]', e))
    .finally(() => { conv.processando = false; conv.ultimaAtividade = Date.now(); salvarConversas(); });
});
app.post('/api/conversas/:id/parar', (req, res) => {
  const conv = conversas.find((c) => c.id === req.params.id);
  if (!conv) return res.status(404).json({ erro: 'Conversa não encontrada.' });
  res.json({ ok: pararOpenAI(conv.id) });
});
const resumoOpenAI = () => ({ config: lerConfigOpenAI(), chave: estadoChave(), uso: usoOpenAI() });
app.get('/api/config/openai', (req, res) => res.json(resumoOpenAI()));
app.put('/api/config/openai', (req, res) => {
  try { gravarConfigOpenAI(req.body || {}); } catch (e) { return res.status(400).json({ erro: e.message }); }
  res.json(resumoOpenAI());
});
app.put('/api/config/openai/chave', async (req, res) => {
  if (req.body?.apagar) { apagarChave(); return res.json(resumoOpenAI()); }
  const chave = String(req.body?.chave ?? '').trim();
  if (!/^sk-[A-Za-z0-9_\-]{16,}$/.test(chave)) return res.status(400).json({ erro: 'Isso não parece uma chave da OpenAI (começa com sk-).' });
  try { await testarChave(chave); } catch (e) { return res.status(400).json({ erro: `A OpenAI não aceitou essa chave: ${e.message}` }); }
  salvarChave(chave); // só guarda depois de a OpenAI aceitar
  res.json(resumoOpenAI());
});
app.get('/api/config/openai/modelos', async (req, res) => {
  try { res.json({ modelos: await listarModelos() }); } catch (e) { res.status(502).json({ erro: e.message }); }
});

// ---------- estáticos ----------
const vendor = (p) => path.join(AQUI, 'node_modules', p);
app.use('/vendor/xterm', express.static(vendor('@xterm/xterm')));
app.use('/vendor/xterm-fit', express.static(vendor('@xterm/addon-fit')));
app.use('/vendor/marked', express.static(vendor('marked')));
app.use('/vendor/xterm-unicode', express.static(vendor('@xterm/addon-unicode11')));
app.use(express.static(path.join(AQUI, 'public')));

// ---------- websocket dos terminais ----------
const servidor = createServer(app);
const wss = new WebSocketServer({ noServer: true });
servidor.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, 'http://x');
  const conv = conversas.find((c) => c.id === url.searchParams.get('conversa'));
  let origemOk = !req.headers.origin;
  try { origemOk = origemOk || new URL(req.headers.origin).host === req.headers.host; } catch { origemOk = false; }
  if (url.pathname !== '/ws' || !logado(req) || !conv || !origemOk || MOTORES[motorDe(conv)].api) { socket.destroy(); return; }
  wss.handleUpgrade(req, socket, head, (ws) => {
    const cols = Number(url.searchParams.get('cols')) || 120;
    const rows = Number(url.searchParams.get('rows')) || 32;
    const vivo = vivos.get(conv.id) || iniciarTerminal(conv, cols, rows);
    vivo.clientes.add(ws);
    if (vivo.buffer) ws.send(vivo.buffer);
    ws.on('message', (raw) => {
      let m; try { m = JSON.parse(raw); } catch { return; }
      const v = vivos.get(conv.id);
      if (!v) return;
      if (m.t === 'i') v.proc.write(m.d);
      if (m.t === 'r' && m.cols > 0 && m.rows > 0) v.proc.resize(Math.min(m.cols, 400), Math.min(m.rows, 200));
    });
    ws.on('close', () => vivo.clientes.delete(ws));
  });
});

servidor.listen(CFG.porta, CFG.host, () => {
  console.log(`Core OS no ar em http://${CFG.host}:${CFG.porta}  ·  cérebro: ${CFG.vault}`);
});
