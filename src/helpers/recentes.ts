/**
 * BUSCA, RECENTES E "MENSAGEM NOVA" NA LISTA DE ALUNOS (etapa 5)
 *
 * Para quem acompanha muitos alunos (a psiquiatra, com mais de 50 pastas):
 *  - busca pelo nome, feita no próprio aparelho (rápida e sem gastar internet);
 *  - "recentes": as pastas com a conversa mais nova primeiro;
 *  - "mensagem nova": discreta, sem notificação (decidido em 04/11/2026).
 * "Até onde a pessoa leu" fica só no aparelho (o servidor não sabe quem leu
 * o quê; RN09 continua sem registrar leitura de texto).
 * Lógica pura: sem acesso ao banco, usada pelo app e testada no Node.
 */
// `import type`: some ao rodar, então os testes de lógica rodam direto no Node
import type { Pasta, UltimaMensagem } from "@/types/pasta";

/** Até este número de pastas, a Home mostra os cartões; acima, busca e recentes */
export const POUCAS_PASTAS = 2;

/** Quantas conversas recentes a Home mostra */
export const QUANTAS_RECENTES = 8;

/** "João Pedro " → "joao pedro": a busca ignora acentos e maiúsculas */
export const semAcentos = (texto: string) =>
    texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/**
 * Pastas que combinam com a busca. Procura no nome do aluno e no nome e na
 * instituição das pessoas da pasta (o médico pode lembrar da mãe ou da
 * escola). Cada palavra digitada precisa aparecer em algum lugar.
 * Busca vazia devolve todas
 */
export function buscarPastas(pastas: readonly Pasta[], busca: string): Pasta[] {
    const palavras = semAcentos(busca).split(/\s+/).filter(Boolean);
    if (palavras.length === 0) return [...pastas];
    return pastas.filter((p) => {
        const onde = semAcentos([p.nomeAluno, ...Object.values(p.participantes).flatMap((m) => [m.nome, m.detalhe ?? ""])].join(" "));
        return palavras.every((palavra) => onde.includes(palavra));
    });
}

/**
 * Mensagem nova: a última mensagem da pasta é mais nova que a última que a
 * pessoa viu NESTE aparelho, e não foi ela quem mandou. Nunca aberta neste
 * aparelho (`vistaAte` vazio) conta como nova
 */
export function temMensagemNova(ultima: UltimaMensagem | undefined, vistaAte: number | undefined, meuUid: string): boolean {
    if (!ultima || ultima.autorUid === meuUid) return false;
    return ultima.criadoEm > (vistaAte ?? 0);
}

/** As pastas com conversa, da mensagem mais nova para a mais antiga (no máximo `quantas`) */
export function pastasRecentes(pastas: readonly Pasta[], ultimas: ReadonlyMap<string, UltimaMensagem>, quantas = QUANTAS_RECENTES): Pasta[] {
    return pastas
        .filter((p) => ultimas.has(p.id))
        .sort((a, b) => ultimas.get(b.id)!.criadoEm - ultimas.get(a.id)!.criadoEm)
        .slice(0, quantas);
}

/** Todas as pastas: primeiro as com conversa (mais nova primeiro), depois as sem conversa (na ordem recebida) */
export function ordenarPorConversa(pastas: readonly Pasta[], ultimas: ReadonlyMap<string, UltimaMensagem>): Pasta[] {
    return [...pastasRecentes(pastas, ultimas, Infinity), ...pastas.filter((p) => !ultimas.has(p.id))];
}

const mesmoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const abreviado = (mes: string) => (mes.length <= 5 ? mes : `${mes.slice(0, 3)}.`);

/**
 * Quando foi a última mensagem, para a lista: "hoje, 14:10", "ontem",
 * "12 de out." ou "12 de out. de 2025" (outro ano). `falado`: a versão
 * para o leitor de tela, sem abreviação ("hoje às 14:10", "12 de outubro").
 * No fuso do aparelho
 */
export function quandoFoi(ms: number, agora: number = Date.now(), falado = false): string {
    const d = new Date(ms);
    const hoje = new Date(agora);
    const ontem = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() - 1);
    if (mesmoDia(d, hoje)) {
        const hora = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        return falado ? `hoje às ${hora}` : `hoje, ${hora}`;
    }
    if (mesmoDia(d, ontem)) return "ontem";
    const mes = falado ? MESES[d.getMonth()] : abreviado(MESES[d.getMonth()]);
    return `${d.getDate()} de ${mes}${d.getFullYear() === hoje.getFullYear() ? "" : ` de ${d.getFullYear()}`}`;
}

/**
 * Linha que diferencia dois alunos com o mesmo nome: "Mãe: Ana, Escola
 * Girassol" (a vírgula dá a pausa certa no leitor de tela). Só nome e instituição, que os membros já veem na pasta
 */
export function quemEstaNaPasta(pasta: Pasta): string {
    const membros = Object.values(pasta.participantes);
    const mae = membros.find((m) => m.papel === "mae");
    const escolas = membros.filter((m) => m.papel === "escola").map((m) => m.detalhe ?? m.nome);
    return [mae && `Mãe: ${mae.nome}`, ...new Set(escolas)].filter(Boolean).join(", ");
}
