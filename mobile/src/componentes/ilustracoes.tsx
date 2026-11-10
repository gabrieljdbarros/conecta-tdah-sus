import { Image, ImageStyle, StyleProp } from "react-native";

/**
 * ILUSTRAÇÕES DA DESIGNER (Daya, novembro de 2026): girassol, logo, abelha,
 * brilho e a pasta do estado vazio. PNG com fundo transparente, em 3x do
 * tamanho mostrado (nítido em telas de alta densidade, sem pesar no app).
 *
 * Em geral são DECORATIVAS: o leitor de tela pula, porque o texto ao lado
 * já diz o que importa (nome do aluno, título da tela). Com `rotulo`, a
 * imagem é lida (ex.: o logo diz o nome do app)
 */
const IMAGENS = {
    logo: { fonte: require('../../assets/ilustracoes/logo.png'), proporcao: 540 / 622 },
    girassol: { fonte: require('../../assets/ilustracoes/girassol.png'), proporcao: 180 / 200 },
    abelha: { fonte: require('../../assets/ilustracoes/abelha.png'), proporcao: 186 / 132 },
    brilho: { fonte: require('../../assets/ilustracoes/brilho.png'), proporcao: 48 / 72 },
    pastaVazia: { fonte: require('../../assets/ilustracoes/pasta-vazia.png'), proporcao: 462 / 360 },
    // Pasta com o girassol (cartão da pasta) e girassol com a fita laranja da
    // conscientização do TDAH (questionário concluído). Recortadas e reduzidas
    pastaGirassol: { fonte: require('../../assets/ilustracoes/pasta-girassol.png'), proporcao: 168 / 168 },
    girassolFita: { fonte: require('../../assets/ilustracoes/girassol-fita.png'), proporcao: 303 / 480 },
    // Girassol com balão de conversa (cartão de conversa)
    girassolConversa: { fonte: require('../../assets/ilustracoes/girassol-conversa.png'), proporcao: 163 / 168 },
    // Logos da tela Sobre (recortados e reduzidos: pouco peso no app)
    cesmacCitec: { fonte: require('../../assets/ilustracoes/cesmac-citec.png'), proporcao: 264 / 240 },
    cesmac: { fonte: require('../../assets/ilustracoes/cesmac.png'), proporcao: 600 / 172 },
} as const;

export type NomeIlustracao = keyof typeof IMAGENS;

/** Ilustração na altura pedida; a largura sai da proporção da imagem */
export function Ilustracao({ nome, altura, rotulo, style }: {
    nome: NomeIlustracao; altura: number; rotulo?: string; style?: StyleProp<ImageStyle>;
}) {
    const { fonte, proporcao } = IMAGENS[nome];
    const tamanho = { height: altura, width: altura * proporcao };
    return rotulo
        ? <Image source={fonte} resizeMode="contain" accessible accessibilityRole="image" accessibilityLabel={rotulo} style={[tamanho, style]} />
        : <Image source={fonte} resizeMode="contain" importantForAccessibility="no" accessibilityElementsHidden style={[tamanho, style]} />;
}
