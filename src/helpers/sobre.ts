/**
 * Conteúdo da tela "Sobre o aplicativo" (RF15), num lugar só: o app e a
 * web só desenham. Mudou um nome ou uma função? Troca aqui e vale nos dois.
 * São créditos públicos do projeto (nomes e funções), sem dado de usuário
 */

export interface PessoaSobre {
    nome: string;
    /** Papel no projeto (ex.: "Orientador do TCC") */
    papel: string;
    /** Função e instituição (ex.: "Professor, CESMAC") */
    funcao: string;
}

export interface SecaoSobre {
    titulo: string;
    pessoas: PessoaSobre[];
}

export const SOBRE = {
    nome: 'Conecta TDAH SUS',
    subtitulo: 'Ponte entre família, escola e saúde',
    descricao: 'Aplicativo que aproxima a família, a escola e os profissionais de saúde do SUS no acompanhamento de estudantes com TDAH, com conversas em grupo por mensagens de texto e de voz.',
    instituicao: 'Centro Universitário CESMAC',
    sobreInstituicao: 'Trabalho de Conclusão de Curso (TCC) de Sistemas de Informação.',
    secoes: [
        {
            titulo: 'Professores e pesquisadores',
            pessoas: [
                { nome: 'Jordana Farias', papel: 'Idealizadora do projeto', funcao: 'Mestranda, CESMAC' },
                { nome: 'Profa. Dra. Evanisa Brum', papel: 'Gerente de projeto', funcao: 'Professora doutora, CESMAC' },
                { nome: 'Prof. Me. Wagner Palmeira', papel: 'Orientador do TCC', funcao: 'Professor mestre, CESMAC' },
            ],
        },
        {
            titulo: 'Desenvolvedor responsável',
            pessoas: [
                { nome: 'Gabriel Barros', papel: 'Desenvolvedor e autor do sistema', funcao: 'Sistemas de Informação, CESMAC' },
            ],
        },
        {
            titulo: 'Colaboração',
            pessoas: [
                { nome: 'Profa. Dra. Sonia Maria Soares Ferreira', papel: 'Colaboradora do projeto', funcao: 'Professora doutora, CESMAC' },
                { nome: 'Karina Jucá', papel: 'Colaboradora do projeto', funcao: 'Psicologia, CESMAC' },
            ],
        },
    ] satisfies SecaoSobre[],
    // Avisos em palavras simples (público com baixa alfabetização)
    aviso: 'Este é um trabalho de faculdade. Ele não faz parte do sistema do SUS.',
    // Só no app: a web não tem o questionário (decisão 11)
    avisoQuestionario: 'O questionário ajuda na conversa com o médico. Ele não diz se a criança tem TDAH. Quem avalia é o médico.',
    rodape: '© 2026 Centro Universitário CESMAC',
} as const;

/**
 * Texto do "Ouvir instruções": o que a tela tem, sem ler a lista inteira.
 * Usa as mesmas palavras dos avisos, para o áudio bater com o texto.
 * `noApp`: inclui o aviso do questionário (a web não tem questionário)
 */
export function instrucoesSobre(noApp: boolean): string {
    return [
        'Esta tela conta quem fez o aplicativo Conecta TDAH SUS, no Centro Universitário CESMAC.',
        'Embaixo estão os nomes dos professores, do desenvolvedor e de quem colaborou.',
        `No fim, ${noApp ? 'dois avisos' : 'um aviso'}: ${SOBRE.aviso}`,
        noApp ? SOBRE.avisoQuestionario : '',
    ].filter(Boolean).join(' ');
}
