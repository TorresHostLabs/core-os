// Core OS · motor "OpenAI (API)": agente próprio que chama a API da OpenAI (Chat Completions) num ciclo de
// ferramentas. As ferramentas só enxergam a pasta do cérebro; comando de shell só existe se for ligado nas configurações.
// Sem terminal: a conversa é um chat no painel (histórico em dados/openai/<id>.json).
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const BASE = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const FUSO = 'America/Sao_Paulo';
const MAX_RESULTADO = 30_000; // caracteres devolvidos por ferramenta
const MAX_ARQUIVO = 1_000_000; // bytes lidos ou escritos
const LIMITE_CONTEXTO = 400_000; // caracteres de histórico enviados (~100 mil tokens); o mais antigo cai fora

const SEM_DADOS_MS = Number(process.env.OPENAI_IDLE_MS) || 120_000; // tempo sem nenhum dado antes de desistir
const NA_OPENAI = (() => { try { return new URL(BASE).hostname === 'api.openai.com'; } catch { return false; } })();

let CTX = { dados: '', vault: '' };
export function iniciarOpenAI({ dados, vault }) {
  CTX = { dados, vault };
  fs.mkdirSync(path.join(dados, 'openai'), { recursive: true });
}

// ---------- configuração e chave ----------
const arqCfg = () => path.join(CTX.dados, 'openai.json');
const arqChave = () => path.join(CTX.dados, 'openai-chave');
const arqUso = () => path.join(CTX.dados, 'openai-uso.json');
const lerJson = (f, padrao) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return padrao; } };

export function lerConfigOpenAI() {
  const c = { modelo: process.env.OPENAI_MODEL || '', shell: false, streaming: true, maxPassos: 20, maxSaida: 0, limiteDiario: 0, ...lerJson(arqCfg(), {}) };
  return c;
}
export function gravarConfigOpenAI(parcial) {
  const atual = lerConfigOpenAI();
  const n = { ...atual };
  if (parcial.modelo !== undefined) {
    const m = String(parcial.modelo).trim();
    if (m.length > 100 || /[^\w.:\-/]/.test(m)) throw new Error('Nome de modelo inválido.');
    n.modelo = m;
  }
  if (parcial.shell !== undefined) n.shell = Boolean(parcial.shell);
  if (parcial.streaming !== undefined) n.streaming = Boolean(parcial.streaming);
  const inteiro = (v, min, max, nome) => { const x = Number(v); if (!Number.isInteger(x) || x < min || x > max) throw new Error(`${nome}: use um número inteiro de ${min} a ${max}.`); return x; };
  if (parcial.maxPassos !== undefined) n.maxPassos = inteiro(parcial.maxPassos, 1, 100, 'Passos por pedido');
  if (parcial.maxSaida !== undefined) n.maxSaida = inteiro(parcial.maxSaida, 0, 200_000, 'Limite de saída');
  if (parcial.limiteDiario !== undefined) n.limiteDiario = inteiro(parcial.limiteDiario, 0, 1_000_000_000, 'Limite diário');
  fs.writeFileSync(arqCfg(), JSON.stringify(n, null, 2), { mode: 0o600 });
  return n;
}
export function chaveOpenAI() {
  const env = (process.env.OPENAI_API_KEY || '').trim();
  if (env) return env;
  try { return fs.readFileSync(arqChave(), 'utf8').trim(); } catch { return ''; }
}
export const chaveConfigurada = () => Boolean(chaveOpenAI());
export function estadoChave() {
  const k = chaveOpenAI();
  const origem = (process.env.OPENAI_API_KEY || '').trim() ? 'ambiente' : k ? 'painel' : null;
  return { configurada: Boolean(k), origem, final: k ? k.slice(-4) : null };
}
export function salvarChave(k) {
  const chave = String(k || '').trim();
  if (!/^sk-[A-Za-z0-9_\-]{16,}$/.test(chave)) throw new Error('Isso não parece uma chave da OpenAI (começa com sk-).');
  fs.writeFileSync(arqChave(), chave, { mode: 0o600 });
}
export function apagarChave() { try { fs.unlinkSync(arqChave()); } catch { /* */ } }

