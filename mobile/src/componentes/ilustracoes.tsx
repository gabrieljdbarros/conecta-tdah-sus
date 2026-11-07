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
