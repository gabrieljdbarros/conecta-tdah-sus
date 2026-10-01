"use client";
import { useEffect, useState } from "react";
import { carregarVozes, escolherVoz, falar, pararDeFalar, vozSuportada } from "@/helpers/voz";

/**
 * Diz se há voz em português para ler (com `somenteLocal`, só voz que roda
 * no aparelho). `null` enquanto verifica
 */
export function useVozDisponivel(somenteLocal: boolean): boolean | null {
    const [disponivel, setDisponivel] = useState<boolean | null>(null);
    useEffect(() => {
        if (!vozSuportada()) { setDisponivel(false); return; }
        let ativo = true;
        carregarVozes().then((vozes) => { if (ativo) setDisponivel(!!escolherVoz(vozes, somenteLocal)); });
        return () => { ativo = false; };
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
    className?: string;
}

/**
 * Botão de leitura em voz alta (TTS). Toque para ouvir; toque de novo para
 * parar. Só uma leitura por vez em toda a tela
 */
export default function AppOuvir({ texto, rotulo = 'Ouvir', descricao, conteudo = false, className = '' }: AppOuvirProps) {
    const disponivel = useVozDisponivel(conteudo);
    const [falando, setFalando] = useState(false);

    // Saiu da tela no meio da leitura: para de falar
    useEffect(() => () => { if (falando) pararDeFalar(); }, [falando]);

    if (!disponivel) return null;

    const alternar = async () => {
        if (falando) {
            pararDeFalar();
            setFalando(false);
            return;
        }
        setFalando(true);
        const comecou = await falar(texto, { somenteLocal: conteudo, aoTerminar: () => setFalando(false) });
        if (!comecou) setFalando(false);
    };

    return (
        <button type="button" onClick={alternar} aria-pressed={falando}
            className={`inline-flex items-center gap-2 min-h-[48px] px-4 rounded-full border-2 border-(--primary-color) text-(--primary-color) bg-white ff-default text-[16px] cursor-pointer ${className}`}>
            <i className={falando ? 'ion-stop' : 'ion-volume-high'} aria-hidden="true" />
            <span>{falando ? 'Parar' : rotulo}</span>
            {descricao && <span className="sr-only"> {descricao}</span>}
        </button>
    );
}