// ---------- uso de tokens (controle de custo) ----------
const hoje = () => new Intl.DateTimeFormat('en-CA', { timeZone: FUSO }).format(new Date());
export function usoOpenAI() {
  const u = lerJson(arqUso(), { dias: {} });
  const dias = Object.values(u.dias);
  const vazio = { entrada: 0, saida: 0, cache: 0 };
  const completa = (d) => ({ ...vazio, ...d });
  return { hoje: completa(u.dias[hoje()]), total: dias.reduce((a, d) => ({ entrada: a.entrada + d.entrada, saida: a.saida + d.saida, cache: a.cache + (d.cache || 0) }), vazio) };
}
function somarUso(entrada, saida, cache = 0) {
  const u = lerJson(arqUso(), { dias: {} });
  const k = hoje(); const d = u.dias[k] || { entrada: 0, saida: 0, cache: 0 };
  u.dias[k] = { entrada: d.entrada + entrada, saida: d.saida + saida, cache: (d.cache || 0) + cache };
  for (const dia of Object.keys(u.dias).sort().slice(0, -90)) delete u.dias[dia]; // guarda 90 dias
  fs.writeFileSync(arqUso(), JSON.stringify(u));
}

// ---------- API ----------
// Lê a resposta em streaming (SSE do Chat Completions) e devolve no mesmo formato de uma resposta normal.
async function lerStream(corpo, rearmar, aoTexto) {
  const dec = new TextDecoder(); let buf = '';
  const msg = { content: '', refusal: '', tool_calls: [] }; let fim = null; let usage = null;
  const bloco = (txt) => {
    for (const linha of txt.split(/\r?\n/)) {
      if (!linha.startsWith('data:')) continue;
      const dado = linha.slice(5).trim();
      if (!dado || dado === '[DONE]') continue;
      let j; try { j = JSON.parse(dado); } catch { continue; }
      if (j.error) throw Object.assign(new Error(`A OpenAI interrompeu a resposta: ${j.error.message || 'erro sem detalhe'}`), { doServidor: true });
      if (j.usage) usage = j.usage;
      const ch = j.choices?.[0]; if (!ch) continue;
      if (ch.finish_reason) fim = ch.finish_reason;
      const d = ch.delta || {};
      if (d.content) { msg.content += d.content; aoTexto?.(msg.content); }
      if (d.refusal) msg.refusal += d.refusal;
      for (const tc of d.tool_calls || []) {
        const cur = (msg.tool_calls[tc.index ?? 0] ||= { id: '', type: 'function', function: { name: '', arguments: '' } });
        if (tc.id) cur.id = tc.id;
        if (tc.function?.name && !cur.function.name) cur.function.name = tc.function.name;
        if (tc.function?.arguments) cur.function.arguments += tc.function.arguments;
      }
    }
  };
  for await (const pedaco of corpo) {
    rearmar();
    buf += dec.decode(pedaco, { stream: true });
    let i;
    while ((i = buf.search(/\r?\n\r?\n/)) >= 0) { const b = buf.slice(0, i); buf = buf.slice(i).replace(/^\r?\n\r?\n/, ''); bloco(b); }
  }
  if (buf.trim()) bloco(buf);
  const tool_calls = msg.tool_calls.filter(Boolean).map((c, n) => ({ ...c, id: c.id || `call_${Date.now()}_${n}` }));
  return { usage, choices: [{ finish_reason: fim, message: { role: 'assistant', content: msg.content || null, refusal: msg.refusal || null, ...(tool_calls.length ? { tool_calls } : {}) } }] };
}

