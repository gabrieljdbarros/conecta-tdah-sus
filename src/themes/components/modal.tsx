"use client";
import { KeyboardEvent, ReactNode, useEffect, useId, useRef } from "react"

export interface AppModalProps {
    children: ReactNode;
    title?: string;
    onClose?: () => void;
}

const FOCAVEIS = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Janela de diálogo acessível:
 *  - o leitor de tela anuncia o título; o foco entra na janela ao abrir
 *  - o Tab fica preso dentro da janela enquanto ela está aberta
 *  - Esc fecha, e o foco volta para o botão que abriu a janela
 *  - rola em telas baixas (celular deitado)
 */
export default function AppModal({children, title, onClose}: AppModalProps) {
    const idTitulo = useId();
    const janelaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const quemAbriu = document.activeElement as HTMLElement | null;
        janelaRef.current?.focus();
        return () => quemAbriu?.focus();
    }, []);

    const aoTeclar = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && onClose) {
            onClose();
            return;
        }
        // Prende o Tab: do último elemento volta ao primeiro, e vice-versa
        if (e.key === 'Tab' && janelaRef.current) {
            const focaveis = Array.from(janelaRef.current.querySelectorAll<HTMLElement>(FOCAVEIS));
            if (focaveis.length === 0) return;
            const primeiro = focaveis[0];
            const ultimo = focaveis[focaveis.length - 1];
            if (e.shiftKey && (document.activeElement === primeiro || document.activeElement === janelaRef.current)) {
                e.preventDefault();
                ultimo.focus();
            } else if (!e.shiftKey && document.activeElement === ultimo) {
                e.preventDefault();
                primeiro.focus();
            }
        }
    };

    return (
        <div>
            {/* BACKGROUND */}
            <div className="fixed top-0 left-0 bg-black opacity-40 h-full w-full" aria-hidden="true" onClick={onClose}/>

            {/* MODAL */}
            <div className="fixed top-0 left-0 h-full w-full flex justify-center items-center p-4 overflow-y-auto pointer-events-none">
                <div ref={janelaRef} role="dialog" aria-modal="true" aria-labelledby={title ? idTitulo : undefined}
                    tabIndex={-1} onKeyDown={aoTeclar}
                    className="bg-white opacity-100 p-6 md:p-[50px] rounded-2xl border border-(--cor-destaque) max-w-[600px] w-full max-h-full overflow-y-auto flex-col pointer-events-auto outline-none">
                    <div className="flex items-center justify-between gap-3">
                        {title && <h2 id={idTitulo} className="ff-default text-[26px] mb-5 font-bold">{title}</h2>}
                        {onClose &&
                            <button type="button" onClick={() => onClose()} aria-label="Fechar"
                                className="ml-auto min-w-[48px] min-h-[48px] flex items-center justify-center text-[20px] cursor-pointer">
                                <i className="ion-close" aria-hidden="true" />
                            </button>}
                    </div>
                    {children}
                </div>
            </div>
        </div>
    )
}
