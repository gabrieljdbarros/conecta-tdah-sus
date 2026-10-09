import { Aviso, Carregando, Paragrafo, Tela, Titulo } from "~/componentes/basicos";
import { useMinhasPastas } from "~/ganchos/useMinhasPastas";
import { ListaPastas } from "~/componentes/cartoes";

/** Aba Conversas: um chat por aluno (RN05). Tocar no aluno abre as conversas dele */
export default function Conversas() {
    const { pastas, carregando, erro } = useMinhasPastas();
    return (
        <Tela emAba>
            <Titulo nivel={2}>Uma conversa para cada aluno</Titulo>
            <Paragrafo>Toque no aluno para abrir as conversas sobre ele.</Paragrafo>
            {carregando && <Carregando texto="Carregando..." />}
            {!carregando && erro && <Aviso tipo="erro" texto="não deu para carregar os alunos." />}
            {!carregando && !erro && <ListaPastas pastas={pastas} conversas />}
            {!carregando && !erro && pastas.length === 0 && <Paragrafo>Você ainda não acompanha nenhum aluno. As conversas aparecem aqui quando houver uma pasta.</Paragrafo>}
        </Tela>
    );
}