async function chamarApi(caminho, { metodo = 'GET', corpo, sinal, chave = chaveOpenAI(), stream = false, aoTexto } = {}) {
  if (!chave) throw new Error('Falta a chave da API da OpenAI (Configurações › OpenAI).');
  let ultimo;
  for (let tentativa = 0; tentativa < 4; tentativa++) {
    const ctrl = new AbortController();
    const aoCancelar = () => ctrl.abort();
    sinal?.addEventListener('abort', aoCancelar, { once: true });
    let ocioso; let desistiu = false; let recebeu = false;
    // sem nenhum dado por SEM_DADOS_MS (ou 3 min numa chamada comum): desiste. Em streaming, cada pedaço recebido zera o relógio.
    const armar = () => { clearTimeout(ocioso); ocioso = setTimeout(() => { desistiu = true; ctrl.abort(); }, stream ? SEM_DADOS_MS : Math.max(SEM_DADOS_MS, 180_000)); };
    try {
      armar();
      const r = await fetch(`${BASE}${caminho}`, {
        method: metodo, signal: ctrl.signal,
        headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json', ...(stream ? { Accept: 'text/event-stream' } : {}) },
        body: corpo ? JSON.stringify(stream ? { ...corpo, stream: true, stream_options: { include_usage: true } } : corpo) : undefined,
      });
      if (r.ok) {
        if (stream && /event-stream/i.test(r.headers.get('content-type') || '')) { recebeu = true; return await lerStream(r.body, armar, aoTexto); }
        return await r.json(); // sem streaming (ou servidor que ignorou o pedido de stream)
      }
      const j = await r.json().catch(() => ({}));
      const msg = j?.error?.message || '';
      ultimo = new Error(`OpenAI respondeu ${r.status}${msg ? `: ${msg}` : ''}`);
      if ((r.status !== 429 && r.status < 500) || /quota|billing/i.test(msg)) throw Object.assign(ultimo, { definitivo: true });
      clearTimeout(ocioso);
      await dormir(Math.min(20_000, Number(r.headers.get('retry-after')) * 1000 || 2000 * 2 ** tentativa), sinal);
    } catch (e) {
      if (sinal?.aborted) throw new Error('Interrompido.');
      if (e.definitivo || e.doServidor) throw e;
      if (desistiu) throw new Error(`A OpenAI parou de responder (sem dados por ${Math.round(SEM_DADOS_MS / 1000)} segundos).`);
      if (recebeu) throw new Error(`A conexão com a OpenAI caiu no meio da resposta: ${e.cause?.code || e.message}`);
      if (/^OpenAI respondeu/.test(e.message)) throw e;
      ultimo = new Error(`Sem conexão com a OpenAI: ${e.cause?.code || e.message}`);
      await dormir(1500 * (tentativa + 1), sinal);
    } finally { clearTimeout(ocioso); sinal?.removeEventListener('abort', aoCancelar); }
  }
  throw ultimo;
}
const dormir = (ms, sinal) => new Promise((ok, falha) => {
  const t = setTimeout(ok, ms);
  sinal?.addEventListener('abort', () => { clearTimeout(t); falha(new Error('Interrompido.')); }, { once: true });
});

// confere uma chave nova na própria OpenAI antes de guardar
export const testarChave = (chave) => chamarApi('/models', { chave });

export async function listarModelos() {
  const j = await chamarApi('/models');
  const fora = /embed|whisper|tts|audio|transcribe|realtime|image|dall-e|moderation|davinci|babbage|search|computer-use|codex|instruct/i;
  return (j.data || []).map((m) => m.id).filter((id) => /^(gpt|o\d|chatgpt)/i.test(id) && !fora.test(id)).sort();
}

// ---------- caminhos e ferramentas (tudo preso à pasta do cérebro) ----------
const PROTEGIDOS = [/^\.git(\/|$)/, /^\.claude\/(hooks|settings)/, /(^|\/)\.env/];
const OCULTOS = new Set(['.git', 'node_modules', '.DS_Store', '.trash']);
const falha = (m) => Object.assign(new Error(m), { daFerramenta: true });
const rel = (abs) => path.relative(CTX.vault, abs).split(path.sep).join('/');

