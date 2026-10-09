import { Aviso, Carregando, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";
import { ListaPastas } from "~/componentes/cartoes";

/**
 * Aba Conversas: um chat por aluno (RN05).
 * TODO (dia 5, feat/mobile-chat): cada aluno abre o chat (grupo e privado)
 */
export default function Conversas() {
    const { pastas, carregando, erro } = useMinhasPastas();
    return (
        <Tela>
            <Titulo nivel={2}>Uma conversa para cada aluno</Titulo>
            <Paragrafo>As conversas chegam numa próxima etapa do aplicativo. Por enquanto, toque no aluno para abrir a pasta.</Paragrafo>
            {carregando && <Carregando texto="Carregando..." />}
            {!carregando && erro && <Aviso tipo="erro" texto="não deu para carregar os alunos." />}
            {!carregando && !erro && <ListaPastas pastas={pastas} />}
        </Tela>
    );
}
