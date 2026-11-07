import { useRef, useState } from "react";
import { Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { anunciar, Aviso, Botao, Campo, Janela } from "~/componentes/basicos";
import { estilos } from "~/componentes/cartoes";
import PastaServicos from "~/servicos/pasta";
import { cores } from "~/tema/cores";

// Limite igual ao do banco (texto_valido, em supabase/migrations)
const MAX = 100;

/**
 * "Cadastrar estudante" (telas novas: janela que sobe de baixo, sem sair da
 * lista). Só o nome da criança (RF03, decisão travada 6: minimização na
 * LGPD). Só a mãe vê o botão que abre esta janela, e o banco (criar_pasta)
 * também recusa quem não é mãe
 */
export function JanelaNovaPasta({ visivel, aoFechar, aoCriar }: { visivel: boolean; aoFechar: () => void; aoCriar: () => void }) {
    const [nome, setNome] = useState('');
    // Erro do campo (nome vazio ou longo) e erro do servidor ficam separados
    const [erroCampo, setErroCampo] = useState<string | null>(null);
    const [erro, setErro] = useState<string | null>(null);
    const [criando, setCriando] = useState(false);
    const campo = useRef<TextInput>(null);

    const fechar = () => { setNome(''); setErroCampo(null); setErro(null); aoFechar(); };

    const criar = async () => {
        const limpo = nome.trim();
        const problema = !limpo ? 'Escreva o nome da criança' : limpo.length > MAX ? `Use no máximo ${MAX} caracteres` : null;
        setErroCampo(problema);
        setErro(null);
        // O foco no campo já faz o leitor de tela falar o erro (está no rótulo)
        if (problema) {
            campo.current?.focus();
            return;
        }
        setCriando(true);
        const { success, message } = await PastaServicos.criar({ nomeAluno: limpo });
        setCriando(false);
        if (!success) { setErro(message ?? 'Não foi possível criar a pasta'); return; }
        anunciar(`Pronto: pasta de ${limpo} criada.`);
        fechar();
        aoCriar();
    };

    return (
        <Janela visivel={visivel} aoFechar={fechar} icone="folder-outline" titulo="Cadastrar estudante"
            descricao="Informe o nome da criança para criar a pasta de acompanhamento.">
            <Campo ref={campo} rotulo="Nome da criança" value={nome} onChangeText={setNome}
                placeholder="Como a criança é chamada" autoCapitalize="words" returnKeyType="done" onSubmitEditing={criar}
                erro={erroCampo ?? undefined} />
            {erro && <Aviso tipo="erro" texto={erro} />}
            <Botao titulo={criando ? 'Criando...' : 'Criar pasta'} aoTocar={criar} carregando={criando} />
            {/* Quem terá acesso: a resposta curta, para a mãe decidir com segurança */}
            <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: cores.fundoInfo }}>
                <Ionicons name="lock-closed" size={20} color={cores.secundaria} style={{ marginTop: 2 }} importantForAccessibility="no" />
                <Text style={[estilos.suave, { color: cores.texto, flex: 1 }]}>
                    Só você decide quem entra. A escola e o médico só veem a pasta se você mandar um convite, que vale 48 horas e serve para uma pessoa.
                </Text>
            </View>
        </Janela>
    );
}