function resolver(relativo, { escrita = false } = {}) {
  const base = CTX.vault;
  const alvo = path.resolve(base, String(relativo ?? '').replace(/^\/+/, '') || '.');
  if (alvo !== base && !alvo.startsWith(base + path.sep)) throw falha('Caminho fora do cérebro.');
  let existente = alvo;
  while (!fs.existsSync(existente)) {
    // atalho quebrado: não dá pra saber pra onde aponta
    try { if (fs.lstatSync(existente).isSymbolicLink()) throw falha('Caminho inválido (atalho quebrado).'); } catch (e) { if (e.daFerramenta) throw e; }
    existente = path.dirname(existente);
  }
  const real = fs.realpathSync(existente);
  if (real !== base && !real.startsWith(base + path.sep)) throw falha('Caminho fora do cérebro.');
  if (escrita) {
    if (PROTEGIDOS.some((p) => p.test(rel(alvo)))) throw falha('Esse caminho é protegido e não pode ser alterado.');
    try { if (fs.lstatSync(alvo).isSymbolicLink()) throw falha('Não altero atalhos.'); } catch (e) { if (e.daFerramenta) throw e; }
  }
  return alvo;
}
const ehTexto = (buf) => !buf.subarray(0, 4096).includes(0);
const cortar = (s) => (s.length > MAX_RESULTADO ? `${s.slice(0, MAX_RESULTADO)}\n[… cortado: ${s.length - MAX_RESULTADO} caracteres a mais]` : s);

