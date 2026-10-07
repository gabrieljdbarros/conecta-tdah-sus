"use client";
import { useEffect, useState } from "react";
import { conviteDaUrl } from "@/helpers/router";
import BoasVindas from "./_boas-vindas";
import { introducaoJaVista, marcarIntroducaoVista } from "@/helpers/introducao";
import LoginForm from "./_form";

/**
 * Página inicial: boas-vindas na primeira visita deste aparelho; depois,
 * o login. Quem chega por um link de convite vai direto ao login.
 * A escolha só pode ser feita no navegador (a marca fica no aparelho), então
 * até lá aparece só "Carregando..." — evita piscar uma tela e trocar pela outra
 */
export default function Entrada() {
    const [mostrarIntroducao, setMostrarIntroducao] = useState<boolean | null>(null);
    const [saiuDaIntroducao, setSaiuDaIntroducao] = useState(false);

    useEffect(() => {
        setMostrarIntroducao(!conviteDaUrl() && !introducaoJaVista());
    }, []);

    if (mostrarIntroducao === null)
        return (
            <>
                <p role="status" className="ff-default text-[18px] text-(--cor-texto)">Carregando...</p>
                <noscript><p className="ff-default text-[18px] text-(--cor-texto)">Ative o JavaScript do navegador para usar o aplicativo.</p></noscript>
            </>
        );

    if (mostrarIntroducao)
        return <BoasVindas aoSair={() => { marcarIntroducaoVista(); setSaiuDaIntroducao(true); setMostrarIntroducao(false); }} />;

    return <LoginForm focarTitulo={saiuDaIntroducao} />;
}
