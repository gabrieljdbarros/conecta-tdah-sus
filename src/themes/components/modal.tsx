"use client";
import { KeyboardEvent, ReactNode, useEffect, useId, useRef } from "react"

export interface AppModalProps {
    children: ReactNode;
    title?: string;
    onClose?: () => void;
}

/**
 * Janela de diálogo acessível: o leitor de tela anuncia o título, o foco
 * entra na janela ao abrir, Esc fecha e o botão de fechar tem nome
 */
export default function AppModal({children, title, onClose}: AppModalProps) {
    const idTitulo = useId();
    const janelaRef = useRef<HTMLDivElement>(null);

    useEffect(() => { janelaRef.current?.focus(); }, []);

    const aoTeclar = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && onClose) onClose();
    };

    return (
        <div>
            {/* BACKGROUND */}
            <div className="fixed top-0 left-0 bg-black opacity-40 h-full w-full flex justify-center items-center" aria-hidden="true" onClick={onClose}/>

            {/* MODAL */}
            <div className="fixed top-0 left-0 h-full w-full flex justify-center items-center px-4 pointer-events-none">
                <div ref={janelaRef} role="dialog" aria-modal="true" aria-labelledby={title ? idTitulo : undefined}
                    tabIndex={-1} onKeyDown={aoTeclar}
                    className="bg-white opacity-100 p-6 md:p-[50px] rounded-xl max-w-[600px] w-full flex-col pointer-events-auto outline-none">
                    <div className="flex items-center justify-between gap-3">
                        <h2 id={idTitulo} className="ff-default text-[26px] mb-5 font-bold">{title}</h2>
                        {onClose &&
                            <button type="button" onClick={() => onClose()} aria-label="Fechar"
                                className="min-w-[48px] min-h-[48px] flex items-center justify-center text-[20px] cursor-pointer">
                                <i className="ion-close" aria-hidden="true" />
                            </button>}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}