const FERRAMENTAS = {
  listar_pasta: {
    descricao: 'Lista os arquivos e pastas de uma pasta do cérebro (caminho relativo; vazio = raiz).',
    parametros: { type: 'object', properties: { caminho: { type: 'string', description: 'Pasta, ex.: projetos/ideias. Vazio = raiz.' } } },
    descrever: (a) => `Listando ${a.caminho || 'a raiz'}`,
    async rodar(a) {
      const dir = resolver(a.caminho);
      if (!fs.statSync(dir).isDirectory()) throw falha('Isso não é uma pasta.');
      const itens = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => !OCULTOS.has(d.name)).sort((x, y) => (y.isDirectory() - x.isDirectory()) || x.name.localeCompare(y.name, 'pt'));
      return cortar(itens.slice(0, 300).map((d) => (d.isDirectory() ? `${d.name}/` : `${d.name} (${fs.statSync(path.join(dir, d.name)).size} bytes)`)).join('\n') || '(vazia)') + (itens.length > 300 ? `\n[… mais ${itens.length - 300} itens]` : '');
    },
  },
  ler_arquivo: {
    descricao: 'Lê um arquivo de texto do cérebro. Opcionalmente só um trecho de linhas.',
    parametros: { type: 'object', properties: { caminho: { type: 'string' }, linha_inicial: { type: 'integer', description: 'Começa em 1.' }, linha_final: { type: 'integer' } }, required: ['caminho'] },
    descrever: (a) => `Lendo ${a.caminho}`,
    async rodar(a) {
      const f = resolver(a.caminho);
      const st = fs.statSync(f);
      if (!st.isFile()) throw falha('Isso não é um arquivo.');
      if (st.size > MAX_ARQUIVO) throw falha('Arquivo grande demais (acima de 1 MB).');
      const buf = fs.readFileSync(f);
      if (!ehTexto(buf)) throw falha('Arquivo binário: só leio texto.');
      let linhas = buf.toString('utf8').split('\n');
      const total = linhas.length;
      if (a.linha_inicial || a.linha_final) linhas = linhas.slice(Math.max(0, (a.linha_inicial || 1) - 1), a.linha_final || undefined);
      return cortar(linhas.join('\n')) + (total > linhas.length ? `\n[arquivo tem ${total} linhas]` : '');
    },
  },
  buscar_texto: {
    descricao: 'Procura um texto (sem diferenciar maiúsculas) nos arquivos de texto do cérebro. Devolve caminho:linha: trecho.',
    parametros: { type: 'object', properties: { consulta: { type: 'string' }, pasta: { type: 'string', description: 'Opcional: limita a uma pasta.' } }, required: ['consulta'] },
    descrever: (a) => `Buscando "${String(a.consulta).slice(0, 60)}"`,
    async rodar(a) {
      const q = String(a.consulta || '').toLowerCase();
      if (q.length < 2) throw falha('Busca curta demais.');
      const achados = []; let lidos = 0;
      (function andar(dir) {
        if (achados.length >= 40 || lidos > 3000) return;
        let itens = []; try { itens = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const d of itens) {
          if (OCULTOS.has(d.name) || d.isSymbolicLink()) continue;
          const abs = path.join(dir, d.name);
          if (d.isDirectory()) { andar(abs); continue; }
          let st; try { st = fs.statSync(abs); } catch { continue; }
          if (st.size > MAX_ARQUIVO) continue;
          const buf = fs.readFileSync(abs); lidos++;
          if (!ehTexto(buf)) continue;
          const linhas = buf.toString('utf8').split('\n');
          for (let i = 0; i < linhas.length && achados.length < 40; i++) {
            if (linhas[i].toLowerCase().includes(q)) achados.push(`${rel(abs)}:${i + 1}: ${linhas[i].trim().slice(0, 200)}`);
          }
        }
      })(resolver(a.pasta));
      return achados.join('\n') || 'Nada encontrado.';
    },
  },
  escrever_arquivo: {
    descricao: 'Cria ou sobrescreve um arquivo de texto no cérebro (cria as pastas que faltarem). Pra mudar um trecho, prefira editar_arquivo.',
    parametros: { type: 'object', properties: { caminho: { type: 'string' }, conteudo: { type: 'string' } }, required: ['caminho', 'conteudo'] },
    descrever: (a) => (/^sessoes\/[0-9a-f-]{36}\.md$/.test(a.caminho || '') ? 'Atualizando a nota de status' : `Escrevendo ${a.caminho}`),
    async rodar(a) {
      if (typeof a.conteudo !== 'string') throw falha('Conteúdo inválido.');
      if (Buffer.byteLength(a.conteudo) > MAX_ARQUIVO) throw falha('Conteúdo grande demais (acima de 1 MB).');
      const f = resolver(a.caminho, { escrita: true });
      if (fs.existsSync(f) && !fs.statSync(f).isFile()) throw falha('Isso é uma pasta.');
      fs.mkdirSync(path.dirname(f), { recursive: true });
      const tmp = `${f}.${process.pid}.salvando`;
      fs.writeFileSync(tmp, a.conteudo); fs.renameSync(tmp, f);
      return `Salvo: ${rel(f)} (${Buffer.byteLength(a.conteudo)} bytes).`;
    },
  },
  editar_arquivo: {
    descricao: 'Troca um trecho de um arquivo por outro. "antigo" precisa aparecer exatamente uma vez; leia o arquivo antes.',
    parametros: { type: 'object', properties: { caminho: { type: 'string' }, antigo: { type: 'string' }, novo: { type: 'string' } }, required: ['caminho', 'antigo', 'novo'] },
    descrever: (a) => `Editando ${a.caminho}`,
    async rodar(a) {
      const f = resolver(a.caminho, { escrita: true });
      if (!fs.existsSync(f) || !fs.statSync(f).isFile()) throw falha('Arquivo não encontrado.');
      if (fs.statSync(f).size > MAX_ARQUIVO) throw falha('Arquivo grande demais.');
      if (typeof a.antigo !== 'string' || !a.antigo || typeof a.novo !== 'string') throw falha('Informe "antigo" e "novo".');
      const txt = fs.readFileSync(f, 'utf8');
      const n = txt.split(a.antigo).length - 1;
      if (n === 0) throw falha('O trecho "antigo" não foi encontrado.');
      if (n > 1) throw falha(`O trecho "antigo" aparece ${n} vezes; inclua mais contexto pra ficar único.`);
      const tmp = `${f}.${process.pid}.salvando`;
      fs.writeFileSync(tmp, txt.replace(a.antigo, () => a.novo)); fs.renameSync(tmp, f);
      return `Editado: ${rel(f)}.`;
    },
  },
  executar_comando: {
    soComShell: true,
    descricao: 'Roda um comando de shell (bash) neste servidor, na pasta do cérebro, com limite de 60 segundos. Use só quando as outras ferramentas não bastarem.',
    parametros: { type: 'object', properties: { comando: { type: 'string' } }, required: ['comando'] },
    descrever: (a) => `Rodando: ${String(a.comando).replace(/\s+/g, ' ').slice(0, 90)}`,
    rodar(a, ctx) {
      if (typeof a.comando !== 'string' || !a.comando.trim()) throw falha('Comando vazio.');
      return new Promise((ok) => {
        const env = { ...ctx.env }; delete env.OPENAI_API_KEY;
        const p = spawn('bash', ['-c', a.comando], { cwd: CTX.vault, env, stdio: ['ignore', 'pipe', 'pipe'] });
        let saida = ''; const junta = (d) => { if (saida.length < MAX_RESULADO_SHELL) saida += d; };
        p.stdout.on('data', junta); p.stderr.on('data', junta);
        const t = setTimeout(() => p.kill('SIGKILL'), 60_000);
        const parar = () => p.kill('SIGKILL'); ctx.sinal?.addEventListener('abort', parar, { once: true });
        p.on('error', (e) => { clearTimeout(t); ok(`Erro ao rodar: ${e.message}`); });
        p.on('close', (code, sig) => { clearTimeout(t); ok(cortar(`${saida.trim() || '(sem saída)'}\n[saiu com ${sig ? `sinal ${sig}` : `código ${code}`}]`)); });
      });
    },
  },
};
const MAX_RESULADO_SHELL = 60_000;
// ferramentas de outros módulos (ex.: WordPress); `disponivel()` decide se aparecem pro modelo
export function registrarFerramentas(extras) {
  for (const [nome, f] of Object.entries(extras)) FERRAMENTAS[nome] = { ...f, rodar: async (a, ctx) => { try { return await f.rodar(a, ctx); } catch (e) { throw falha(e.message); } } };
}
const ligada = (f, shell) => (shell || !f.soComShell) && (!f.disponivel || f.disponivel());
const esquemaFerramentas = (shell) => Object.entries(FERRAMENTAS).filter(([, f]) => ligada(f, shell))
  .map(([name, f]) => ({ type: 'function', function: { name, description: f.descricao, parameters: f.parametros } }));

