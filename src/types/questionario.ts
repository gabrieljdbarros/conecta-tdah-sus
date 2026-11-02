/**
 * QUESTIONÁRIO SNAP-IV — CONECTA TDAH SUS (decisão travada 11)
 *
 * Respondido pela mãe dona da pasta e visto por todos os membros (tabela
 * `questionarios`, com RLS). É triagem, não diagnóstico. As perguntas e a
 * contagem de sintomas ficam em src/helpers/questionario.ts.
 */

/** Versões que o banco aceita (uma nova entra por migração) */
export type VersaoQuestionario = 'snap-iv-18-v1';

/** Resposta de cada item: 0 "Nem um pouco" a 3 "Demais" */
export type NotaItem = 0 | 1 | 2 | 3;

/** Grupos da regra de leitura (itens 1–9 e 10–18) */
export type GrupoSintomas = 'desatencao' | 'hiperatividadeImpulsividade';

/** Seção em que a pergunta aparece no formulário */
export type SecaoQuestionario = 'desatencao' | 'hiperatividade' | 'impulsividade';

export interface PerguntaQuestionario {
    /** Número do item (1 a 18) */
    numero: number;
    texto: string;
    secao: SecaoQuestionario;
    grupo: GrupoSintomas;
}

/** Uma resposta concluída; `criadoEm` é a data do servidor, em milissegundos */
export interface Questionario {
    id: string;
    pastaId: string;
    versao: VersaoQuestionario;
    /** 18 notas, na ordem dos itens */
    respostas: NotaItem[];
    /** Vazio se o perfil de quem respondeu foi apagado */
    respondidoPorUid: string;
    criadoEm: number;
}

/** Sintomas presentes em cada grupo (0 a 9) */
export type ContagemSintomas = Record<GrupoSintomas, number>;
