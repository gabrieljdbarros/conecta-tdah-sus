import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Aviso, Carregando, Paragrafo, Tela } from "~/componentes/basicos";
import { estilos, Secao } from "~/componentes/cartoes";
import { useAuth } from "~/contexto/AuthContext";
import CategoriaServicos from "~/servicos/categoria";
import PastaServicos from "~/servicos/pasta";
import RelatorioServicos from "~/servicos/relatorio";
import { cores } from "~/tema/cores";
import { formatarData, ICONE_TIPO } from "~/util/relatorio";
import { Pasta } from "@/types/pasta";
import { QUEM_VE, Relatorio, TIPO_LABELS, TIPOS_QUE_LE } from "@/types/relatorio";
import { ROLE_LABELS } from "@/types/user";

const ORDEM_PAPEL = { mae: 0, escola: 1, medico: 2 } as const;

/**
 * Um relatório inteiro, com "Quem vê este relatório" (design: "Rede que vê
 * este registro"). A leitura é protegida pelas regras pelo TIPO (RN06): se o
 * papel não pode ler, o relatório não abre — e o erro é o mesmo de "não existe".
 * TODO (dia 6): "Ouvir relatório" (só com voz do próprio celular)
 */
export default function DetalheRelatorio() {
    const { id, rid } = useLocalSearchParams<{ id: string; rid: string }>();
    const { user } = useAuth();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [relatorio, setRelatorio] = useState<Relatorio | null>(null);
    const [assunto, setAssunto] = useState<string | null>(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        let ativo = true;
        (async () => {
            const [resPasta, resRel] = await Promise.all([PastaServicos.buscar(id), RelatorioServicos.buscar(id, rid)]);
            const cat = resRel.relatorio ? await CategoriaServicos.buscar(resRel.relatorio.categoriaId) : null;
            if (!ativo) return;
            setPasta(resPasta.pasta ?? null);
            setRelatorio(resRel.relatorio ?? null);
            setAssunto(cat?.categoria?.nome ?? null);
            setCarregando(false);
        })();
        return () => { ativo = false; };
    }, [id, rid]);

    if (carregando) return <Tela><Stack.Screen options={{ title: 'Relatório' }} /><Carregando texto="Abrindo o relatório..." /></Tela>;
    if (!pasta || !relatorio)
        return <Tela><Aviso tipo="erro" texto="não foi possível abrir este relatório. Ele pode não existir, ou você não tem acesso a ele." /></Tela>;

    // Quem da pasta pode ler este TIPO (mesma matriz das regras)
    const quemVe = Object.entries(pasta.participantes)
        .filter(([, p]) => TIPOS_QUE_LE[p.papel].includes(relatorio.tipo))
        .sort(([, a], [, b]) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel]);
    const data = formatarData(relatorio.criadoEm);

    return (
        <Tela>
            <Stack.Screen options={{ title: 'Relatório' }} />
            <View accessible accessibilityRole="header"
                accessibilityLabel={`${TIPO_LABELS[relatorio.tipo]}. ${data}. Escrito por ${relatorio.autorNome}, ${ROLE_LABELS[relatorio.autorPapel]}. Assunto: ${assunto ?? 'não encontrado'}`}
                style={{ borderBottomWidth: 2, borderBottomColor: cores.destaque, paddingBottom: 12, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons name={ICONE_TIPO[relatorio.tipo]} size={26} color={cores.link} importantForAccessibility="no" />
                    <Text style={[estilos.tituloCartao, { flexShrink: 1 }]}>{TIPO_LABELS[relatorio.tipo]}</Text>
                </View>
                <Text style={estilos.suave}>{data}</Text>
                <Text style={estilos.texto}>Escrito por <Text style={{ fontWeight: '700' }}>{relatorio.autorNome}</Text> ({ROLE_LABELS[relatorio.autorPapel]})</Text>
                <Text style={estilos.texto}><Text style={{ fontWeight: '700' }}>Assunto:</Text> {assunto ?? 'não encontrado'}</Text>
            </View>

            {/* Sem "copiar": o texto de saúde não vai para a área de transferência,
                que outros apps podem ler (celular compartilhado) */}
            <Text style={[estilos.texto, { fontSize: 18, lineHeight: 28 }]}>{relatorio.texto}</Text>
            <Paragrafo suave>Este relatório não pode ser alterado nem apagado. Para corrigir alguma coisa, escreva um relatório novo.</Paragrafo>

            {/* QUEM VÊ (RN06): transparência sobre o acesso, pelo tipo */}
            <Secao titulo="Quem vê este relatório">
                <Paragrafo>Quem pode ver: {QUEM_VE[relatorio.tipo]}</Paragrafo>
                {quemVe.map(([uid, p]) => {
                    const papelTexto = uid === pasta.donoUid ? 'Responsável pela pasta' : ROLE_LABELS[p.papel];
                    const nome = uid === user?.uid ? `${p.nome} (você)` : p.nome;
                    return (
                        <View key={uid} accessible accessibilityLabel={`${nome}, ${papelTexto}`}
                            style={[estilos.cartao, { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 56, paddingVertical: 10 }]}>
                            <Text style={[estilos.nome, { flexShrink: 1 }]}>{nome}</Text>
                            <Text style={{ fontSize: 16, color: cores.secundaria, backgroundColor: '#E6F4F3', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 }}>
                                {papelTexto}
                            </Text>
                        </View>
                    );
                })}
            </Secao>
        </Tela>
    );
}
