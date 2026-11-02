// Core OS · WordPress: publica posts no seu site pela API REST do WordPress (wp-json), com "senha de aplicativo".
// Um só lugar faz tudo (painel, agente OpenAI e a skill do Claude Code/Codex chamam estas funções):
// markdown → HTML, imagens locais do cérebro sobem pra biblioteca de mídia, categorias e tags por nome.
// As credenciais ficam em dados/wordpress.json (600) ou no .env (WP_URL, WP_USER, WP_APP_PASSWORD) e nunca vão pro cérebro.
import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';

let CTX = { dados: '', vault: '' };
export function iniciarWordPress({ dados, vault }) { CTX = { dados, vault }; }

const arqCfg = () => path.join(CTX.dados, 'wordpress.json');
const lerJson = (f, padrao) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return padrao; } };
const MAX_MIDIA = 50 * 1024 * 1024;
const TIPOS = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4', '.mov': 'video/quicktime', '.webm': 'video/webm', '.m4v': 'video/x-m4v', '.pdf': 'application/pdf', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4' };
export const STATUS = ['draft', 'publish', 'future', 'pending', 'private'];

// ---------- configuração ----------
export function normalizarUrl(u) {
  let s = String(u || '').trim().replace(/\/+$/, '').replace(/\/wp-json$/i, '').replace(/\/wp-admin.*$/i, '');
  if (!s) return '';
  if (!/^https?:\/\//i.test(s)) s = `https://${s}`;
  let url; try { url = new URL(s); } catch { throw new Error('Endereço do site inválido.'); }
  if (!/^https?:$/.test(url.protocol) || url.username || url.password) throw new Error('Endereço do site inválido.');
  return `${url.origin}${url.pathname.replace(/\/+$/, '')}`;
}
export function lerConfigWP() {
  const env = { url: process.env.WP_URL || '', usuario: process.env.WP_USER || '', senha: process.env.WP_APP_PASSWORD || '' };
  if (env.url && env.usuario && env.senha) return { ...env, url: normalizarUrl(env.url), origem: 'ambiente', rotaQuery: lerJson(arqCfg(), {}).rotaQuery || false };
  const c = lerJson(arqCfg(), {});
  return c.url && c.usuario && c.senha ? { ...c, origem: 'painel' } : null;
}
export function estadoWP() {
  const c = lerConfigWP();
  const extra = lerJson(arqCfg(), {});
  return c ? { configurado: true, origem: c.origem, url: c.url, usuario: c.usuario, nome: extra.nome || '', final: c.senha.replace(/\s/g, '').slice(-4) }
    : { configurado: false };
}
export function apagarConfigWP() { try { fs.unlinkSync(arqCfg()); } catch { /* */ } }

// ---------- API ----------
function endereco(cfg, rota, query = {}) {
  const q = new URLSearchParams(Object.entries(query).filter(([, v]) => v !== undefined && v !== '').map(([k, v]) => [k, String(v)]));
  // sites sem "links permanentes" não têm /wp-json: usam ?rest_route=
  if (cfg.rotaQuery) { q.set('rest_route', rota); return `${cfg.url}/?${q}`; }
  return `${cfg.url}/wp-json${rota}${q.size ? `?${q}` : ''}`;
}
async function wp(cfg, rota, { metodo = 'GET', query, json, corpo, cabecalhos = {}, tempo = 60_000 } = {}) {
  const auth = Buffer.from(`${cfg.usuario}:${cfg.senha.replace(/\s/g, '')}`).toString('base64');
  let r;
  try {
    r = await fetch(endereco(cfg, rota, query), {
      method: metodo, signal: AbortSignal.timeout(tempo), redirect: 'follow',
      headers: { Authorization: `Basic ${auth}`, Accept: 'application/json', ...(json ? { 'Content-Type': 'application/json' } : {}), ...cabecalhos },
      body: json ? JSON.stringify(json) : corpo,
    });
  } catch (e) {
    throw new Error(e.name === 'TimeoutError' ? 'O site demorou demais pra responder.' : `Não consegui falar com o site (${e.cause?.code || e.message}).`);
  }
  const texto = await r.text();
  let j; try { j = JSON.parse(texto); } catch { j = null; }
  if (!r.ok) {
    const msg = j?.message ? String(j.message).replace(/<[^>]+>/g, '').trim() : '';
    const dica = r.status === 401 ? ' Confira o usuário e a senha de aplicativo.' : r.status === 403 ? ' Esse usuário não tem permissão pra isso.' : r.status === 404 && !j ? ' A API REST não respondeu nesse endereço.' : '';
    throw Object.assign(new Error(`WordPress respondeu ${r.status}${msg ? `: ${msg.replace(/[.\s]+$/, '')}` : ''}.${dica}`), { status: r.status, codigo: j?.code });
  }
  if (j === null) throw Object.assign(new Error('O site não devolveu JSON (a API REST pode estar bloqueada por um plugin de segurança ou pelo provedor).'), { naoJson: true });
  return j;
}

// confere as credenciais e descobre como chegar na API; devolve o nome do usuário
export async function testarWP({ url, usuario, senha }) {
  const base = { url: normalizarUrl(url), usuario: String(usuario || '').trim(), senha: String(senha || '').trim() };
  if (!base.url || !base.usuario || !base.senha) throw new Error('Preencha o endereço, o usuário e a senha de aplicativo.');
  if (!/^https:/i.test(base.url) && !/^http:\/\/(localhost|127\.|10\.|192\.168\.|wordpress[:/])/i.test(base.url)) throw new Error('Use o endereço com https:// (a senha de aplicativo só funciona com HTTPS).');
  let ultimo;
  for (const rotaQuery of [false, true]) {
    try {
      const eu = await wp({ ...base, rotaQuery }, '/wp/v2/users/me', { query: { context: 'edit' }, tempo: 20_000 });
      const pode = eu.capabilities || {};
      if (eu.capabilities && !pode.edit_posts) throw new Error('Esse usuário não pode escrever posts (precisa ser Autor, Editor ou Administrador).');
      return { ...base, rotaQuery, nome: eu.name || eu.slug || base.usuario, podePublicar: eu.capabilities ? Boolean(pode.publish_posts) : true };
    } catch (e) {
      ultimo = e;
      if (!(e.status === 404 || e.naoJson)) break; // só tenta o outro formato de rota quando a API não foi achada
    }
  }
  throw ultimo;
}
export async function salvarConfigWP(dados) {
  const ok = await testarWP(dados);
  fs.writeFileSync(arqCfg(), JSON.stringify({ url: ok.url, usuario: ok.usuario, senha: ok.senha, rotaQuery: ok.rotaQuery, nome: ok.nome }, null, 2), { mode: 0o600 });
  return ok;
}
function exigirCfg() {
  const c = lerConfigWP();
  if (!c) throw new Error('O WordPress não está conectado. Conecte em Configurações › WordPress no painel.');
  return c;
}

// ---------- arquivos do cérebro ----------
function dentroDoCerebro(rel) {
  const alvo = path.resolve(CTX.vault, String(rel || '').replace(/^\/+/, ''));
  let real; try { real = fs.realpathSync(alvo); } catch { throw new Error(`Arquivo não encontrado: ${rel}`); }
  if (real !== CTX.vault && !real.startsWith(CTX.vault + path.sep)) throw new Error('Caminho fora do cérebro.');
  if (!fs.statSync(real).isFile()) throw new Error(`Isso não é um arquivo: ${rel}`);
  return real;
}

const enviadas = new Map(); // caminho real + data de modificação -> mídia já enviada (não sobe a mesma imagem duas vezes)
export async function enviarMidia(caminho, { titulo, alt } = {}) {
  const cfg = exigirCfg();
  const f = dentroDoCerebro(caminho);
  const st = fs.statSync(f);
  if (st.size > MAX_MIDIA) throw new Error(`Arquivo grande demais pra subir (acima de 50 MB): ${caminho}`);
  const tipo = TIPOS[path.extname(f).toLowerCase()];
  if (!tipo) throw new Error(`Tipo de arquivo não suportado pra mídia: ${caminho}`);
  const chave = `${cfg.url}|${f}|${st.mtimeMs}`;
  if (enviadas.has(chave)) return enviadas.get(chave);
  const nome = path.basename(f).replace(/[^\w.\-]+/g, '-');
  const m = await wp(cfg, '/wp/v2/media', { metodo: 'POST', corpo: fs.readFileSync(f), tempo: 180_000,
    cabecalhos: { 'Content-Type': tipo, 'Content-Disposition': `attachment; filename="${nome}"` } });
  if (titulo || alt) await wp(cfg, `/wp/v2/media/${m.id}`, { metodo: 'POST', json: { ...(titulo ? { title: titulo } : {}), ...(alt ? { alt_text: alt } : {}) } }).catch(() => {});
  const r = { id: m.id, url: m.source_url };
  enviadas.set(chave, r);
  return r;
}

// ---------- categorias e tags por nome (cria as que não existem) ----------
async function termos(cfg, tipo, nomes) {
  const ids = [];
  for (const bruto of nomes || []) {
    if (Number.isInteger(bruto)) { ids.push(bruto); continue; }
    const nome = String(bruto).trim(); if (!nome) continue;
    const achados = await wp(cfg, `/wp/v2/${tipo}`, { query: { search: nome, per_page: 100, context: 'edit' } });
    const igual = achados.find((t) => t.name.toLowerCase() === nome.toLowerCase() || t.slug === nome.toLowerCase());
    if (igual) { ids.push(igual.id); continue; }
    try { ids.push((await wp(cfg, `/wp/v2/${tipo}`, { metodo: 'POST', json: { name: nome } })).id); }
    catch (e) { if (e.codigo === 'term_exists') { /* corrida: outro pedido criou */ } else throw e; }
  }
  return [...new Set(ids)];
}
export async function listarCategorias() {
  const cfg = exigirCfg();
  return (await wp(cfg, '/wp/v2/categories', { query: { per_page: 100, orderby: 'count', order: 'desc' } })).map((c) => ({ id: c.id, nome: c.name, posts: c.count }));
}

// ---------- conteúdo ----------
// lê um .md do cérebro: frontmatter simples (titulo, status, categorias, tags, resumo, imagem, slug, data) + corpo
export function lerNotaMd(texto) {
  const meta = {}; let corpo = String(texto || '');
  corpo = corpo.replace(/^﻿?---\r?\n([\s\S]*?)\r?\n---\r?\n?/, (_, fm) => {
    for (const linha of fm.split(/\r?\n/)) {
      const m = linha.match(/^([\wÀ-ú-]+)\s*:\s*(.*)$/); if (!m) continue;
      let v = m[2].trim().replace(/^["']|["']$/g, '');
      if (/^\[.*\]$/.test(v)) v = v.slice(1, -1).split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      meta[m[1].toLowerCase()] = v;
    }
    return '';
  });
  // um "# Título" na primeira linha vira o título do post (e sai do corpo, pra não aparecer duas vezes)
  const h1 = corpo.match(/^\s*#\s+(.+?)\s*#*\s*(\r?\n|$)/);
  if (h1) { meta.titulo ||= meta.title || h1[1]; corpo = corpo.slice(h1[0].length); }
  return { meta, corpo: corpo.trim() };
}
const lista = (v) => (Array.isArray(v) ? v : String(v || '').split(',')).map((x) => (typeof x === 'string' ? x.trim() : x)).filter((x) => x !== '');

// markdown (com [[links]] do Obsidian) → HTML, subindo as imagens locais pra biblioteca de mídia
async function prepararHtml(corpo, { formato, pastaBase }) {
  let html;
  if (formato === 'html') html = corpo;
  else {
    const md = corpo.replace(/!\[\[([^\]|]+)(\|[^\]]*)?\]\]/g, (_, a) => `![](${encodeURI(a)})`).replace(/\[\[([^\]|]+)(\|([^\]]*))?\]\]/g, (_, a, __, r) => r || a);
    html = marked.parse(md, { gfm: true });
  }
  const subidas = [];
  const trocas = new Map();
  for (const [, src] of html.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)) {
    if (/^(https?:|data:|\/\/)/i.test(src) || trocas.has(src)) continue;
    const rel = decodeURI(src).replace(/^\/+/, '');
    const candidatos = [pastaBase ? path.posix.join(pastaBase, rel) : null, rel].filter(Boolean);
    let m = null; let erro;
    for (const c of candidatos) { try { m = await enviarMidia(c); break; } catch (e) { erro = e; } }
    if (!m) throw new Error(`Não consegui subir a imagem ${src}: ${erro?.message}`);
    trocas.set(src, m.url); subidas.push(m);
  }
  for (const [de, para] of trocas) html = html.split(`"${de}"`).join(`"${para}"`).split(`'${de}'`).join(`'${para}'`);
  return { html, subidas };
}

