import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { Aviso, Carregando, Paragrafo, Tela } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import PastaServicos from "~/servicos/pasta";
import { cores } from "~/tema/cores";
import { Pasta, SERIE_LABELS } from "@/types/pasta";

/**
 * Pasta do aluno: cabeçalho (nome e série).
 * TODO (dia 3, feat/mobile-relatorios): atalhos Relatórios, Orientações,
 * Conversas e Vínculos, e "Contar como o aluno está"
 */
export default function PastaDoAluno() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const [pasta, setPasta] = useState<Pasta | null>(null);
    const [carregando, setCarregando] = useState(true);

    useEffect(() => {
        let ativo = true;
        PastaServicos.buscar(id).then(({ pasta }) => {
            if (!ativo) return;
            setPasta(pasta ?? null);
            setCarregando(false);
        });
        return () => { ativo = false; };
    }, [id]);

    if (carregando) return <Tela><Carregando texto="Abrindo a pasta..." /></Tela>;
    if (!pasta) return <Tela><Aviso tipo="erro" texto="não foi possível abrir esta pasta. Ela pode não existir, ou você não faz parte dela." /></Tela>;

    return (
        <Tela>
            <View style={{ borderBottomWidth: 2, borderBottomColor: cores.destaque, paddingBottom: 12, gap: 2 }}>
                <Text style={estilos.rotulo}>PASTA DO ALUNO</Text>
                <Text accessibilityRole="header" style={[estilos.tituloCartao, { fontSize: 28 }]}>{pasta.nomeAluno}</Text>
                <Text style={estilos.suave}>{SERIE_LABELS[pasta.serie] ?? ''}</Text>
            </View>
            <Paragrafo>Os relatórios, os vínculos e as conversas desta pasta chegam nas próximas etapas do aplicativo.</Paragrafo>
        </Tela>
    );
}
