/**
 * QUESTIONÁRIO SNAP-IV: PERGUNTAS E CONTAGEM (decisão travada 11)
 *
 * Fonte: versão brasileira MTA-SNAP-IV (Mattos et al., 2006).
 * TODO: confirmar com a Jordana o texto oficial dos itens; o texto abaixo é
 * resumido. Trocar o texto não muda o banco (ele guarda só as notas), mas
 * mudar a ORDEM ou a escala exige uma nova versão.
 *
 * Regra de leitura (contagem): o item marcado "Bastante" ou "Demais" conta
 * como sintoma presente. A tela mostra só a contagem de cada grupo, em
 * barras, sem interpretação (é triagem; quem interpreta é o médico).
 * Lógica pura: sem acesso ao banco.
 */
// `import type`: some ao rodar, então os testes de lógica rodam direto no Node
import type { ContagemSintomas, GrupoSintomas, NotaItem, PerguntaQuestionario, VersaoQuestionario } from "@/types/questionario";

export const VERSAO_ATUAL: VersaoQuestionario = 'snap-iv-18-v1';

/** Citada na tela do resultado */
export const FONTE_QUESTIONARIO = 'MTA-SNAP-IV, versão brasileira (Mattos et al., 2006)';

/** Rótulos da escala, na ordem das notas (0 a 3) */
export const ESCALA = ['Nem um pouco', 'Só um pouco', 'Bastante', 'Demais'] as const;

/**
 * Rótulos curtos dos botões (decidido em 02/11/2026, para caber numa linha).
 * O leitor de tela fala os dois: "Muito, bastante".
 * TODO: confirmar com a Jordana se os rótulos curtos não afetam a validade
 */
export const ESCALA_CURTA = ['Nada', 'Pouco', 'Muito', 'Demais'] as const;

/** A partir desta nota ("Bastante"), o item conta como sintoma presente */
export const NOTA_SINTOMA_PRESENTE = 2;

export const TITULO_GRUPO: Record<GrupoSintomas, string> = {
    desatencao: 'Desatenção',
    hiperatividadeImpulsividade: 'Hiperatividade e impulsividade',
};

const pergunta = (numero: number, texto: string): PerguntaQuestionario => ({
    numero,
    texto,
    secao: numero <= 9 ? 'desatencao' : numero <= 15 ? 'hiperatividade' : 'impulsividade',
    grupo: numero <= 9 ? 'desatencao' : 'hiperatividadeImpulsividade',
});

export const PERGUNTAS: readonly PerguntaQuestionario[] = [
    pergunta(1, 'Não presta atenção em detalhes ou comete erros por descuido'),
    pergunta(2, 'Tem dificuldade de manter a atenção em tarefas ou brincadeiras'),
    pergunta(3, 'Parece não ouvir quando se fala diretamente com ele'),
    pergunta(4, 'Não segue instruções até o fim e não termina tarefas'),
    pergunta(5, 'Tem dificuldade para organizar tarefas e atividades'),
    pergunta(6, 'Evita ou reluta em fazer tarefas que exigem esforço mental prolongado'),
    pergunta(7, 'Perde coisas necessárias para suas atividades'),
    pergunta(8, 'Distrai-se com facilidade com outros estímulos'),
    pergunta(9, 'Esquece atividades do dia a dia'),
    pergunta(10, 'Mexe as mãos ou os pés, ou se remexe na cadeira'),
    pergunta(11, 'Levanta da cadeira quando deveria ficar sentado'),
    pergunta(12, 'Corre ou sobe nas coisas em momentos inadequados'),
    pergunta(13, 'Tem dificuldade de brincar ou fazer atividades em silêncio'),
    pergunta(14, 'Está sempre agitado, como se fosse “movido a motor”'),
    pergunta(15, 'Fala demais'),
    pergunta(16, 'Responde antes de a pergunta terminar'),
    pergunta(17, 'Tem dificuldade de esperar a sua vez'),
    pergunta(18, 'Interrompe ou se intromete nas conversas e atividades dos outros'),
];

/** Itens de cada grupo (9 em cada um): o máximo de cada barra */
export const ITENS_POR_GRUPO = 9;

/** As 18 notas, todas preenchidas, de 0 a 3 (a mesma regra do banco) */
export function respostasValidas(respostas: readonly unknown[]): respostas is NotaItem[] {
    return respostas.length === PERGUNTAS.length
        && respostas.every((n) => Number.isInteger(n) && (n as number) >= 0 && (n as number) <= 3);
}

/** Quantos itens de cada grupo foram marcados "Bastante" ou "Demais" */
export function contarSintomas(respostas: readonly NotaItem[]): ContagemSintomas {
    if (!respostasValidas(respostas)) throw new Error('Respostas incompletas');
    const contagem: ContagemSintomas = { desatencao: 0, hiperatividadeImpulsividade: 0 };
    PERGUNTAS.forEach((p, i) => {
        if (respostas[i] >= NOTA_SINTOMA_PRESENTE) contagem[p.grupo]++;
    });
    return contagem;
}
