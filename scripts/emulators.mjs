/**
 * Sobe os emuladores do Firebase (Auth, Firestore e Functions) para o
 * protótipo local, no projeto fictício `demo-conecta-tdah`.
 *
 * Os dados (sempre fictícios) são salvos em `.emulator-data/` ao fechar
 * (Ctrl+C) e recarregados na próxima vez. O `--import` só é usado quando já
 * existe um salvamento, porque o Firebase recusa uma pasta inexistente.
 *
 * Uso: npm run emulators
 *      npm run emulators:rede  → também aceita o CELULAR (app Expo) na mesma
 *      rede (firebase.rede.json). Só em rede de confiança (casa, roteador
 *      próprio do celular), nunca em Wi-Fi público: o emulador não tem senha,
 *      e quem estiver na rede poderia mexer nos dados (fictícios) da demonstração
 */
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PASTA_DADOS = ".emulator-data";
const naRede = process.argv.includes("--rede");
const temDadosSalvos = existsSync(`${PASTA_DADOS}/firebase-export-metadata.json`);

const executar = (comando) => spawnSync(comando, { stdio: "inherit", shell: true }).status ?? 1;

// As Functions são TypeScript: compila antes de subir o emulador
if (executar("npm --prefix functions run build") !== 0) process.exit(1);

const comando = [
    "npx firebase emulators:start",
    "--only auth,firestore,functions",
    "--project demo-conecta-tdah",
    naRede ? "--config firebase.rede.json" : "",
    `--export-on-exit=${PASTA_DADOS}`,
    temDadosSalvos ? `--import=${PASTA_DADOS}` : "",
].join(" ");

process.exit(executar(comando));