// data "2026-11-05 09:00" ou ISO → horário do site (o WordPress usa o fuso configurado nele em `date`)
function dataWP(d) {
  const s = String(d || '').trim(); if (!s) return undefined;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/);
  if (m) return `${m[1]}T${m[2]}${m[3] || ':00'}`;
  const t = new Date(s); if (Number.isNaN(t.getTime())) throw new Error('Data inválida (use AAAA-MM-DD HH:MM).');
  return { gmt: t.toISOString().slice(0, 19) };
}

/**
 * Cria (ou atualiza, com `id`) um post.
 * { titulo, conteudo | arquivo (.md/.html do cérebro), formato: 'markdown'|'html', status, data, categorias, tags, resumo, imagem, slug, id, tipo: 'posts'|'pages' }
 */
export async function publicarWP(p = {}) {
  const cfg = exigirCfg();
  let meta = {}; let corpo = p.conteudo; let formato = p.formato; let pastaBase = '';
  if (p.arquivo) {
    const f = dentroDoCerebro(p.arquivo);
    const lido = lerNotaMd(fs.readFileSync(f, 'utf8'));
    meta = lido.meta; corpo = lido.corpo;
    formato ||= /\.html?$/i.test(f) ? 'html' : 'markdown';
    pastaBase = path.posix.dirname(path.relative(CTX.vault, f).split(path.sep).join('/'));
  } else if (typeof corpo === 'string' && (formato || 'markdown') === 'markdown') {
    const lido = lerNotaMd(corpo); meta = lido.meta; corpo = lido.corpo;
  }
  const v = (k, ...alts) => p[k] ?? [k, ...alts].map((x) => meta[x]).find((x) => x !== undefined && x !== '');
  const titulo = String(v('titulo', 'title') || '').trim();
  // post novo nasce rascunho; atualizar sem dizer o status mantém o que já está no site
  const status = String(v('status') || (p.id ? '' : 'draft')).toLowerCase();
  if (status && !STATUS.includes(status)) throw new Error(`Status inválido: use ${STATUS.join(', ')}.`);
  const data = v('data', 'date');
  if (status === 'future' && !data) throw new Error('Pra agendar (status future), informe a data.');
  const tipo = p.tipo === 'pages' ? 'pages' : 'posts';
  if (!p.id && !titulo) throw new Error('Falta o título do post.');
  if (!p.id && (typeof corpo !== 'string' || !corpo.trim())) throw new Error('Falta o conteúdo do post.');

  const corpoPost = status ? { status } : {};
  if (titulo) corpoPost.title = titulo;
  let subidas = [];
  if (typeof corpo === 'string' && corpo.trim()) {
    const r = await prepararHtml(corpo, { formato: formato === 'html' ? 'html' : 'markdown', pastaBase });
    corpoPost.content = r.html; subidas = r.subidas;
  }
  const resumo = v('resumo', 'excerpt'); if (resumo) corpoPost.excerpt = String(resumo);
  const slug = v('slug'); if (slug) corpoPost.slug = String(slug);
  const d = dataWP(data); if (d) { if (typeof d === 'string') corpoPost.date = d; else corpoPost.date_gmt = d.gmt; }
  if (tipo === 'posts') {
    const cats = lista(v('categorias', 'categoria', 'categories')); if (cats.length) corpoPost.categories = await termos(cfg, 'categories', cats);
    const tags = lista(v('tags')); if (tags.length) corpoPost.tags = await termos(cfg, 'tags', tags);
  }
  const img = v('imagem', 'capa', 'featured_image');
  if (img) {
    const rel = String(img).replace(/^\/+/, '');
    let m; try { m = await enviarMidia(pastaBase ? path.posix.join(pastaBase, rel) : rel, { titulo, alt: titulo }); } catch { m = await enviarMidia(rel, { titulo, alt: titulo }); }
    corpoPost.featured_media = m.id;
  }
  const post = await wp(cfg, p.id ? `/wp/v2/${tipo}/${Number(p.id)}` : `/wp/v2/${tipo}`, { metodo: 'POST', json: corpoPost });
  return {
    id: post.id, status: post.status, titulo: post.title?.raw ?? post.title?.rendered ?? titulo, link: post.link, data: post.date,
    editar: `${cfg.url}/wp-admin/post.php?post=${post.id}&action=edit`, imagensEnviadas: subidas.length,
  };
}

export async function listarPostsWP({ status = 'any', quantidade = 10, busca } = {}) {
  const cfg = exigirCfg();
  const st = status === 'any' ? 'publish,future,draft,pending,private' : String(status);
  const posts = await wp(cfg, '/wp/v2/posts', { query: { status: st, per_page: Math.min(Math.max(Number(quantidade) || 10, 1), 50), search: busca, context: 'edit', orderby: 'modified' } });
  return posts.map((x) => ({ id: x.id, status: x.status, titulo: x.title?.raw ?? x.title?.rendered, data: x.date, link: x.link, editar: `${cfg.url}/wp-admin/post.php?post=${x.id}&action=edit` }));
}

const ROTULO = { draft: 'rascunho', publish: 'publicado', future: 'agendado', pending: 'aguardando revisão', private: 'privado' };
export const rotuloStatus = (s) => ROTULO[s] || s;
