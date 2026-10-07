"use client";
import { useEffect, useId, useState } from "react";
import { acompanharLeitura, carregarVozes, escolherVoz, falar, pararDeFalar, qualLeituraAtual, vozSuportada } from "@/helpers/voz";

/**
 * Diz se há voz em português para ler (com `somenteLocal`, só voz que roda
 * no aparelho). `null` enquanto verifica. As vozes são buscadas uma vez só
 */
export function useVozDisponivel(somenteLocal: boolean): boolean | null {
    const [disponivel, setDisponivel] = useState<boolean | null>(null);
    useEffect(() => {
        if (!vozSuportada()) { setDisponivel(false); return; }
        let ativo = true;
        const verificar = () => carregarVozes().then((vozes) => { if (ativo) setDisponivel(!!escolherVoz(vozes, somenteLocal)); });
        verificar();
        // As vozes podem chegar depois (o navegador carrega aos poucos):
        // confere de novo quando a lista mudar, para não dizer "sem voz" por pressa
        window.speechSynthesis.addEventListener('voiceschanged', verificar);
        return () => {
            ativo = false;
            window.speechSynthesis.removeEventListener('voiceschanged', verificar);
        };
    }, [somenteLocal]);
    return disponivel;
}

export interface AppOuvirProps {
    /** O que será lido */
    texto: string;
    /** Texto do botão (ex.: "Ouvir instruções", "Ouvir") */
    rotulo?: string;
    /** Complemento só para o leitor de tela (ex.: "relatório de 30 de setembro") */
    descricao?: string;
    /**
     * Conteúdo com dado pessoal/de saúde (relatório, mensagem): só lê com voz
     * que roda no aparelho (decisão travada 11). Sem ela, o botão não aparece
     */
    conteudo?: boolean;
    /**
     * Disponibilidade já calculada pela tela (ex.: lista de mensagens), para
     * não verificar de novo em cada botão
     */
    disponivel?: boolean | null;
    className?: string;
}

/**
 * Botão de leitura em voz alta (TTS). Toque para ouvir; toque de novo para
 * parar. Só uma leitura por vez em toda a tela.
 * O rótulo troca entre "Ouvir" e "Parar" (sem aria-pressed, para o leitor
 * de tela não anunciar o estado duas vezes)
 */
export default function AppOuvir({ texto, rotulo = 'Ouvir', descricao, conteudo = false, disponivel, className = '' }: AppOuvirProps) {
    const id = useId();
    const verificado = useVozDisponivel(conteudo);
    const temVoz = disponivel !== undefined ? disponivel : verificado;
    const [falando, setFalando] = useState(false);

    // Acompanha qual botão está lendo (o fim de uma leitura cancelada não
    // interfere na seguinte) e para de falar se este botão sair da tela
    useEffect(() => {
        const deixar = acompanharLeitura((atual) => setFalando(atual === id));
        return () => {
            deixar();
            if (qualLeituraAtual() === id) pararDeFalar();
        };
    }, [id]);

    if (!temVoz) return null;

    const alternar = async () => {
        if (falando) {
            pararDeFalar();
            return;
        }
        await falar(texto, { id, somenteLocal: conteudo });
    };

    return (
        <button type="button" onClick={alternar}
            className={`inline-flex items-center gap-2 min-h-[48px] px-4 rounded-full border-2 border-(--cor-secundaria) text-white bg-(--cor-secundaria) ff-default text-[16px] cursor-pointer ${className}`}>
            <i className={falando ? 'ion-stop' : 'ion-volume-high'} aria-hidden="true" />
            <span>{falando ? 'Parar' : rotulo}</span>
            {descricao && <span className="sr-only"> {descricao}</span>}
        </button>
    );
}
