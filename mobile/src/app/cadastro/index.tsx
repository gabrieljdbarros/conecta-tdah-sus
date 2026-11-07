import { Pressable, Text, View } from "react-native";
import { Redirect, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { BotaoOuvir } from "~/componentes/ouvir";
import { useAuth } from "~/contexto/AuthContext";
import { cores, medidas } from "~/tema/cores";
import { UserRole } from "@/types/user";

type NomeIcone = keyof typeof Ionicons.glyphMap;

const PERFIS: { valor: Exclude<UserRole, 'admin'>; titulo: string; descricao: string; icone: NomeIcone }[] = [
    { valor: 'mae', titulo: 'Mãe ou responsável', descricao: 'Acompanho uma criança com TDAH.', icone: 'heart-outline' },
    { valor: 'escola', titulo: 'Escola ou professor(a)', descricao: 'Participo do acompanhamento escolar.', icone: 'school-outline' },
    { valor: 'medico', titulo: 'Profissional de psiquiatria', descricao: 'Atuo no acompanhamento de saúde.', icone: 'medkit-outline' },
];

/**
 * Cadastro, passo 1 (design da Daya): "Como você deseja participar?".
 * Três cartões grandes, cada um um botão que já leva ao passo 2 com o
 * perfil escolhido (lá dá para trocar de perfil sem voltar)
 */
export default function EscolherPerfil() {
    const { user } = useAuth();
    if (user) return <Redirect href="/inicio" />;

    return (
        <Tela branco>
            <Titulo>Como você deseja participar?</Titulo>
            <Paragrafo suave>Escolha o perfil que melhor representa você.</Paragrafo>
            <BotaoOuvir rotulo="Ouvir instruções" texto="Escolha quem você é. Se você é mãe, pai ou responsável pela criança, toque em Mãe ou responsável. Se você é da escola, toque em Escola ou professor. Se você é médico, toque em Profissional de psiquiatria." />
            <View style={{ gap: 12 }}>
                {PERFIS.map((p) => (
                    <Pressable key={p.valor} onPress={() => router.push({ pathname: '/cadastro/dados', params: { perfil: p.valor } })}
                        accessibilityRole="button" accessibilityLabel={`${p.titulo}. ${p.descricao}`} accessibilityHint="Abre o cadastro"
                        android_ripple={{ color: '#E5E7EB' }}
                        style={({ pressed }) => [{
                            flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 80, padding: 16,
                            backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: cores.borda, borderRadius: medidas.raio + 4,
                        }, pressed && { opacity: 0.85 }]}>
                        <View style={{ width: 52, height: 52, borderRadius: medidas.raio, backgroundColor: cores.fundoInfo, alignItems: 'center', justifyContent: 'center' }}
                            importantForAccessibility="no">
                            <Ionicons name={p.icone} size={28} color={cores.link} />
                        </View>
                        <View style={{ flex: 1, gap: 2 }}>
                            <Text style={{ fontSize: 19, fontWeight: '800', color: cores.texto }}>{p.titulo}</Text>
                            <Text style={{ fontSize: 16, color: cores.textoSuave }}>{p.descricao}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color={cores.textoSuave} importantForAccessibility="no" />
                    </Pressable>
                ))}
            </View>
        </Tela>
    );
}
