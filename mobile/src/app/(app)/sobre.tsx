import { Text, View } from "react-native";
import Constants from "expo-constants";
import { Ionicons } from "@expo/vector-icons";
import { Tela } from "~/componentes/basicos";
import { estilos, Secao } from "~/componentes/cartoes";
import { Ilustracao } from "~/componentes/ilustracoes";
import { BotaoInstrucoes } from "~/componentes/ouvir";
import { cores } from "~/tema/cores";
import { instrucoesSobre, SOBRE } from "@/helpers/sobre";

/**
 * Sobre o aplicativo (RF15): quem fez o app, em cartões. Aberta pelo Perfil.
 * O texto vem de src/helpers/sobre.ts (o mesmo da web). A função de cada
 * pessoa vai escrita embaixo do nome, em letra normal (sem etiqueta pequena
 * colorida, que reprova no contraste e pesa para quem lê com dificuldade)
 */
export default function Sobre() {
    const versao = Constants.expoConfig?.version;
    return (
        <Tela>
            <BotaoInstrucoes texto={instrucoesSobre(true)} />

            {/* Abertura: girassol, nome, frase e o que o app faz */}
            <View style={[estilos.cartao, { borderRadius: 16, alignItems: 'center', gap: 8 }]}>
                <Ilustracao nome="girassol" altura={72} />
                <Text accessibilityRole="header" style={[estilos.tituloCartao, { textAlign: 'center' }]}>{SOBRE.nome}</Text>
                <Text style={[estilos.texto, { fontWeight: '700', color: cores.link, textAlign: 'center' }]}>{SOBRE.subtitulo}</Text>
                <Text style={[estilos.texto, { textAlign: 'center' }]}>{SOBRE.descricao}</Text>
            </View>

            <Secao titulo="Desenvolvido por">
                <View style={[estilos.cartao, { borderRadius: 16, gap: 4 }]}>
                    {/* Logos lado a lado; em tela estreita, um embaixo do outro. O leitor de tela lê o nome de cada um */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 24, marginBottom: 12 }}>
                        <Ilustracao nome="cesmacCitec" altura={80} rotulo="Logo do CESMAC CITEC" />
                        <Ilustracao nome="cesmac" altura={40} rotulo="Logo do Centro Universitário CESMAC" />
                    </View>
                    <Text style={estilos.nome}>{SOBRE.instituicao}</Text>
                    <Text style={estilos.texto}>{SOBRE.sobreInstituicao}</Text>
                </View>
            </Secao>

            {SOBRE.secoes.map((secao) => (
                <Secao key={secao.titulo} titulo={secao.titulo}>
                    <View style={[estilos.cartao, { borderRadius: 16, paddingVertical: 6 }]}>
                        {secao.pessoas.map((p, i) => (
                            <View key={p.nome} accessible accessibilityLabel={`${p.nome}, ${p.papel}, ${p.funcao}`}
                                style={[{ paddingVertical: 10 }, i < secao.pessoas.length - 1 && { borderBottomWidth: 1, borderBottomColor: '#EEF0F3' }]}>
                                <Text style={estilos.nome}>{p.nome}</Text>
                                <Text style={[estilos.texto, { color: cores.link, fontWeight: '700' }]}>{p.papel}</Text>
                                <Text style={estilos.suave}>{p.funcao}</Text>
                            </View>
                        ))}
                    </View>
                </Secao>
            ))}

            {/* Avisos: trabalho de faculdade e o que o questionário é (e não é) */}
            <View style={[estilos.cartao, { borderRadius: 16, backgroundColor: cores.fundoInfo, borderColor: cores.fundoInfo, gap: 10, marginTop: 8 }]}>
                {[SOBRE.aviso, SOBRE.avisoQuestionario].map((aviso) => (
                    <View key={aviso} style={{ flexDirection: 'row', gap: 10 }}>
                        <Ionicons name="information-circle-outline" size={24} color={cores.link} importantForAccessibility="no" accessibilityElementsHidden />
                        <Text style={[estilos.texto, { flex: 1 }]}>{aviso}</Text>
                    </View>
                ))}
            </View>

            <View style={{ alignItems: 'center', gap: 2, marginTop: 8 }}>
                {!!versao && <Text style={estilos.suave}>Versão {versao}</Text>}
                <Text style={[estilos.suave, { textAlign: 'center' }]}>{SOBRE.rodape}</Text>
            </View>
        </Tela>
    );
}