async function executarFerramenta(nome, args, ctx) {
  const f = FERRAMENTAS[nome];
  if (!f || !ligada(f, ctx.shell)) return `Erro: ferramenta "${nome}" não existe.`;
  try { return String(await f.rodar(args, ctx)); }
  catch (e) {
    const humano = { ENOENT: 'arquivo ou pasta não encontrado.', EACCES: 'sem permissão.', EISDIR: 'isso é uma pasta, não um arquivo.', ENOTDIR: 'parte do caminho não é uma pasta.' }[e.code];
    return `Erro: ${e.daFerramenta ? e.message : humano || `falhou (${e.code || e.message})`}`;
  }
}

// ---------- histórico da conversa (arquivo por conversa) ----------
const arqConversa = (id) => path.join(CTX.dados, 'openai', `${String(id).replace(/[^0-9a-f-]/gi, '')}.json`);
const carregar = (id) => lerJson(arqConversa(id), { mensagens: [], itens: [], uso: { entrada: 0, saida: 0 } });
const guardar = (id, est) => { const f = arqConversa(id); fs.writeFileSync(`${f}.tmp`, JSON.stringify(est)); fs.renameSync(`${f}.tmp`, f); };
const parciais = new Map(); // id da conversa -> texto que está chegando em streaming
export function historicoOpenAI(id) {
  const itens = carregar(id).itens; const p = parciais.get(id);
  return p ? [...itens, { papel: 'claude', texto: p, quando: Date.now(), parcial: true }] : itens;
}
export const usoConversaOpenAI = (id) => carregar(id).uso;

