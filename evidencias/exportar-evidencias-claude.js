#!/usr/bin/env node
// Evidências do projeto final, versão Claude Code: lê as sessões que o Claude Code gravou para
// este repositório e escreve o mesmo que o exportar-evidencias.js escreve para o OpenCode.
//
//   Aluno, na raiz do repositório:  node evidencias/exportar-evidencias-claude.js
//   Git sem nome configurado:       node evidencias/exportar-evidencias-claude.js --aluno "Carla Mendes"
//
// Lê ~/.claude/projects/<pasta>/*.jsonl, em que <pasta> é o caminho absoluto do repositório com
// todo caractere que não é letra ou número trocado por "-" (C:\dev\meu projeto → C--dev-meu-projeto).
// Subagentes gravados em <pasta>/<sessão>/subagents/*.jsonl viram sessões de subagente.
//
// Saída em evidencias/sessoes/<aluno>/, igual à do script do OpenCode:
//   ses_claude_<sessão>.json  a sessão convertida para o formato do export do OpenCode, sem as
//                             saídas de leitura de arquivo (o conteúdo está no git)
//   ses_claude_<sessão>.md    linha do tempo: prompts, skills, subagentes, arquivos editados, testes e alertas
//   INDICE.md                 uma linha por sessão, somando as do OpenCode que já estiverem na pasta
// Como o JSON segue o formato do OpenCode, o --resumir do exportar-evidencias.js lê essas
// sessões do mesmo jeito.
// --claude <pasta>  lê as sessões de outra pasta de configuração (padrão: $CLAUDE_CONFIG_DIR ou ~/.claude)
// Sem dependências; Node 18 ou mais novo.

'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

// A análise e a escrita são as do script original, carregado sem alteração. Ele só exporta
// parte das funções; a linha acrescentada aqui expõe as que faltam, para que o formato da
// saída seja exatamente o mesmo e continue igual se o original mudar.
function carregarOriginal() {
  const arquivo = path.join(__dirname, 'exportar-evidencias.js');
  const m = new Module(arquivo, module);
  m.filename = arquivo;
  m.paths = Module._nodeModulePaths(__dirname);
  m._compile(`${fs.readFileSync(arquivo, 'utf8')}
module.exports = Object.assign(module.exports, { resumirPasta, compactar, paraPasta, nomeDoAluno, lerJson, umaLinha, SESSOES, RAIZ });`,
  arquivo);
  return m.exports;
}
const original = carregarOriginal();
const { SESSOES, RAIZ, umaLinha } = original;

const args = process.argv.slice(2);
const valorDe = (nome) => {
  const i = args.indexOf(nome);
  return i >= 0 ? args[i + 1] : undefined;
};
const CONFIG = path.resolve(valorDe('--claude') || process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude'));

// ---------------------------------------------------------------- onde estão as sessões

// O Claude Code troca por "-" tudo que não é letra ou número, inclusive ":" e acentos. A letra do
// drive às vezes aparece maiúscula, às vezes minúscula, então a comparação ignora caixa.
function pastaDoProjeto() {
  const projetos = path.join(CONFIG, 'projects');
  const nome = RAIZ.replace(/[^a-zA-Z0-9]/g, '-');
  if (!fs.existsSync(projetos)) return null;
  const achadas = fs.readdirSync(projetos).filter((p) => p.toLowerCase() === nome.toLowerCase());
  return achadas.length ? path.join(projetos, achadas.find((p) => p === nome) || achadas[0]) : null;
}

function lerLinhas(arquivo) {
  const linhas = [];
  for (const linha of fs.readFileSync(arquivo, 'utf8').split('\n')) {
    if (!linha.trim()) continue;
    try {
      linhas.push(JSON.parse(linha));
    } catch {
      // linha cortada: o Claude Code ainda estava escrevendo a sessão
    }
  }
  return linhas;
}

// ---------------------------------------------------------------- conversão para o formato do OpenCode

// Nomes das ferramentas no OpenCode, que é o que a análise do script original reconhece.
const FERRAMENTAS = {
  Bash: 'bash', PowerShell: 'bash', Read: 'read', Glob: 'glob', Grep: 'grep', LS: 'list',
  Write: 'write', Edit: 'edit', MultiEdit: 'multiedit', NotebookEdit: 'edit',
  WebFetch: 'webfetch', WebSearch: 'websearch', Skill: 'skill', Agent: 'task', Task: 'task',
};

function entradaDaFerramenta(ferramenta, entrada) {
  const e = { ...entrada };
  if (e.file_path !== undefined) { e.filePath = e.file_path; delete e.file_path; }
  if (e.notebook_path !== undefined) { e.filePath = e.notebook_path; delete e.notebook_path; }
  if (ferramenta === 'skill') e.name = e.skill;
  return e;
}

const textoDe = (conteudo) => (typeof conteudo === 'string'
  ? conteudo
  : (conteudo || []).map((c) => (c.type === 'text' ? c.text : '')).join('\n'));

const quando = (linha) => (linha.timestamp ? Date.parse(linha.timestamp) : undefined);
const entreTags = (texto, tag) => texto.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1].trim() ?? '';

