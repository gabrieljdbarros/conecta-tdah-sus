import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { anunciar, LinkTexto } from "~/componentes/basicos";
import { estilos, Secao } from "~/componentes/cartoes";
import RelatorioServicos, { papelNaPasta } from "~/servicos/relatorio";
import { cores } from "~/tema/cores";
import { AppUser } from "@/types/user";
import { Pasta } from "@/types/pasta";
// Mesmo cálculo da web (e os mesmos testes em tests/unit/semana.test.mjs)
import { rotuloSemana, semanaAtual } from "@/helpers/semana";

interface Resumo { pasta: Pasta; total: number; erro: boolean }

/**
 * RESUMO DA SEMANA (igual à web): quantos relatórios cada aluno teve de
 * segunda a domingo. Só o TOTAL, sem o tipo: a primeira tela pode ser vista
 * por outras pessoas (celular compartilhado). Conta só os tipos que a
 * pessoa já pode ler (mesma consulta da lista; as regras garantem)
 */
export function ResumoSemana({ user, pastas }: { user: AppUser; pastas: Pasta[] }) {
    const [resumos, setResumos] = useState<Resumo[] | null>(null);
    const semana = semanaAtual();
    const inicioMs = semana.inicio.getTime();
    const fimMs = semana.fim.getTime();
    const chave = pastas.map((p) => p.id).join(',');

    useEffect(() => {
        if (!chave) return;
        let ativo = true;
        (async () => {
            const lista = await Promise.all(pastas.map(async (pasta): Promise<Resumo> => {
                const papel = papelNaPasta(user, pasta.donoUid);
                if (!papel) return { pasta, total: 0, erro: true };
                const { success, relatorios } = await RelatorioServicos.listar(pasta.id, papel);
                const total = relatorios.filter((r) => r.criadoEm >= inicioMs && r.criadoEm < fimMs).length;
                return { pasta, total, erro: !success };
            }));
            if (!ativo) return;
            setResumos(lista);
            anunciar('Resumo da semana pronto.');
        })();
        return () => { ativo = false; };
        // `pastas` entra pela chave estável (ids), para não refazer as leituras à toa
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chave, user.uid, user.role, inicioMs, fimMs]);

    return (
        <Secao titulo="Resumo da semana" lateral={`Semana de ${rotuloSemana(semana)}`}>
            {pastas.length === 0 && (
                <View style={[estilos.cartao, { gap: 6 }]}>
                    <Text style={estilos.nome}>Sem informações disponíveis</Text>
                    <Text style={estilos.texto}>
                        {user.role === 'mae'
                            ? 'Depois de criar a pasta do aluno, os relatórios da semana aparecem aqui.'
                            : 'Quando a família enviar o convite, os relatórios da semana aparecem aqui.'}
                    </Text>
                </View>
            )}
            {pastas.length > 0 && resumos === null && <Text style={estilos.suave}>Preparando o resumo...</Text>}
            {resumos?.map(({ pasta, total, erro }) => (
                <View key={pasta.id} style={[estilos.cartao, { gap: 4 }]}>
                    <Text style={estilos.nome}>{pasta.nomeAluno}</Text>
                    {erro
                        ? <Text style={[estilos.texto, { color: cores.erro }]}>Erro: não deu para preparar o resumo deste aluno.</Text>
                        : <Text style={estilos.texto}>{total === 0 ? 'Nenhum relatório nesta semana.' : `${total} ${total === 1 ? 'relatório' : 'relatórios'} nesta semana.`}</Text>}
                    <View style={{ alignSelf: 'flex-start' }}>
                        <LinkTexto titulo={`Ver relatórios de ${pasta.nomeAluno}`}
                            aoTocar={() => router.push(`/pasta/${pasta.id}/relatorios` as never)} />
                    </View>
                </View>
            ))}
        </Secao>
    );
}
