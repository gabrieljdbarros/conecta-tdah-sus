import { useCallback, useEffect, useId, useState } from "react";
import { Pressable, Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { acompanharLeitura, falar, pararDeFalar, qualLeituraAtual, temVoz } from "~/servicos/voz";
import { cores } from "~/tema/cores";

/**
 * Diz se há voz em português para ler (com `somenteLocal`, só a que roda no
 * aparelho). `null` enquanto verifica. As vozes são buscadas uma vez só
 */
export function useVozDisponivel(somenteLocal: boolean): boolean | null {
    const [disponivel, setDisponivel] = useState<boolean | null>(null);
    useEffect(() => {
        let ativo = true;
        temVoz(somenteLocal).then((tem) => { if (ativo) setDisponivel(tem); });
        return () => { ativo = false; };
    }, [somenteLocal]);
    return disponivel;
}

/**
 * Botão de leitura em voz alta (igual ao AppOuvir da web). Toque para ouvir;
 * toque de novo para parar. Só uma leitura por vez no app.
 *  - `conteudo`: mensagem do chat (dado de saúde): só lê com voz que roda
 *    no aparelho (decisão travada 9). Sem ela, o botão não aparece
 *  - `disponivel`: já verificado pela tela (ex.: uma lista de mensagens), para
 *    não verificar de novo em cada botão
 *  - `descricao`: complemento só para o leitor de tela (ex.: "mensagem de Ana")
 *  - `pequeno`: versão discreta, dentro do balão da conversa (alvo continua 48)
 */
export function BotaoOuvir({ texto, rotulo = 'Ouvir', descricao, conteudo = false, disponivel, pequeno = false }: {
    texto: string; rotulo?: string; descricao?: string; conteudo?: boolean; disponivel?: boolean | null; pequeno?: boolean;
}) {
    const id = useId();
    const verificado = useVozDisponivel(conteudo);
    const temVozAgora = disponivel !== undefined ? disponivel : verificado;
    const [falando, setFalando] = useState(false);

    // Acompanha qual botão está lendo e para de falar se este sair da tela
    useEffect(() => {
        const deixar = acompanharLeitura((atual) => setFalando(atual === id));
        return () => {
            deixar();
            if (qualLeituraAtual() === id) pararDeFalar();
        };
    }, [id]);

    // A tela de baixo continua montada ao abrir outra ou trocar de aba:
    // ao perder o foco, a leitura desta tela para
    useFocusEffect(useCallback(() => () => { if (qualLeituraAtual() === id) pararDeFalar(); }, [id]));

    if (!temVozAgora) return null;

    const alternar = () => {
        if (falando) pararDeFalar();
        else falar(texto, { id, somenteLocal: conteudo });
    };

    // O rótulo troca entre "Ouvir" e "Parar": o leitor de tela fala o que o botão faz agora
    const titulo = falando ? 'Parar' : rotulo;
    return (
        <Pressable onPress={alternar} accessibilityRole="button" accessibilityLabel={descricao ? `${titulo}: ${descricao}` : titulo}
            android_ripple={{ color: '#FFFFFF55' }}
            style={{
                minHeight: 48, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 8,
                paddingHorizontal: pequeno ? 12 : 16, borderRadius: 24, borderWidth: 2, borderColor: cores.secundaria,
                backgroundColor: pequeno ? '#FFFFFF' : cores.secundaria,
            }}>
            <Ionicons name={falando ? 'stop' : 'volume-high'} size={pequeno ? 20 : 22} color={pequeno ? cores.secundaria : '#FFFFFF'} importantForAccessibility="no" />
            <Text style={{ fontSize: 16, fontWeight: '700', color: pequeno ? cores.secundaria : '#FFFFFF', flexShrink: 1 }}>{titulo}</Text>
        </Pressable>
    );
}

/**
 * Explica por que não há "Ouvir" no conteúdo e como resolver. No Android só
 * a voz do Google comprova que roda no aparelho (ver servicos/voz.ts)
 */
export function SemVozLocal({ oQue }: { oQue: 'mensagens' }) {
    return (
        <Text style={{ fontSize: 16, lineHeight: 22, color: cores.textoSuave }}>
            Este celular não lê {oQue} em voz alta. Isso protege os dados da criança. Para ouvir, escolha a voz do Google em português nas configurações do celular (leitura de texto em voz).
        </Text>
    );
}