// Mensagens do usuário que não foram digitadas por ele: saídas de comandos locais, avisos e
// notificações que o Claude Code injeta na conversa.
const INJETADA = /^\s*<(local-command-|bash-stdout|bash-stderr|task-notification|system-reminder|user-memory-input)/;

// Texto de um prompt do usuário, ou null quando a mensagem não é prompt. Comandos (/nome) e
// comandos de shell (!cmd) chegam embrulhados em tags.
function textoDoPrompt(texto) {
  if (INJETADA.test(texto)) return null;
  if (/<command-name>/.test(texto)) {
    const nome = entreTags(texto, 'command-name');
    const argumentos = entreTags(texto, 'command-args');
    return { texto: `${nome.startsWith('/') ? nome : `/${nome}`}${argumentos ? ` ${argumentos}` : ''}`, comando: nome.replace(/^\//, '') };
  }
  if (/<bash-input>/.test(texto)) return { texto: `! ${entreTags(texto, 'bash-input')}` };
  return { texto };
}

function converter(linhas, { id, parentID }) {
  const mensagens = [];
  const ferramentas = new Map(); // id do tool_use → parte
  let assistente = null; // mensagem aberta da resposta atual do modelo
  let usuario = null; // último prompt, para anexos
  let comandoPendente = null; // /nome que pode ser uma skill
  let titulo = '';
  let primeiroPrompt = '';
  let pasta = '';
  let inicio;
  let fim;

  const fecharAssistente = () => {
    if (!assistente) return;
    const u = assistente.uso || {};
    assistente.mensagem.parts.push({
      type: 'step-finish',
      tokens: { input: u.input_tokens || 0, output: u.output_tokens || 0, reasoning: 0,
        cache: { read: u.cache_read_input_tokens || 0, write: u.cache_creation_input_tokens || 0 } },
    });
    assistente = null;
  };

  for (const linha of linhas) {
    if (linha.type === 'ai-title' && linha.aiTitle) titulo = linha.aiTitle;
    if (linha.type === 'custom-title' && linha.customTitle) titulo = linha.customTitle;
    if (linha.type === 'summary' && linha.summary && !titulo) titulo = linha.summary;
    const t = quando(linha);
    if (t && ['user', 'assistant'].includes(linha.type)) {
      inicio ??= t;
      fim = t;
    }
    if (linha.cwd && !pasta) pasta = linha.cwd;

    if (linha.type === 'assistant') {
      const m = linha.message || {};
      if (m.model === '<synthetic>') continue; // mensagem do próprio Claude Code, não do modelo
      comandoPendente = null;
      if (!assistente || assistente.id !== m.id) {
        fecharAssistente();
        const mensagem = {
          info: { role: 'assistant', providerID: 'anthropic', modelID: m.model, time: { created: t } },
          parts: [{ type: 'step-start' }],
        };
        mensagens.push(mensagem);
        assistente = { id: m.id, mensagem };
      }
      if (m.usage) assistente.uso = m.usage; // repetida em cada bloco da mesma resposta
      for (const bloco of m.content || []) {
        if (bloco.type === 'text' && bloco.text) {
          assistente.mensagem.parts.push({ type: 'text', text: bloco.text, time: { start: t } });
        } else if (bloco.type === 'tool_use') {
          const ferramenta = FERRAMENTAS[bloco.name] || bloco.name.toLowerCase();
          const parte = {
            type: 'tool',
            tool: ferramenta,
            callID: bloco.id,
            state: { status: 'running', input: entradaDaFerramenta(ferramenta, bloco.input || {}), time: { start: t } },
          };
          ferramentas.set(bloco.id, parte);
          assistente.mensagem.parts.push(parte);
        }
      }
      continue;
    }

    if (linha.type === 'attachment' && usuario) {
      const a = linha.attachment || {};
      const caminho = a.filename || a.path || a.file?.filePath;
      if (['file', 'compact_file_reference', 'pdf_reference', 'directory'].includes(a.type) && caminho) {
        usuario.parts.push({ type: 'file', filename: path.basename(caminho), source: { path: caminho } });
      }
      continue;
    }

    if (linha.type !== 'user') continue;
    const conteudo = linha.message?.content;

    for (const bloco of Array.isArray(conteudo) ? conteudo : []) {
      if (bloco.type !== 'tool_result') continue;
      const parte = ferramentas.get(bloco.tool_use_id);
      if (!parte) continue;
      parte.state.status = bloco.is_error ? 'error' : 'completed';
      parte.state.output = textoDe(bloco.content);
      parte.state.time.end = t;
      // O Claude Code marca como erro o comando que sai com código diferente de zero.
      if (parte.tool === 'bash') parte.state.metadata = { exit: bloco.is_error ? 1 : 0 };
    }

    const texto = textoDe(Array.isArray(conteudo) ? conteudo.filter((c) => c.type === 'text') : conteudo);
    if (!texto.trim()) continue;

    // A skill chamada como comando entra como mensagem de sistema logo depois do /nome.
    if (linha.isMeta) {
      if (comandoPendente && /^\s*Base directory for this skill/.test(texto)) {
        const alvo = assistente?.mensagem || usuario;
        alvo?.parts.push({
          type: 'tool', tool: 'skill', callID: `comando-${comandoPendente}`,
          state: { status: 'completed', input: { name: comandoPendente }, output: '', time: { start: t } },
        });
      }
      comandoPendente = null;
      continue;
    }

    const prompt = textoDoPrompt(texto);
    if (!prompt) continue;
    fecharAssistente();
    usuario = { info: { role: 'user', time: { created: t } }, parts: [{ type: 'text', text: prompt.texto, time: { start: t } }] };
    mensagens.push(usuario);
    comandoPendente = prompt.comando || null;
    if (!primeiroPrompt && !prompt.comando) primeiroPrompt = prompt.texto;
  }
  fecharAssistente();

  return {
    info: {
      id,
      ...(parentID ? { parentID } : {}),
      title: titulo || umaLinha(primeiroPrompt.replace(/<\/?pasted_content[^>]*>/g, ' '), 80) || '(sem título)',
      directory: pasta,
      time: { created: inicio, updated: fim },
    },
    messages: mensagens,
  };
}

// ---------------------------------------------------------------- sessões

// Cada .jsonl é uma sessão. As linhas de subagente (isSidechain) ficam fora da sessão principal:
// nas versões antigas elas vêm no mesmo arquivo, nas novas em <sessão>/subagents/.
function sessoesDoProjeto(pasta) {
  const sessoes = [];
  for (const arquivo of fs.readdirSync(pasta).filter((f) => f.endsWith('.jsonl'))) {
    const nome = path.basename(arquivo, '.jsonl');
    const id = `ses_claude_${nome}`;
    const linhas = lerLinhas(path.join(pasta, arquivo));
    sessoes.push({ id, linhas: linhas.filter((l) => !l.isSidechain) });

    const laterais = new Map();
    for (const l of linhas.filter((x) => x.isSidechain)) {
      const agente = l.agentId || 'subagente';
      if (!laterais.has(agente)) laterais.set(agente, []);
      laterais.get(agente).push(l);
    }
    const subagentes = path.join(pasta, nome, 'subagents');
    for (const f of fs.existsSync(subagentes) ? fs.readdirSync(subagentes).filter((x) => x.endsWith('.jsonl')) : []) {
      laterais.set(path.basename(f, '.jsonl').replace(/^agent-/, ''), lerLinhas(path.join(subagentes, f)));
    }
    for (const [agente, doAgente] of laterais) {
      sessoes.push({ id: `${id}_${agente.replace(/[^a-zA-Z0-9-]/g, '-')}`, parentID: id, linhas: doAgente });
    }
  }
  return sessoes;
}

function exportar() {
  const aluno = original.nomeDoAluno();
  if (!aluno) {
    console.error('O git não sabe o seu nome. Rode de novo com --aluno "Seu Nome".');
    process.exit(1);
  }
  const projeto = pastaDoProjeto();
  if (!projeto) {
    console.error(`O Claude Code não tem sessões deste projeto nesta máquina (procurei ${RAIZ.replace(/[^a-zA-Z0-9]/g, '-')} em ${path.join(CONFIG, 'projects')}). Rode dentro da pasta do repositório.`);
    process.exit(1);
  }
  const lista = sessoesDoProjeto(projeto)
    .map((s) => original.compactar(converter(s.linhas, s)))
    .filter((s) => s.messages.length > 0);
  if (lista.length === 0) {
    console.error('O Claude Code não tem sessões deste projeto nesta máquina. Rode dentro da pasta do repositório.');
    process.exit(1);
  }

  const pasta = path.join(SESSOES, original.paraPasta(aluno));
  fs.mkdirSync(pasta, { recursive: true });
  let exportadas = 0;
  for (const sessao of lista) {
    const destino = path.join(pasta, `${sessao.info.id}.json`);
    if (original.lerJson(destino)?.info?.time?.updated === sessao.info.time.updated) continue;
    console.log(`exportando ${sessao.info.id}  ${sessao.info.title}`);
    fs.writeFileSync(destino, JSON.stringify(sessao, null, 1));
    exportadas++;
  }
  original.resumirPasta(pasta, aluno);
  console.log(`\n${exportadas} sessão(ões) exportada(s), ${lista.length - exportadas} sem mudança.`);
  console.log(`Índice: ${path.relative(process.cwd(), path.join(pasta, 'INDICE.md'))}`);
}

if (require.main === module) {
  if (args.includes('--ajuda') || args.includes('-h')) {
    const linhas = fs.readFileSync(__filename, 'utf8').split('\n').slice(1);
    const fim = linhas.findIndex((l) => !l.startsWith('//'));
    console.log(linhas.slice(0, fim).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  } else {
    exportar();
  }
} else {
  module.exports = { converter, sessoesDoProjeto, pastaDoProjeto };
}