// tira as voltas mais antigas quando o histórico passa do limite (sempre começando numa mensagem do usuário)
function podar(mensagens) {
  const tam = (m) => (typeof m.content === 'string' ? m.content.length : 0) + JSON.stringify(m.tool_calls || '').length;
  let total = mensagens.reduce((s, m) => s + tam(m), 0);
  while (total > LIMITE_CONTEXTO) {
    const prox = mensagens.findIndex((m, i) => i > 0 && m.role === 'user');
    if (prox < 0) break;
    for (const m of mensagens.splice(0, prox)) total -= tam(m);
  }
}

function sistema(prompt, shell) {
  let regras = '';
  for (const n of ['AGENTS.md', 'CLAUDE.md']) { try { regras = fs.readFileSync(path.join(CTX.vault, n), 'utf8').slice(0, 20_000); if (regras) break; } catch { /* */ } }
  // nada que mude de um pedido pro outro (hora, etc.): o início idêntico é o que o cache automático da OpenAI reaproveita
  return [
    'Você é o agente do Core OS, o segundo cérebro do dono: uma pasta de arquivos .md. Responda sempre em português do Brasil.',
    `Você trabalha só com ferramentas (${esquemaFerramentas(shell).map((f) => f.function.name).join(', ')}). Os caminhos são relativos à pasta do cérebro ("" ou "." é a raiz).`,
    'Leia um arquivo antes de editá-lo e não invente o que não leu. Se uma ferramenta der erro, leia a mensagem e tente de outro jeito.',
    shell ? '' : 'Você não tem terminal neste servidor: se algo exigir rodar comando, diga ao dono o que precisaria.',
    'A data e a hora de Brasília vêm no começo de cada mensagem do dono, entre colchetes.',
    prompt || '',
    regras ? `\n--- Regras deste cérebro ---\n${regras}` : '',
  ].filter(Boolean).join('\n');
}

// ---------- o agente ----------
const rodando = new Map(); // id da conversa -> AbortController
export function pararOpenAI(id) { const c = rodando.get(id); if (c) { c.abort(); return true; } return false; }
export const rodandoOpenAI = (id) => rodando.has(id);

const descreverArgs = (nome, args) => { try { return FERRAMENTAS[nome]?.descrever(args) || nome; } catch { return nome; } };

