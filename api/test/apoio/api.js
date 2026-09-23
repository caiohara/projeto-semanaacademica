// Sobe a API de verdade num processo separado, como o juiz faz: MODO_TESTE e PORT
// vão no ambiente do processo filho, e o banco é um arquivo temporário descartável.
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const pastaApi = fileURLToPath(new URL('../..', import.meta.url));

function portaLivre() {
  return new Promise((resolve, reject) => {
    const servidor = createServer();
    servidor.on('error', reject);
    servidor.listen(0, () => {
      const { port } = servidor.address();
      servidor.close(() => resolve(port));
    });
  });
}

const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ambiente: variáveis a mais para o processo; valor undefined remove a variável herdada.
export async function subirApi({ modoTeste = true, ambiente = {} } = {}) {
  const porta = await portaLivre();
  const pastaBanco = mkdtempSync(join(tmpdir(), 'semana-api-'));
  const env = { ...process.env, PORT: String(porta), ARQUIVO_BANCO: join(pastaBanco, 'teste.db') };
  delete env.MODO_TESTE;
  if (modoTeste) env.MODO_TESTE = '1';
  for (const [nome, valor] of Object.entries(ambiente)) {
    if (valor === undefined) delete env[nome];
    else env[nome] = valor;
  }

  const processo = spawn(process.execPath, ['src/servidor.js'], {
    cwd: pastaApi,
    env,
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let saidaDeErro = '';
  processo.stderr.on('data', (trecho) => { saidaDeErro += trecho; });

  const url = `http://127.0.0.1:${porta}`;
  for (let tentativa = 0; ; tentativa++) {
    if (processo.exitCode !== null) throw new Error(`a API encerrou ao subir:\n${saidaDeErro}`);
    try {
      await fetch(url);
      break;
    } catch {
      if (tentativa >= 200) throw new Error(`a API não respondeu em ${url}:\n${saidaDeErro}`);
      await esperar(50);
    }
  }

  return {
    url,
    async parar() {
      if (processo.exitCode === null) {
        processo.kill();
        await once(processo, 'exit');
      }
      rmSync(pastaBanco, { recursive: true, force: true });
    },
  };
}
