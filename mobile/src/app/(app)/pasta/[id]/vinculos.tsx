import { useCallback, useRef, useState } from "react";
import { Alert, Share, Text, View } from "react-native";
import { router, Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import QRCode from "react-native-qrcode-svg";
import { anunciar, Aviso, Botao, Carregando, focarLeitor, Janela, Paragrafo, Tela } from "~/componentes/basicos";
import { BotaoInstrucoes } from "~/componentes/ouvir";
import { estilos, Secao } from "~/componentes/cartoes";
import { useAuth } from "~/contexto/AuthContext";
import { usePasta } from "~/ganchos/usePasta";
import ConviteServicos, { ConvitePendente, linkDoConvite, PapelConvidado } from "~/servicos/convite";
import { cores } from "~/tema/cores";
import { ROLE_LABELS } from "@/types/user";

const PARA_QUEM: Record<PapelConvidado, string> = { escola: 'a escola', medico: 'o médico' };
const ORDEM_PAPEL = { mae: 0, escola: 1, medico: 2 } as const;

function formatarValidade(ms: number): string {
    return new Date(ms).toLocaleString('pt-BR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
}

/**
 * VÍNCULOS da pasta (RN01, RN02), igual à web:
 * - a dona convida escola/médico por link (48 h, uso único), cancela
 *   convites e remove pessoas; convite vencido tem "Gerar novo convite"
 * - escola/médico podem sair da pasta
 * As funções do banco e o RLS garantem tudo isso; aqui é a tela.
 * Convite gerado (telas novas): abre numa janela com o QR CODE do mesmo
 * link (quem está perto aponta a câmera do celular e a página do convite
 * abre no navegador, sem instalar nada), mais Copiar link e Compartilhar.
 * O QR é desenhado no próprio celular: o link não passa por nenhum site
 * As confirmações usam a janela do próprio sistema (o TalkBack lê a pergunta
 * e os botões e leva o foco até ela)
 */
export default function Vinculos() {
    const { id, convidar: abrirConvidar } = useLocalSearchParams<{ id: string; convidar?: string }>();
    const { user } = useAuth();
    const { pasta, papel, carregando, recarregar } = usePasta(id);
    const [convites, setConvites] = useState<ConvitePendente[]>([]);
    const [gerando, setGerando] = useState<PapelConvidado | null>(null);
    const [link, setLink] = useState<{ papel: PapelConvidado; url: string; expiraEm: number } | null>(null);
    const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null);
    // Janela do convite: aberta/fechada separado do link, para o conteúdo não
    // sumir durante a animação de fechar. `usou`: já copiou ou compartilhou
    const [janelaAberta, setJanelaAberta] = useState(false);
    const [usou, setUsou] = useState(false);
    // Mensagens da janela (ficam dentro dela: atrás, ninguém veria nem ouviria)
    const [avisoCopia, setAvisoCopia] = useState<string | null>(null);
    const [avisoJanela, setAvisoJanela] = useState<string | null>(null);
    const [erroConvites, setErroConvites] = useState(false);
    const refAviso = useRef<View>(null);
    // Momento da última leitura dos convites (separa os válidos dos vencidos)
    const [agora, setAgora] = useState(0);
    const ehDona = !!user && !!pasta && pasta.donoUid === user.uid;

    const carregarConvites = useCallback(async () => {
        if (!user || !ehDona) return;
        const { success, convites } = await ConviteServicos.pendentes(id);
        setConvites(convites);
        setErroConvites(!success);
        setAgora(Date.now());
    }, [user, ehDona, id]);
    useFocusEffect(useCallback(() => { carregarConvites(); }, [carregarConvites]));

    if (carregando) return <Tela><Stack.Screen options={{ title: 'Vínculos' }} /><Carregando texto="Abrindo os vínculos..." /></Tela>;
    if (!pasta || !papel || !user) return <Tela><Aviso tipo="erro" texto="não foi possível abrir esta pasta." /></Tela>;

    // Depois de uma ação, a mensagem aparece no alto, é falada e recebe o foco
    // (o botão que abriu a confirmação pode ter sumido da lista)
    const informar = (ok: boolean, texto: string) => {
        setAviso({ ok, texto });
        anunciar(`${ok ? 'Pronto' : 'Erro'}: ${texto}`);
        focarLeitor(refAviso.current);
    };

    const convidar = async (p: PapelConvidado, substituir?: ConvitePendente) => {
        setAviso(null);
        setAvisoCopia(null);
        setGerando(p);
        const { success, token, expiraEm, message } = await ConviteServicos.gerar(pasta.id, p);
        setGerando(null);
        if (success && token && expiraEm) {
            // O vencido não serve mais: sai da lista (se falhar, só continua aparecendo)
            if (substituir && !(await ConviteServicos.cancelar(substituir.id)).success)
                setAvisoJanela('o convite novo foi gerado, mas não deu para apagar o vencido. Tente de novo mais tarde.');
            else setAvisoJanela(null);
            setLink({ papel: p, url: linkDoConvite(token), expiraEm });
            setUsou(false);
            setJanelaAberta(true);
            carregarConvites();
        } else informar(false, message ?? 'não foi possível gerar o convite.');
    };

    const compartilhar = async () => {
        if (!link) return;
        // Abre a lista de apps do celular (WhatsApp, SMS...). Texto neutro: sem
        // nome do aluno e sem dizer do que se trata
        try {
            await Share.share({ message: `Convite para acompanhar um aluno. Toque no link para entrar pelo navegador, ou copie e cole no aplicativo: ${link.url}` });
            setUsou(true);
        } catch {
            setAvisoJanela('não deu para abrir a lista de aplicativos. Toque em Copiar link.');
            anunciar('Erro: não deu para abrir a lista de aplicativos. Toque em Copiar link.');
        }
    };

    const copiar = async () => {
        if (!link) return;
        const url = link.url;
        try {
            await Clipboard.setStringAsync(url);
        } catch {
            setAvisoJanela('não deu para copiar. Toque em Compartilhar convite.');
            anunciar('Erro: não deu para copiar. Toque em Compartilhar convite.');
            return;
        }
        setUsou(true);
        // A confirmação aparece na própria janela, perto do botão
        const texto = 'Link copiado. Cole na conversa e envie agora. Daqui a 1 minuto ele sai da área de copiar.';
        setAvisoCopia(texto);
        anunciar(texto);
        // O link dá acesso à pasta: não fica copiado (outros apps podem ler)
        setTimeout(async () => {
            if (await Clipboard.getStringAsync() === url) await Clipboard.setStringAsync('');
        }, 60000);
    };

    const cancelarConvite = (c: ConvitePendente) => Alert.alert(
        `Cancelar o convite para ${PARA_QUEM[c.papel]}, válido até ${formatarValidade(c.expiraEm)}?`, 'O link vai parar de funcionar.',
        [{ text: 'Não, manter', style: 'cancel' }, {
            text: 'Sim, cancelar', style: 'destructive', onPress: async () => {
                const { success } = await ConviteServicos.cancelar(c.id);
                informar(success, success ? 'convite cancelado.' : 'não foi possível cancelar. Tente de novo.');
                carregarConvites();
            },
        }],
    );

    const remover = (uid: string, nome: string, papelPessoa: 'escola' | 'medico' | 'mae') => {
        // Um convite ainda válido do mesmo papel deixaria a pessoa voltar
        const temConvite = convites.some((c) => c.papel === papelPessoa && c.expiraEm > agora);
        Alert.alert(`Remover ${nome} da pasta?`,
            `Essa pessoa deixa de ver a pasta na hora.${temConvite ? ` Há um convite para ${PARA_QUEM[papelPessoa as PapelConvidado]} esperando resposta: cancele também se não quiser que ela volte.` : ''}`,
            [{ text: 'Não, voltar', style: 'cancel' }, {
                text: 'Sim, remover', style: 'destructive', onPress: async () => {
                    const { success, message } = await ConviteServicos.removerParticipante(pasta.id, uid);
                    informar(success, success ? `${nome} não faz mais parte da pasta.` : message ?? 'não foi possível remover.');
                    recarregar();
                },
            }]);
    };

    const sairDaPasta = () => Alert.alert('Sair da pasta?',
        'Você deixa de ver a pasta. Para voltar, a família precisa enviar um novo convite.',
        [{ text: 'Não, voltar', style: 'cancel' }, {
            text: 'Sim, sair', style: 'destructive', onPress: async () => {
                const { success, message } = await ConviteServicos.removerParticipante(pasta.id, user.uid);
                if (success) { anunciar('Pronto: você saiu da pasta.'); router.replace('/pastas'); }
                else informar(false, message ?? 'não foi possível sair.');
            },
        }]);

    // Fechar a janela do convite: o link some (não aparece de novo) e a lista
    // de "esperando resposta" mostra o convite
    const fecharConvite = () => {
        setJanelaAberta(false);
        // Depois da animação, o link sai da memória da tela
        setTimeout(() => { setLink(null); setAvisoCopia(null); setAvisoJanela(null); }, 400);
    };
    // Fechar sem ter copiado nem compartilhado perde o convite (ele não
    // aparece de novo): pergunta antes. Vale para o X, o toque fora e o voltar
    const pedirParaFechar = () => {
        if (usou) { fecharConvite(); return; }
        Alert.alert('Fechar sem enviar o convite?', 'Você ainda não copiou nem compartilhou. Depois de fechar, este convite não aparece de novo.',
            [{ text: 'Não, voltar', style: 'cancel' }, { text: 'Sim, fechar', style: 'destructive', onPress: fecharConvite }]);
    };

    const participantes = Object.entries(pasta.participantes).sort(([, a], [, b]) => ORDEM_PAPEL[a.papel] - ORDEM_PAPEL[b.papel]);
    const pendentes = convites.filter((c) => c.expiraEm > agora);
    const vencidos = convites.filter((c) => c.expiraEm <= agora);

    const secaoConvidar = (
        <Secao titulo="Convidar">
            <Paragrafo>O convite é um link, que também aparece como QR code. Se a pessoa estiver perto, ela aponta a câmera do celular para o QR. Se não, você manda o link (por exemplo, pelo WhatsApp). Quem abrir passa a acompanhar o aluno.</Paragrafo>
            <Botao titulo={gerando === 'escola' ? 'Gerando...' : 'Convidar escola'} icone="school" carregando={gerando === 'escola'} desabilitado={!!gerando} aoTocar={() => convidar('escola')} />
            <Botao titulo={gerando === 'medico' ? 'Gerando...' : 'Convidar médico'} icone="medkit" carregando={gerando === 'medico'} desabilitado={!!gerando} aoTocar={() => convidar('medico')} />

            {erroConvites && <Aviso tipo="erro" texto="não foi possível ver os convites. Volte a esta tela para tentar de novo." />}

            {pendentes.length > 0 && <>
                <Text accessibilityRole="header" style={[estilos.nome, { marginTop: 8 }]}>Convites esperando resposta</Text>
                {pendentes.map((c) => (
                    <View key={c.id} style={[estilos.cartao, { gap: 8 }]}>
                        <Text style={estilos.nome}>Convite para {PARA_QUEM[c.papel]}</Text>
                        <Text style={estilos.suave}>Esperando resposta: vale até {formatarValidade(c.expiraEm)}</Text>
                        <Botao titulo={`Cancelar convite para ${PARA_QUEM[c.papel]}`} tipo="contorno" icone="close-circle-outline" aoTocar={() => cancelarConvite(c)}
                            dica={`Convite válido até ${formatarValidade(c.expiraEm)}`} />
                    </View>
                ))}
            </>}

            {vencidos.length > 0 && <>
                <Text accessibilityRole="header" style={[estilos.nome, { marginTop: 8 }]}>Convites vencidos</Text>
                {vencidos.map((c) => (
                    <View key={c.id} style={[estilos.cartao, { gap: 8 }]}>
                        <Text style={estilos.nome}>Convite para {PARA_QUEM[c.papel]}</Text>
                        <Text style={[estilos.texto, { color: cores.erro }]}>Venceu em {formatarValidade(c.expiraEm)}</Text>
                        <Botao titulo={`Gerar novo convite para ${PARA_QUEM[c.papel]}`} tipo="contorno" icone="refresh" desabilitado={!!gerando} aoTocar={() => convidar(c.papel, c)} />
                    </View>
                ))}
            </>}
        </Secao>
    );

    return (
        <Tela>
            <Stack.Screen options={{ title: 'Vínculos' }} />
            <Text accessibilityRole="header" style={estilos.suave}>Pasta de {pasta.nomeAluno}</Text>
            <BotaoInstrucoes texto={ehDona
                ? 'Aqui você vê quem acompanha o aluno. Para chamar a escola ou o médico, toque em Convidar escola ou Convidar médico. Vai aparecer um QR code: se a pessoa estiver perto, ela aponta a câmera do celular para ele. Se não, toque em Copiar link ou em Compartilhar convite e envie para a pessoa. O link vale 48 horas e só funciona uma vez. Para tirar alguém da pasta, toque em Remover.'
                : 'Aqui você vê quem acompanha o aluno. Se não quiser mais acompanhar, toque em Sair da pasta.'} />
            {/* Mensagem das ações: recebe o foco depois de cancelar, remover etc. */}
            <View ref={refAviso} accessible={!!aviso} accessibilityLabel={aviso ? `${aviso.ok ? 'Pronto' : 'Erro'}: ${aviso.texto}` : undefined}>
                {aviso && <Aviso tipo={aviso.ok ? 'sucesso' : 'erro'} texto={aviso.texto} silencioso />}
            </View>

            {/* Pelo atalho "Convidar" da pasta, convidar vem primeiro */}
            {abrirConvidar === '1' && ehDona && secaoConvidar}
            <Secao titulo="Com acesso à pasta">
                {participantes.map(([uid, p]) => {
                    const nome = uid === user.uid ? `${p.nome} (você)` : p.nome;
                    const papelTexto = `${ROLE_LABELS[p.papel]}${uid === pasta.donoUid ? ', responsável pela pasta' : ''}${p.detalhe ? `, ${p.detalhe}` : ''}`;
                    return (
                        <View key={uid} style={[estilos.cartao, { gap: 8 }]}>
                            <View accessible accessibilityLabel={`${nome}. ${papelTexto}`} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                                <Ionicons name={p.papel === 'escola' ? 'school' : p.papel === 'medico' ? 'medkit' : 'person'} size={24} color={cores.textoSuave} />
                                <View style={{ flex: 1 }}>
                                    <Text style={estilos.nome}>{nome}</Text>
                                    <Text style={estilos.suave}>{papelTexto}</Text>
                                </View>
                            </View>
                            {ehDona && uid !== pasta.donoUid && p.papel !== 'mae' && (
                                <Botao titulo={`Remover ${p.nome}`} tipo="contorno" icone="person-remove-outline" aoTocar={() => remover(uid, p.nome, p.papel)} />
                            )}
                            {!ehDona && uid === user.uid && (
                                <Botao titulo="Sair da pasta" tipo="contorno" icone="exit-outline" aoTocar={sairDaPasta} />
                            )}
                        </View>
                    );
                })}
            </Secao>

            {abrirConvidar !== '1' && ehDona && secaoConvidar}

            {/* CONVITE GERADO: QR, copiar e compartilhar */}
            <Janela visivel={janelaAberta} aoFechar={pedirParaFechar} icone="checkmark-circle-outline" titulo="Convite gerado!"
                descricao={link ? `Mostre o QR code para ${PARA_QUEM[link.papel]} apontar a câmera do celular, ou envie o link.` : undefined}>
                {link && <>
                    <View accessible accessibilityRole="image"
                        accessibilityLabel={`Desenho quadrado do convite, o QR code, para ${PARA_QUEM[link.papel]}. A pessoa aponta a câmera do celular para ele. Se ela não estiver perto, use Copiar link ou Compartilhar convite.`}
                        style={{ alignSelf: 'center', padding: 16, backgroundColor: '#FFFFFF', borderRadius: 16, borderWidth: 1, borderColor: cores.bordaCartao }}>
                        {/* Preto no branco, com margem: é o que as câmeras leem melhor */}
                        <QRCode value={link.url} size={200} color="#000000" backgroundColor="#FFFFFF" ecl="M" />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: 12, backgroundColor: cores.fundoInfo }}>
                        <Ionicons name="time-outline" size={22} color={cores.texto} style={{ marginTop: 1 }} importantForAccessibility="no" />
                        <View style={{ flex: 1, gap: 4 }}>
                            <Text style={[estilos.texto, { fontSize: 16 }]}>Vale até {formatarValidade(link.expiraEm)} e só funciona para uma pessoa.</Text>
                            <Text style={[estilos.texto, { fontSize: 16, fontWeight: '700' }]}>Mande agora: por segurança, este convite não aparece de novo.</Text>
                        </View>
                    </View>
                    {avisoJanela && <Aviso tipo="erro" texto={avisoJanela} silencioso />}
                    {/* Acima do botão: com a fonte grande, continua à vista */}
                    {avisoCopia && <Aviso tipo="sucesso" texto={avisoCopia} silencioso />}
                    <Botao titulo="Copiar link" icone="copy-outline" aoTocar={copiar} />
                    <Botao titulo="Compartilhar convite" tipo="contorno" icone="share-social" aoTocar={compartilhar} dica="Abre a lista de aplicativos para mandar o link" />
                </>}
            </Janela>
        </Tela>
    );
}