// mesma forma de rodarSemTela dos outros motores: devolve { resposta, sessao }
export async function rodarOpenAI(conv, texto, { prompt, env, aoAcao } = {}) {
  if (rodando.has(conv.id)) return { resposta: 'Essa conversa já está respondendo. Espere terminar ou clique em Parar.' };
  const ctrl = new AbortController(); rodando.set(conv.id, ctrl);
  const cfg = lerConfigOpenAI();
  const est = carregar(conv.id);
  const inicio = est.mensagens.length;
  // a hora vai na mensagem (que vem depois do trecho repetido), não no prompt do sistema, pra não quebrar o cache
  const agora = new Intl.DateTimeFormat('pt-BR', { timeZone: FUSO, dateStyle: 'full', timeStyle: 'short' }).format(new Date());
  const carimbada = `[Agora em Brasília: ${agora}]\n\n${texto}`;
  est.mensagens.push({ role: 'user', content: carimbada });
  est.itens.push({ papel: 'voce', texto, quando: Date.now() });
  guardar(conv.id, est);
  let resposta = ''; let parcial = '';
  try {
    if (!cfg.modelo) throw new Error('Escolha um modelo em Configurações › OpenAI (API).');
    if (cfg.limiteDiario > 0) { const h = usoOpenAI().hoje; if (h.entrada + h.saida >= cfg.limiteDiario) throw new Error(`Limite diário de ${cfg.limiteDiario.toLocaleString('pt-BR')} tokens atingido. Ajuste em Configurações › OpenAI (API).`); }
    const ctx = { shell: cfg.shell, env: env || process.env, sinal: ctrl.signal };
    const tools = esquemaFerramentas(cfg.shell);
    let terminou = false;
    for (let passo = 0; passo < cfg.maxPassos && !terminou; passo++) {
      podar(est.mensagens);
      const corpo = { model: cfg.modelo, messages: [{ role: 'system', content: sistema(prompt, cfg.shell) }, ...est.mensagens], tools };
      if (cfg.maxSaida > 0) corpo.max_completion_tokens = cfg.maxSaida;
      if (NA_OPENAI) corpo.prompt_cache_key = conv.id; // junta os pedidos da mesma conversa no mesmo cache
      conv.ultimaAcao = 'Pensando…'; conv.ultimaAtividade = Date.now();
      let r;
      try {
        r = await chamarApi('/chat/completions', { metodo: 'POST', corpo, sinal: ctrl.signal, stream: cfg.streaming,
          aoTexto: (t) => { if (!parciais.has(conv.id)) conv.ultimaAcao = 'Escrevendo a resposta…'; parciais.set(conv.id, t); } });
      } catch (e) { parcial = parciais.get(conv.id) || ''; throw e; } finally { parciais.delete(conv.id); }
      const ent = r.usage?.prompt_tokens || 0; const sai = r.usage?.completion_tokens || 0; const cache = r.usage?.prompt_tokens_details?.cached_tokens || 0;
      est.uso.entrada += ent; est.uso.saida += sai; est.uso.cache = (est.uso.cache || 0) + cache; somarUso(ent, sai, cache);
      const escolha = r.choices?.[0]; const msg = escolha?.message;
      if (!msg) throw new Error('A OpenAI respondeu sem mensagem.');
      const chamadas = (msg.tool_calls || []).filter((c) => c.type === 'function' || c.function);
      const conteudo = (msg.content || msg.refusal || '').trim();
      est.mensagens.push({ role: 'assistant', content: msg.content ?? (msg.refusal || null), ...(chamadas.length ? { tool_calls: chamadas.map((c) => ({ id: c.id, type: 'function', function: { name: c.function.name, arguments: c.function.arguments } })) } : {}) });
      if (conteudo) est.itens.push({ papel: 'claude', texto: conteudo, quando: Date.now() });
      if (!chamadas.length) { resposta = conteudo || 'Feito.'; if (escolha.finish_reason === 'length') resposta += '\n\n(a resposta foi cortada pelo limite de tokens)'; terminou = true; guardar(conv.id, est); break; }
      for (const c of chamadas) {
        let args = {};
        try { args = JSON.parse(c.function.arguments || '{}'); } catch { /* resultado abaixo explica */ }
        const acao = descreverArgs(c.function.name, args);
        est.itens.push({ papel: 'acao', texto: acao, quando: Date.now() }); conv.ultimaAcao = acao; conv.ultimaAtividade = Date.now(); aoAcao?.(acao); guardar(conv.id, est);
        const resultado = args && typeof args === 'object' ? await executarFerramenta(c.function.name, args, ctx) : 'Erro: argumentos inválidos.';
        est.mensagens.push({ role: 'tool', tool_call_id: c.id, content: cortar(resultado) });
        if (ctrl.signal.aborted) throw new Error('Interrompido.');
      }
      guardar(conv.id, est);
    }
    if (!terminou) resposta = `Parei depois de ${cfg.maxPassos} passos sem terminar (limite de passos por pedido). Peça pra continuar ou aumente o limite em Configurações › OpenAI (API).`;
  } catch (e) {
    // mantém o histórico coerente: a volta vira "pergunta + aviso de erro", sem chamadas de ferramenta penduradas
    resposta = e.message === 'Interrompido.' ? 'Interrompido por você.' : `Não consegui concluir: ${e.message}`;
    est.mensagens.splice(inicio, est.mensagens.length - inicio, { role: 'user', content: carimbada }, { role: 'assistant', content: resposta });
    // o que já tinha chegado em streaming continua visível (só na tela; não entra no contexto da API)
    if (parcial.trim()) est.itens.push({ papel: 'claude', texto: `${parcial.trim()}\n\n_(interrompido)_`, quando: Date.now() });
  } finally { rodando.delete(conv.id); }
  if (!est.itens.some((i) => i.papel === 'claude' && i.texto === resposta)) est.itens.push({ papel: 'claude', texto: resposta, quando: Date.now() });
  guardar(conv.id, est);
  return { resposta, sessao: null };
}
