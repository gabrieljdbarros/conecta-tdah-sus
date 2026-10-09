import { router } from "expo-router";
import { Aviso, Botao, Carregando, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { CartaoCriarPasta, ListaPastas } from "~/componentes/cartoes";
import { useAuth } from "~/contexto/AuthContext";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";

/** Aba Pastas: os alunos em cartões; a mãe cria pastas novas */
export default function Pastas() {
    const { user } = useAuth();
    const { pastas, carregando, erro, recarregar } = useMinhasPastas();
    const ehMae = user?.role === 'mae';

    return (
        <Tela emAba>
            <Titulo nivel={2}>{ehMae ? 'Pastas dos seus filhos' : 'Alunos que você acompanha'}</Titulo>
            {carregando && <Carregando texto="Carregando as pastas..." />}

            {!carregando && erro && <>
                <Aviso tipo="erro" texto="não deu para carregar as pastas. Toque em Tentar de novo." />
                <Botao titulo="Tentar de novo" tipo="contorno" icone="refresh" aoTocar={recarregar} />
            </>}

            {!carregando && !erro && <>
                {ehMae && pastas.length > 0 && (
                    <Botao titulo="Nova pasta" icone="add" aoTocar={() => router.push('/pasta/nova')} />
                )}
                {ehMae && pastas.length === 0 && <CartaoCriarPasta />}
                {!ehMae && pastas.length === 0 && (
                    <Paragrafo>Você ainda não tem nenhuma pasta. Peça à família o link de convite.</Paragrafo>
                )}
                {!ehMae && <Botao titulo="Entrar numa pasta (colar convite)" icone="enter-outline" tipo={pastas.length === 0 ? 'solido' : 'contorno'}
                    aoTocar={() => router.push('/entrar-pasta' as never)} />}
                <ListaPastas pastas={pastas} />
            </>}
        </Tela>
    );
}
